/**
 * Mapeo de intenciones a secuencias DTMF para el IVR de Banorte.
 * Migrado del proyecto original (Python).
 *
 * Formato DTMF: "W" = 0.5s pausa, dígitos = tonos DTMF
 */

const INTENT_TO_DTMF = {
  // GRUPO 1: TARJETAS, CHEQUERAS Y PROTECCIÓN
  robo_extravio: 'WWWWWW1WWWWW1WWWWW1',                    // Reportar robo/extravío tarjeta
  robo_extravio_chequera: 'WWWWWW1WWWWW1WWWWW2',            // Reportar robo/extravío chequera
  tarjeta_desgastada: 'WWWWWW1WWWWW2',                       // Reportar desgaste de tarjeta
  bloqueo_temporal_credito: 'WWWWWW1WWWWW3WWWWW1',           // Bloqueo temporal TDC
  bloqueo_temporal_debito: 'WWWWWW1WWWWW3WWWWW2',            // Bloqueo temporal TDD
  proteger_cheque: 'WWWWWW1WWWWW4',                           // Proteger/cancelar cheque

  // GRUPO 2: CLAVE DE ACCESO Y NIP
  clave_acceso: 'WWWWWW2WWWWW1',                              // Obtener/cambiar clave Banortel
  consultar_nip: 'WWWWWW2WWWWW2',                             // Consultar NIP TDC
  asignar_nip_credito: 'WWWWWW2WWWWW3WWWWW1',                // Asignar/desbloquear NIP TDC
  asignar_nip_debito: 'WWWWWW2WWWWW3WWWWW2',                 // Asignar/desbloquear NIP TDD

  // GRUPO 3: SALDOS Y SERVICIOS DE CUENTA
  saldos_servicios: 'WWWWWW3',                                // Saldos, pagos, inversiones, transferencias

  // GRUPO 4: BANCA EN LÍNEA Y MÓVIL
  asesoria_banca_linea: 'WWWWWW4WWWWW1WWWWW3',               // Asesoría banco en línea
  cancelar_banca_movil: 'WWWWWW4WWWWW2WWWWW2',               // Cancelar Banorte Móvil
  asesoria_banca_movil: 'WWWWWW4WWWWW2WWWWW4',               // Asesoría Banorte Móvil
  reportar_operacion_digital: 'WWWWWW4WWWWW3',                // Reportar operaciones no reconocidas digitales

  // GRUPO 5: MOVIMIENTOS NO RECONOCIDOS Y REPORTES
  movimientos_no_reconocidos: 'WWWWWW5WWWWW1',                // Reportar movimientos no reconocidos
  estatus_reporte: 'WWWWWW5WWWWW2',                           // Consultar estatus de reporte
  condiciones_documentacion: 'WWWWWW5WWWWW3',                 // Consultar condiciones de documentación
  aclaracion_cajero_depositador: 'WWWWWW5WWWWW4',             // Aclaración cajero depositador
  compra_rechazada: 'WWWWWW5WWWWW5',                          // Compra rechazada/declinada

  // GRUPO 6: PROMOCIONES DE TARJETA DE CRÉDITO
  diferir_meses_sin_intereses: 'WWWWWW6WWWWW1',              // Diferir a MSI
  aceptar_limite_tdc: 'WWWWWW6WWWWW2',                        // Aceptar límite de TDC
  plan_pagos_fijos: 'WWWWWW6WWWWW3',                          // Solicitar plan de pagos fijos
  otras_promociones: 'WWWWWW6WWWWW4',                         // Consultar otras promociones

  // GRUPO 7: OTROS SERVICIOS
  tipo_cambio_usd: 'WWWWWW7WWWWW1WWWWW1',                    // Tipo de cambio USD
  tipo_cambio_eur: 'WWWWWW7WWWWW1WWWWW2',                    // Tipo de cambio EUR
  tasas_mercado: 'WWWWWW7WWWWW1WWWWW3',                       // Tasas de mercado
  valor_oro: 'WWWWWW7WWWWW1WWWWW4WWWWW1',                    // Valor del oro
  valor_plata: 'WWWWWW7WWWWW1WWWWW4WWWWW2',                  // Valor de la plata
  solicitar_productos: 'WWWWWW7WWWWW2',                       // Solicitar/contratar productos
  estatus_contratacion: 'WWWWWW7WWWWW3',                      // Estatus contratación TDC
  ubicacion_cajeros: 'WWWWWW7WWWWW4WWWWW1',                   // Ubicación ATMs
  ubicacion_sucursales: 'WWWWWW7WWWWW4WWWWW2',                // Ubicación sucursales
  afore: 'WWWWWW7WWWWW6WWWWW1',                               // Afore XXI Banorte
  seguros: 'WWWWWW7WWWWW6WWWWW2',                             // Seguros Banorte
  pensiones: 'WWWWWW7WWWWW6WWWWW3',                           // Pensiones Banorte
  recompensa_total: 'WWWWWW7WWWWW7',                          // Recompensa Total Banorte
  monedero_banorte: 'WWWWWW7WWWWW8',                          // Monedero Banorte por Ti

  // GRUPO 8: AVISO DE PRIVACIDAD
  aviso_privacidad: 'WWWWWW8',                                // Aviso de privacidad
};

const INTENT_NAMES = Object.keys(INTENT_TO_DTMF);

function getDtmfForIntent(intent) {
  const key = intent.toLowerCase().trim();
  return INTENT_TO_DTMF[key] || null;
}

module.exports = { INTENT_TO_DTMF, INTENT_NAMES, getDtmfForIntent };
