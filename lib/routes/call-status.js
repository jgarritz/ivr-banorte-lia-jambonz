const { Router } = require('express');
const logger = require('pino')({ name: 'call-status' });

const router = Router();

/**
 * POST /call-status
 * Recibe notificaciones de estado de llamada de Jambonz.
 */
router.post('/', (req, res) => {
  const { call_sid, call_status, direction, from, to, sip_status } = req.body;
  logger.info({ call_sid, call_status, direction, from, to, sip_status }, 'Call status');
  res.sendStatus(200);
});

/**
 * POST /event
 * Recibe eventos del LLM (transcripciones, etc).
 */
router.post('/event', (req, res) => {
  const { call_sid, type } = req.body;
  logger.debug({ call_sid, type, body: req.body }, 'LLM event');
  res.sendStatus(200);
});

module.exports = router;
