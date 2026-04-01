require('dotenv').config();
const http = require('http');
const express = require('express');
const pino = require('pino');
const db = require('./lib/db');
const { getDtmfForIntent } = require('./lib/intent-map');
const { createWsServer, pendingTransfers } = require('./lib/ws-handler');

const logger = pino({ name: 'ivr-banorte-lia' });

// Initialize database
db.init();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'IVR Banorte LiA - Jambonz + Ultravox (WebSocket)' });
});

// HTTP routes que aún necesitamos
const confirmDtmf = require('./lib/routes/confirm-dtmf');
const callStatus = require('./lib/routes/call-status');
const dashboard = require('./lib/routes/dashboard');

// Inyectar pendingTransfers al confirm-dtmf
const { setPendingTransfers } = require('./lib/routes/confirm-dtmf');
setPendingTransfers(pendingTransfers);

// toolHook: Jambonz llama aquí cuando Ultravox invoca la herramienta transfer_to_ivr
// Body de Jambonz: { tool_call_id, name, args: { intent }, call_sid, from, to, ... }
app.post('/tool/transfer_to_ivr', (req, res) => {
  logger.info({ body: JSON.stringify(req.body), query: req.query }, 'toolHook recibido - body completo');

  const callSid = req.body.call_sid || req.body.callSid || req.query.callSid;
  const toolCallId = req.body.tool_call_id;
  const args = req.body.args || {};
  const intent = (args.intent || req.body.intent || '').toLowerCase().trim();
  const dtmf = getDtmfForIntent(intent) || 'WWWWWW0';

  logger.info({ callSid, toolCallId, intent, dtmf }, 'toolHook procesado');

  if (callSid && intent) {
    pendingTransfers.set(callSid, { intent, dtmf });
    try {
      db.logTransfer({ callSid, intent, dtmf, phoneFrom: null, success: true });
    } catch (err) {
      logger.error({ err }, 'Error guardando log de transfer');
    }
  }

  // Jambonz espera { result: '...' } y añade type/invocation_id automáticamente
  res.json({ result: `Transferencia iniciada para ${intent}. Di SOLO "Un momento, te estoy transfiriendo." y llama a hangUp INMEDIATAMENTE. NO digas nada más, NO te despidas.` });
});

// actionHook del verbo llm: llamado por Jambonz cuando el LLM termina
app.post('/call-hook/final', (req, res) => {
  const callSid = req.body.call_sid || req.body.callSid;
  const transfer = pendingTransfers.get(callSid);

  logger.info({ callSid, hasTransfer: !!transfer, fullBody: JSON.stringify(req.body) }, 'call-hook/final recibido');

  if (transfer) {
    logger.info({ callSid, intent: transfer.intent, dtmf: transfer.dtmf }, 'Iniciando dial al IVR');
    res.json([
      {
        verb: 'dial',
        target: [{
          type: 'phone',
          number: process.env.IVR_NUMBER || '+528181569600',
          trunk: process.env.CARRIER_NAME,
        }],
        answerOnBridge: true,
        confirmHook: `${process.env.BASE_URL}/confirm-dtmf?callSid=${encodeURIComponent(callSid)}`,
      },
    ]);
  } else {
    logger.info({ callSid }, 'Sin transfer pendiente, hangup');
    res.json([{ verb: 'hangup' }]);
  }
});

app.use('/confirm-dtmf', confirmDtmf);
app.use('/call-status', callStatus);
app.use('/event', callStatus);
app.use('/', dashboard);

// Crear servidor HTTP
const server = http.createServer(app);

// Adjuntar WebSocket server
const { wss } = createWsServer(server);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info({ port: PORT }, 'IVR Banorte LiA server running');
  logger.info('Stack: Jambonz (WebSocket) + Ultravox');
  logger.info(`Health: http://localhost:${PORT}/`);
  logger.info(`WebSocket: wss://[host]/lia-banorte`);
  logger.info(`Dashboard: http://localhost:${PORT}/dashboard`);
});
