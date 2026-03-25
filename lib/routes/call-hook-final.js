const { Router } = require('express');
const logger = require('pino')({ name: 'call-hook-final' });

const router = Router();

// Will be set by app.js after importing tool-hook
let pendingTransfers;

function setPendingTransfers(map) {
  pendingTransfers = map;
}

/**
 * POST /call-hook/final
 * ActionHook: llamado cuando la sesión LLM (Ultravox) termina.
 * Si hay un transfer pendiente, dial al IVR con confirmHook para DTMF.
 * Si no, hangup.
 */
router.post('/', (req, res) => {
  const { call_sid } = req.body;
  const transfer = pendingTransfers?.get(call_sid);

  if (transfer) {
    logger.info({ call_sid, intent: transfer.intent, dtmf: transfer.dtmf }, 'LLM terminó, transfiriendo al IVR');

    const verbs = [
      {
        verb: 'dial',
        target: [
          {
            type: 'phone',
            number: process.env.IVR_NUMBER || '+528181569600',
            trunk: process.env.CARRIER_NAME,
          },
        ],
        answerOnBridge: true,
        confirmHook: `${process.env.BASE_URL}/confirm-dtmf?callSid=${encodeURIComponent(call_sid)}`,
      },
    ];

    return res.json(verbs);
  }

  // No pending transfer — normal hangup
  logger.info({ call_sid }, 'LLM terminó sin transfer, hangup');
  res.json([
    { verb: 'say', text: 'Gracias por llamar a Banorte. Hasta luego.', language: 'es-MX' },
    { verb: 'hangup' },
  ]);
});

module.exports = router;
module.exports.setPendingTransfers = setPendingTransfers;
