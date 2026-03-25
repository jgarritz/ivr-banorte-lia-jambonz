const { Router } = require('express');
const { dtmfSequenceToVerbs } = require('../dtmf-utils');
const logger = require('pino')({ name: 'confirm-dtmf' });

const router = Router();

// Will be set by app.js
let pendingTransfers;

function setPendingTransfers(map) {
  pendingTransfers = map;
}

/**
 * POST /confirm-dtmf
 * ConfirmHook del verbo dial: llamado cuando el IVR de Banorte contesta,
 * ANTES de bridgear al caller.
 *
 * Envía la secuencia DTMF como verbos pause+dtmf.
 * Después de ejecutar, Jambonz conecta al caller con el IVR
 * (ya navegado al menú correcto).
 */
router.post('/', (req, res) => {
  const callSid = req.query.callSid;
  const transfer = pendingTransfers?.get(callSid);

  if (!transfer) {
    logger.warn({ callSid }, 'No se encontró transfer pendiente para confirmHook');
    // Just connect without DTMF
    return res.json([]);
  }

  const dtmfVerbs = dtmfSequenceToVerbs(transfer.dtmf);
  logger.info({ callSid, intent: transfer.intent, verbCount: dtmfVerbs.length }, 'Enviando DTMF al IVR');

  // Clean up the pending transfer
  pendingTransfers.delete(callSid);

  res.json(dtmfVerbs);
});

module.exports = router;
module.exports.setPendingTransfers = setPendingTransfers;
