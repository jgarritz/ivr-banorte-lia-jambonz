require('dotenv').config();
const express = require('express');
const pino = require('pino');
const db = require('./lib/db');

const logger = pino({ name: 'ivr-banorte-lia' });

// Initialize database
db.init();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const callHook = require('./lib/routes/call-hook');
const toolHook = require('./lib/routes/tool-hook');
const callHookFinal = require('./lib/routes/call-hook-final');
const confirmDtmf = require('./lib/routes/confirm-dtmf');
const callStatus = require('./lib/routes/call-status');
const dashboard = require('./lib/routes/dashboard');

// Share pending transfers map between routes
const { setPendingTransfers: setFinal } = require('./lib/routes/call-hook-final');
const { setPendingTransfers: setConfirm } = require('./lib/routes/confirm-dtmf');
setFinal(toolHook.pendingTransfers);
setConfirm(toolHook.pendingTransfers);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'IVR Banorte LiA - Jambonz + Ultravox' });
});

// Jambonz webhook routes
app.use('/call-hook', callHook);
app.use('/call-hook/final', callHookFinal);
app.use('/tool-hook', toolHook);
app.use('/confirm-dtmf', confirmDtmf);
app.use('/call-status', callStatus);
app.use('/event', callStatus);

// Dashboard and test routes
app.use('/', dashboard);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'IVR Banorte LiA server running');
  logger.info('Stack: Jambonz + Ultravox');
  logger.info(`Health: http://localhost:${PORT}/`);
  logger.info(`Dashboard: http://localhost:${PORT}/dashboard`);
  logger.info(`Test intents: http://localhost:${PORT}/test/intents`);
});
