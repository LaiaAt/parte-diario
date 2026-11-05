// Envía el aviso de las 5 PM a quienes aún no enviaron el parte de hoy.
const webpush = require('web-push');
const { APPS_URL, PUSH_TOKEN, VAPID_PUBLIC, VAPID_PRIVATE } = process.env;
if (!APPS_URL || !PUSH_TOKEN || !VAPID_PUBLIC || !VAPID_PRIVATE) { console.error('Faltan variables'); process.exit(1); }
webpush.setVapidDetails('https://laiaat.github.io/parte-diario/', VAPID_PUBLIC, VAPID_PRIVATE);
const api = async d => (await fetch(APPS_URL, { method: 'POST', body: JSON.stringify(d) })).json();
(async () => {
  const r = await api({ accion: 'push_pendientes', token: PUSH_TOKEN });
  if (!r.ok) { console.error('Servidor:', r.mensaje); process.exit(1); }
  console.log('Fecha', r.fecha, '- pendientes con aviso activado:', r.subs.length);
  const baja = [];
  for (const s of r.subs) {
    const carga = JSON.stringify({ titulo: '🔔 Recordatorio', texto: 'Recuerda diligenciar y enviar el parte diario de hoy.', url: './' });
    try { await webpush.sendNotification(s.sub, carga, { TTL: 6 * 3600 }); console.log('enviado', s.llave); }
    catch (e) { console.log('falló', s.llave, e.statusCode); if (e.statusCode === 404 || e.statusCode === 410) baja.push(s.sub.endpoint); }
  }
  if (baja.length) console.log('bajas', (await api({ accion: 'push_baja', token: PUSH_TOKEN, endpoints: baja })).n);
})().catch(e => { console.error(e); process.exit(1); });
