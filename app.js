require('dotenv').config();
const http = require('http');
const express = require('express');
const pino = require('pino');
const db = require('./lib/db');
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

// Mantener call-hook como HTTP fallback (por si acaso)
// pero el flujo principal va por WebSocket
app.post('/call-hook/final', (req, res) => {
  // Este ya no se usa en modo WS, el verb:hook se maneja en el WS handler
  res.json([{ verb: 'hangup' }]);
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
