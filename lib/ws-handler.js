/**
 * Jambonz WebSocket Handler
 * Implementa el protocolo WebSocket de Jambonz (subprotocolo: ws.jambonz.org)
 * Jambonz abre una conexión WS por cada llamada entrante.
 */

const WebSocket = require('ws');
const { getDtmfForIntent, INTENT_NAMES } = require('./intent-map');
const { dtmfSequenceToVerbs } = require('./dtmf-utils');
const db = require('./db');
const pino = require('pino');

const logger = pino({ name: 'ws-handler' });

// Map de transfers pendientes (compartido con confirm-dtmf HTTP route)
const pendingTransfers = new Map();

const SYSTEM_PROMPT = `Eres un asistente virtual de Banorte, el banco más grande de México. Tu nombre es "LiA, asistente Banorte".

Tu objetivo principal es:
1. Entender rápidamente qué necesita el cliente
2. Confirmar que entendiste correctamente
3. Transferirlo al área correcta del IVR usando la función transfer_to_ivr

REGLAS IMPORTANTES:
- Sé breve y claro. Los clientes valoran su tiempo.
- Confirma antes de transferir: "Entendido, te transfiero al área de [X] de inmediato."
- Si no estás 100% seguro de la intención, haz UNA pregunta clarificadora.
- NO inventes información sobre saldos, fechas o datos específicos de la cuenta.
- Si el cliente pide algo que no está en tu lista de intenciones, transfiérelo a "saldos_servicios".
- Habla siempre en español mexicano.

INTENCIONES DISPONIBLES:
- robo_extravio: Robo/extravío de tarjeta
- robo_extravio_chequera: Robo/extravío de chequera
- tarjeta_desgastada: Tarjeta dañada o desgastada
- bloqueo_temporal_credito: Bloqueo temporal tarjeta de crédito
- bloqueo_temporal_debito: Bloqueo temporal tarjeta de débito
- proteger_cheque: Proteger o cancelar cheque
- clave_acceso: Clave de acceso telefónica Banortel
- consultar_nip: Consultar NIP tarjeta de crédito
- asignar_nip_credito: Asignar/desbloquear NIP TDC
- asignar_nip_debito: Asignar/desbloquear NIP TDD
- saldos_servicios: Saldos, pagos, inversiones (menú general)
- asesoria_banca_linea: Problemas banca en línea
- cancelar_banca_movil: Cancelar Banorte Móvil
- asesoria_banca_movil: Problemas app Banorte Móvil
- reportar_operacion_digital: Operaciones no reconocidas digitales
- movimientos_no_reconocidos: Movimientos/cargos no reconocidos
- estatus_reporte: Estatus de reporte previo
- condiciones_documentacion: Condiciones de documentación
- aclaracion_cajero_depositador: Aclaración cajero depositador
- compra_rechazada: Compra rechazada/declinada
- diferir_meses_sin_intereses: Diferir a meses sin intereses
- aceptar_limite_tdc: Aceptar límite de TDC
- plan_pagos_fijos: Plan de pagos fijos
- otras_promociones: Otras promociones TDC
- tipo_cambio_usd: Tipo de cambio dólar
- tipo_cambio_eur: Tipo de cambio euro
- tasas_mercado: Tasas de mercado
- valor_oro: Valor del oro
- valor_plata: Valor de la plata
- solicitar_productos: Solicitar/contratar productos
- estatus_contratacion: Estatus contratación TDC
- ubicacion_cajeros: Ubicación de cajeros
- ubicacion_sucursales: Ubicación de sucursales
- afore: Afore XXI Banorte
- seguros: Seguros Banorte
- pensiones: Pensiones Banorte
- recompensa_total: Recompensa Total Banorte
- monedero_banorte: Monedero Banorte por Ti
- aviso_privacidad: Aviso de privacidad

TONO: Profesional, cálido, empático. Tu trabajo es ENTENDER y TRANSFERIR.`;

function buildLlmVerb() {
  return {
    verb: 'llm',
    vendor: 'ultravox',
    model: 'fixie-ai/ultravox',
    auth: { apiKey: process.env.ULTRAVOX_API_KEY },
    voice: 'Grecia',
    actionHook: `${process.env.BASE_URL}/call-hook/final`,
    llmOptions: {
      systemPrompt: SYSTEM_PROMPT,
    },
    tools: [
      {
        name: 'transfer_to_ivr',
        description: 'Transfiere la llamada al IVR de Banorte cuando detectas la intención. Úsala SOLO cuando tengas claro qué necesita el cliente. Después de llamarla, despídete brevemente.',
        parameters: {
          type: 'object',
          properties: {
            intent: {
              type: 'string',
              description: 'La intención detectada.',
              enum: INTENT_NAMES,
            },
          },
          required: ['intent'],
        },
      },
    ],
  };
}

function createWsServer(httpServer) {
  const wss = new WebSocket.Server({
    server: httpServer,
    path: '/lia-banorte',
  });

  logger.info('WebSocket server escuchando en /lia-banorte');

  wss.on('connection', (ws, req) => {
    const callState = {
      callSid: null,
      from: null,
      pendingDtmf: null,
      pendingIntent: null,
    };

    logger.info({ url: req.url }, 'Nueva conexión WebSocket desde Jambonz');

    ws.on('message', (rawData) => {
      let msg;
      try {
        msg = JSON.parse(rawData.toString());
      } catch (e) {
        logger.error({ e }, 'Error parseando mensaje WS');
        return;
      }

      logger.debug({ type: msg.type, msgid: msg.msgid }, 'Mensaje recibido');

      switch (msg.type) {
        case 'session:new': {
          callState.callSid = msg.call_sid;
          callState.from = msg.from;

          // Log completo para diagnosticar campos exactos
          logger.info({ fullMsg: JSON.stringify(msg) }, 'session:new completo');
          logger.info({ callSid: msg.call_sid, from: msg.from, to: msg.to, msgid: msg.msgid }, 'Llamada entrante via WS');

          const ack = {
            type: 'ack',
            msgid: msg.msgid,
            data: [
              { verb: 'say', text: 'Hola, bienvenido a Banorte.', language: 'es-MX' },
              { verb: 'hangup' },
            ],
          };
          logger.info({ ack: JSON.stringify(ack) }, 'Enviando ack');
          ws.send(JSON.stringify(ack));
          break;
        }

        case 'llm:tool-call': {
          const toolName = msg.tool_name || msg.name;
          const toolArgs = msg.args || {};
          logger.info({ tool: toolName, args: toolArgs }, 'Tool call desde Ultravox');

          if (toolName === 'transfer_to_ivr') {
            const intent = (toolArgs.intent || '').toLowerCase().trim();
            const dtmf = getDtmfForIntent(intent) || 'WWWWWW0';
            callState.pendingDtmf = dtmf;
            callState.pendingIntent = intent;

            logger.info({ intent, dtmf }, 'Transfer pendiente guardado');

            // Log a DB
            try {
              db.logTransfer({
                callSid: callState.callSid,
                intent,
                dtmf,
                phoneFrom: callState.from,
                success: true,
              });
            } catch (err) {
              logger.error({ err }, 'Error guardando log');
            }

            ws.send(JSON.stringify({
              type: 'llm:tool-output',
              tool_call_id: msg.tool_call_id,
              output: `Transferencia iniciada para ${intent}. Despídete del usuario y termina la conversación.`,
            }));
          }
          break;
        }

        case 'verb:hook': {
          logger.info({ msgid: msg.msgid, reason: msg.completion_reason }, 'Verb hook recibido');

          if (callState.pendingDtmf) {
            // LLM terminó, hay transfer pendiente → dial al IVR
            const dtmfKey = callState.callSid;
            pendingTransfers.set(dtmfKey, {
              intent: callState.pendingIntent,
              dtmf: callState.pendingDtmf,
            });

            logger.info({ callSid: dtmfKey, dtmf: callState.pendingDtmf }, 'Dial al IVR');

            ws.send(JSON.stringify({
              type: 'ack',
              msgid: msg.msgid,
              data: [
                {
                  verb: 'dial',
                  target: [{
                    type: 'phone',
                    number: process.env.IVR_NUMBER || '+528181569600',
                    trunk: process.env.CARRIER_NAME,
                  }],
                  answerOnBridge: true,
                  confirmHook: `${process.env.BASE_URL}/confirm-dtmf?callSid=${encodeURIComponent(dtmfKey)}`,
                },
              ],
            }));
          } else {
            // Sin transfer → hangup normal
            ws.send(JSON.stringify({
              type: 'ack',
              msgid: msg.msgid,
              data: [
                { verb: 'say', text: 'Gracias por llamar a Banorte. Hasta luego.', language: 'es-MX' },
                { verb: 'hangup' },
              ],
            }));
          }
          break;
        }

        case 'call:status': {
          logger.info({ status: msg.call_status, callSid: msg.call_sid }, 'Call status');
          break;
        }

        case 'jambonz:error': {
          logger.error({ error: msg.error }, 'Error de Jambonz');
          break;
        }

        default:
          logger.debug({ type: msg.type }, 'Mensaje no manejado');
      }
    });

    ws.on('close', (code, reason) => {
      logger.info({ code, reason: reason.toString(), callSid: callState.callSid }, 'WebSocket cerrado');
    });

    ws.on('error', (err) => {
      logger.error({ err, callSid: callState.callSid }, 'Error en WebSocket');
    });
  });

  return { wss, pendingTransfers };
}

module.exports = { createWsServer, pendingTransfers };
