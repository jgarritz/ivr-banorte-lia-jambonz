const { Router } = require('express');
const db = require('../db');
const { INTENT_TO_DTMF } = require('../intent-map');

const router = Router();

/**
 * GET /test/intents
 * Lista todas las intenciones disponibles y sus códigos DTMF.
 */
router.get('/test/intents', (req, res) => {
  res.json({
    total_intents: Object.keys(INTENT_TO_DTMF).length,
    intents: INTENT_TO_DTMF,
  });
});

/**
 * GET /dashboard
 * Dashboard HTML de monitoreo de transferencias.
 */
router.get('/dashboard', (req, res) => {
  const logs = db.getLogs(100);
  const stats = db.getStats();

  const tableRows = logs.map((log) => {
    const dt = new Date(log.timestamp);
    const formatted = `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')} ${dt.toTimeString().slice(0, 8)}`;
    const phone = log.phone_from || 'N/A';
    const status = log.success ? '✅ Éxito' : '❌ Fallo';
    const statusClass = log.success ? 'success' : 'error';
    const sid = log.call_sid.slice(-8);

    return `<tr>
      <td>${formatted}</td>
      <td class="call-sid">${sid}</td>
      <td>${phone}</td>
      <td><span class="intent-badge">${log.intent}</span></td>
      <td><code class="dtmf-code">${log.dtmf_sequence}</code></td>
      <td class="${statusClass}">${status}</td>
    </tr>`;
  }).join('');

  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard IVR Banorte LiA (Jambonz + Ultravox)</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px;min-height:100vh}
    .container{max-width:1400px;margin:0 auto}
    h1{color:#fff;text-align:center;margin-bottom:30px;font-size:2.5em;text-shadow:2px 2px 4px rgba(0,0,0,.2)}
    .subtitle{color:rgba(255,255,255,.8);text-align:center;margin-top:-20px;margin-bottom:30px;font-size:1.1em}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px;margin-bottom:30px}
    .stat-card{background:#fff;padding:25px;border-radius:15px;box-shadow:0 10px 30px rgba(0,0,0,.2);transition:transform .3s}
    .stat-card:hover{transform:translateY(-5px)}
    .stat-label{color:#666;font-size:.9em;margin-bottom:5px;text-transform:uppercase;letter-spacing:1px}
    .stat-value{color:#667eea;font-size:2.5em;font-weight:bold}
    .table-container{background:#fff;border-radius:15px;padding:30px;box-shadow:0 10px 30px rgba(0,0,0,.2);overflow-x:auto}
    h2{color:#333;margin-bottom:20px;font-size:1.8em}
    table{width:100%;border-collapse:collapse}
    th{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:15px;text-align:left;font-weight:600}
    td{padding:12px 15px;border-bottom:1px solid #eee}
    tr:hover{background:#f8f9ff}
    .intent-badge{background:#667eea;color:#fff;padding:5px 12px;border-radius:20px;font-size:.85em;display:inline-block}
    .dtmf-code{font-family:'Courier New',monospace;background:#f0f0f0;padding:5px 10px;border-radius:5px;font-size:.9em}
    .success{color:#10b981;font-weight:bold}
    .error{color:#ef4444;font-weight:bold}
    .call-sid{font-family:'Courier New',monospace;font-size:.85em;color:#666}
    .refresh-btn{position:fixed;bottom:30px;right:30px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border:none;padding:15px 30px;border-radius:50px;font-size:1em;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.3);transition:transform .3s}
    .refresh-btn:hover{transform:scale(1.05)}
  </style>
</head>
<body>
  <div class="container">
    <h1>Dashboard IVR Banorte LiA</h1>
    <p class="subtitle">Jambonz + Ultravox</p>
    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">Total Transferencias</div>
        <div class="stat-value">${stats.total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Hoy</div>
        <div class="stat-value">${stats.today}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Intención Más Usada</div>
        <div class="stat-value" style="font-size:1.5em">${stats.topIntent}</div>
        <div style="color:#999;font-size:.9em;margin-top:5px">(${stats.topIntentCount} veces)</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tasa de Éxito</div>
        <div class="stat-value">${stats.successRate}%</div>
      </div>
    </div>
    <div class="table-container">
      <h2>Últimas 100 Transferencias</h2>
      <table>
        <thead><tr><th>Fecha/Hora</th><th>Call SID</th><th>Teléfono</th><th>Intención</th><th>DTMF</th><th>Estado</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  </div>
  <button class="refresh-btn" onclick="location.reload()">Actualizar</button>
</body>
</html>`);
});

module.exports = router;
