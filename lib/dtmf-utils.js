/**
 * Convierte secuencias DTMF formato Twilio ("WWWWWW1WWWWW2")
 * a arrays de verbos Jambonz (pause + dtmf).
 *
 * Cada "W" = 0.5s de pausa. Las W consecutivas se acumulan.
 * Cada dígito (0-9, *, #) = verbo dtmf.
 */

const W_DURATION = 0.5; // segundos por cada W

function dtmfSequenceToVerbs(sequence) {
  const verbs = [];
  let pauseCount = 0;

  for (const char of sequence) {
    if (char === 'W' || char === 'w') {
      pauseCount++;
    } else {
      // Flush accumulated pause
      if (pauseCount > 0) {
        verbs.push({ verb: 'pause', length: pauseCount * W_DURATION });
        pauseCount = 0;
      }
      // Add DTMF digit
      verbs.push({ verb: 'dtmf', dtmf: char, duration: 250 });
    }
  }

  // Flush trailing pause (if any)
  if (pauseCount > 0) {
    verbs.push({ verb: 'pause', length: pauseCount * W_DURATION });
  }

  return verbs;
}

module.exports = { dtmfSequenceToVerbs };
