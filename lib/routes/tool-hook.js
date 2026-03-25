const { Router } = require('express');
const { getDtmfForIntent } = require('../intent-map');
const db = require('../db');
const logger = require('pino')({ name: 'tool-hook' });

const router = Router();

// In-memory store for pending transfers (call_sid → { intent, dtmf })
const pendingTransfers = new Map();

/**
 * POST /tool-hook
 * Jambonz llama este endpoint cuando Ultravox invoca un tool.
 * Maneja el tool "transfer_to_ivr": mapea intent → DTMF y guarda estado.
 */
router.post('/', (req, res) => {
  const { call_sid, tool } = req.body;
  const toolName = tool?.name;
  const toolArgs = tool?.args || {};

  logger.info({ call_sid, toolName, toolArgs }, 'Tool invocado');

  if (toolName === 'transfer_to_ivr') {
    const intent = (toolArgs.intent || '').toLowerCase().trim();
    const dtmf = getDtmfForIntent(intent);

    if (!dtmf) {
      logger.warn({ intent }, 'Intención desconocida, usando menú principal');
    }

    const dtmfSequence = dtmf || 'WWWWWW0';
    pendingTransfers.set(call_sid, { intent, dtmf: dtmfSequence });

    logger.info({ call_sid, intent, dtmf: dtmfSequence }, 'Transfer pendiente guardado');

    // Log to database
    try {
      const from = req.body.from || null;
      db.logTransfer({
        callSid: call_sid,
        intent: intent || 'unknown',
        dtmf: dtmfSequence,
        phoneFrom: from,
        success: true,
      });
    } catch (err) {
      logger.error({ err }, 'Error guardando log (no afecta llamada)');
    }

    // Return tool result to LLM
    return res.json({
      result: `Transferencia iniciada al área de ${intent}. Despídete brevemente del usuario y termina la conversación.`,
    });
  }

  // Unknown tool
  logger.warn({ toolName }, 'Tool desconocido');
  res.json({ result: 'Tool no reconocido.' });
});

// Export the pending transfers map so other routes can access it
router.pendingTransfers = pendingTransfers;

module.exports = router;
