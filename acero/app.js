/* Acero — interfaz */
(function () {
  'use strict';
  var C = window.AcerosCore, Api = window.Api, CFG = window.ACEROS_CONFIG;
  var MODO = window.ACEROS_MODO === 'salidas' ? 'salidas' : 'dashboard', BASE = window.ACEROS_BASE || '', EMB = !!window.ACEROS_EMBED;

  var S = {
    cargado: false, auto: false, ses: null, estado: { pedidos: [], entradas: [], salidas: [] }, calc: null, tab: MODO === 'salidas' ? 'salida' : 'panel', offline: false, enviando: false, per: { k: 'todo', d: '', h: '' },
    sal: { q: '', fdiam: '', items: [], grupo: '', n: 0, diam: '', elem: '', marca: '', pos: '', cant: 1, obs: '', fecha: '', msg: '', err: '', modo: 'pos', tipo: 'SALIDA', fase: '', pct: '', balElem: '' },
    inv: { vista: 'diametro', elem: '', diam: '' }, ped: { q: '', pag: 0 }, inf: { d: '' },
    cargas: [], loginErr: '', loginNom: ''
  };

  // ---------- Utilidades ----------
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n0(n) { return Number(n || 0).toLocaleString('es-CO'); }
  function kg(n) { return Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function hoyISO() {
    var d = new Date(), z = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  }
  function isoDe(d) { var z = function (n) { return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); }
  function rangoPer() {
    var p = S.per, h = hoyISO(), d = new Date();
    if (p.k === 'hoy') return [h, h];
    if (p.k === '7d') { d.setDate(d.getDate() - 6); return [isoDe(d), h]; }
    if (p.k === 'mes') return [h.slice(0, 8) + '01', h];
    if (p.k === 'rango') return [p.d || '0000-01-01', p.h || '9999-12-31'];
    return null;
  }
  function enPer(f) { var r = rangoPer(); if (!r) return true; var d = String(f || '').slice(0, 10); return d >= r[0] && d <= r[1]; }
  function vFiltro() {
    if (EMB) return '';
    var P = [['hoy', 'Hoy'], ['7d', '7 días'], ['mes', 'Este mes'], ['todo', 'Todo'], ['rango', 'Rango']];
    return '<div class="fper"><div class="fch">' + P.map(function (x) { return '<button type="button" class="fc' + (S.per.k === x[0] ? ' on' : '') + '" data-a="per" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      (S.per.k === 'rango' ? '<div class="frng"><label>Desde<input type="date" max="' + hoyISO() + '" value="' + esc(S.per.d) + '" data-f="per.d"></label><label>Hasta<input type="date" max="' + hoyISO() + '" value="' + esc(S.per.h) + '" data-f="per.h"></label></div>' : '') + '</div>';
  }
  function esHoy(f) { return String(f || '').slice(0, 10) === hoyISO(); }
  function horaAhora() { var d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function fecha(f) {
    var m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(f || '');
    return m ? m[3] + '/' + m[2] + ' ' + m[4] + ':' + m[5] : (f || '');
  }
  function fechaDia(f) { var m = /^(\d{4})-(\d\d)-(\d\d)/.exec(f || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : (f || ''); }
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.className = 'v';
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.className = ''; }, 3200);
  }
  function cmpMarca(a, b) {
    var f = function (x) { var m = /^(\d+)([a-z]?)(?:\.(\d+))?$/.exec(x); return m ? [+m[1], m[2] || '', +(m[3] || 0)] : [9999, x, 0]; };
    var x = f(a), y = f(b);
    return x[0] - y[0] || (x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : 0) || x[2] - y[2];
  }
  var tp = function (x) { return x && x.tipo === 'ARMADO' ? 'ARMADO' : 'SALIDA'; };
  var esArm = function () { return S.sal.tipo === 'ARMADO'; };
  var dispDe = function (v) { return v ? (esArm() ? v.lib_p : v.sal_p) : 0; };
  var esAdmin = function () { return S.ses && S.ses.rol === 'admin'; };

  // ---------- Vistas ----------
  function vLogin() {
    return '<div class="login"><div class="marca"><img src="' + BASE + 'icons/icon-192.png" alt=""><h1>' + esc(CFG.TITULO) + '</h1>' +
      (Api.remoto ? '' : '<span class="insignia">Modo local de prueba</span>') + '</div>' +
      '<form id="f-login" class="card"><label class="f" for="l-pin">Escribe tu llave</label>' +
      '<input id="l-pin" type="text" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" placeholder="Escribe tu llave">' +
      (S.loginErr ? '<div class="error">' + esc(S.loginErr) + '</div>' : '') +
      '<div style="margin-top:16px"><button class="btn blk" type="submit">Entrar</button></div></form>' +
      '</div>';
  }

  function vTop() {
    if (EMB) return '';
    return '<header class="top"><img class="logo" src="marca.png" alt=""><div class="tit"><b>' + esc(CFG.TITULO) + '</b><span>' +
      esc(S.ses.nombre) + ' · ' + (esAdmin() ? 'Administrador' : 'Supervisor') + (Api.remoto ? '' : ' · modo local') + '</span></div>' +
      (MODO === 'dashboard' ? '<a class="ibtn" href="admin.html" title="Volver al Dashboard" style="text-decoration:none;display:flex;align-items:center;justify-content:center">⌂</a>' : '') + '<button class="ibtn" data-a="refrescar" title="Actualizar">⟳</button><button class="ibtn" data-a="salir" title="Salir">⏻</button></header>';
  }

  function vBandas() {
    var h = '', pend = Api.pendientes(), errs = Api.erroresCola();
    if (!S.cargado && S.estado.entradas.length) h += '<div class="banda bad"><i class="spin"></i> Cargando datos…</div>';
    if (!Api.remoto) h += '<div class="banda info">Modo local de prueba: los datos solo existen en este navegador.</div>';
    if (S.offline) h += '<div class="banda warn">Sin conexión: se muestran los últimos datos guardados en este celular.</div>';
    if (pend && S.enviando) h += '<div class="banda info env"><span>Enviando la salida al almacén…</span><i class="prog"><b></b></i></div>';
    else if (pend) h += '<div class="banda warn"><div>⚠️ <b>' + pend + (pend === 1 ? ' registro guardado' : ' registros guardados') + ' en este celular, sin enviar por falta de señal.</b><br>No se han perdido: se envían solos cuando vuelva la señal. No cierres la sesión ni borres los datos del navegador hasta que desaparezca este aviso.</div><button class="btn chico" data-a="enviarCola">Enviar ahora</button></div>';
    if (S.avisoBaja) h += '<div class="banda bad"><div>' + esc(S.avisoBaja) + '</div><button class="btn chico sec" data-a="cerrarAviso">Entendido</button></div>';
    if (errs.length) h += '<div class="banda bad"><div>' + errs.map(function (e) { return e.body.items ? 'No se pudo registrar la salida (' + e.body.items.length + ' posiciones): ' + esc(e.error) : 'No se pudo registrar ' + esc(e.body.cantidad) + ' × ' + esc(e.body.diametro) + '" en ' + esc(e.body.elemento) + ': ' + esc(e.error); }).join('<br>') + '</div><button class="btn chico sec" data-a="limpiarErrores">Entendido</button></div>';
    return h;
  }

  function vTabs() {
    var T = EMB ? [['panel', '', 'Panel'], ['inv', '', 'Inventario'], ['mov', '', 'Movimientos'], ['ped', '', 'Pedidos'], ['inf', '', 'Informe']] : MODO === 'salidas'
      ? [['salida', '✍️', 'Registrar'], ['mov', '🧾', 'Movimientos'], ['inv', '📦', 'Inventario'], ['inf', '📄', 'Informe']]
      : [['panel', '📊', 'Panel'], ['salida', '✍️', 'Registrar'], ['inv', '📦', 'Inventario'], ['mov', '🧾', 'Movimientos'], ['ped', '📋', 'Pedidos'], ['inf', '📄', 'Informe'], ['cargar', '📥', 'Cargar DLI']];
    return '<nav class="tabs">' + T.map(function (t) {
      return '<button class="' + (S.tab === t[0] ? 'on' : '') + '" data-a="tab" data-v="' + t[0] + '"><span>' + t[1] + '</span><em>' + t[2] + '</em></button>';
    }).join('') + '</nav>';
  }
  function pz(n) { return n0(n) + (n === 1 ? ' pieza' : ' piezas'); }
  /** Tres cajas grandes: Libre / Armado / Salió. */
  function celdas(x, salioX) {
    var o = salioX || { p: x.out_p, kg: x.out_kg };
    return '<div class="ec-n"><div class="cl lib"><small>✅ Libre</small><b>' + n0(x.lib_p) + '</b><i>' + kg(x.lib_kg) + ' kg</i></div>' +
      '<div class="cl arm"><small>🔧 Armado</small><b>' + n0(x.arm_p) + '</b><i>' + kg(x.arm_kg) + ' kg</i></div>' +
      '<div class="cl out"><small>🚚 Salió</small><b>' + n0(o.p) + '</b><i>' + kg(o.kg) + ' kg</i></div></div>';
  }
  function apilada(x) {
    var t = x.in_p || 1, f = function (n) { return Math.max(0, Math.min(100, 100 * n / t)).toFixed(1) + '%'; };
    return '<div class="stk"><i class="lib" style="width:' + f(x.lib_p) + '"></i><i class="arm" style="width:' + f(x.arm_p) + '"></i><i class="out" style="width:' + f(x.out_p) + '"></i></div>';
  }
  function estCard(titulo, sub, x) {
    return '<div class="ec"><div class="ec-h"><b>' + titulo + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>' + apilada(x) + celdas(x) + '</div>';
  }
  function vCargando() { return '<div class="cargando"><i class="spin"></i><b>Cargando datos…</b><span>Un momento, estamos trayendo el inventario.</span></div>'; }
  function sinInventario() {
    if (!S.cargado) return vCargando();
    if (EMB) return '<div class="card vacio"><div style="font-size:2.2rem">📭</div><b>Sin datos</b><br><span class="mut">Todavía no hay acero registrado en el inventario.</span></div>';
    return '<div class="card vacio"><b>Aún no hay acero en el inventario.</b><br>' + (esAdmin()
      ? '<p>Cargue un archivo .dli y asígnele su número de pedido.</p><button class="btn" data-a="tab" data-v="cargar">Cargar DLI</button>'
      : '<p>El administrador debe cargar primero un DLI.</p>') + '</div>';
  }

  function movimientos() {
    var L = [];
    S.estado.pedidos.forEach(function (p) { L.push({ t: 'E', f: p.fecha, p: p }); });
    var G = {}, orden = [];
    S.estado.salidas.forEach(function (s) {
      var k = String(s.id).replace(/-\d+$/, '');
      if (!G[k]) { G[k] = []; orden.push(k); }
      G[k].push(s);
    });
    orden.forEach(function (k) { L.push({ t: 'S', f: G[k][0].fecha, s: G[k][0], g: G[k] }); });
    var q = String(S.mq || '').trim().toLowerCase();
    if (q) {
      var est = {}; S.estado.pedidos.forEach(function (p) { if (String(p.pedido).toLowerCase().indexOf(q) >= 0) est[p.estructura] = 1; });
      L = L.filter(function (m) { return m.t === 'E' ? String(m.p.pedido).toLowerCase().indexOf(q) >= 0 : !!est[m.s.elemento]; });
    } else L = L.filter(function (m) { return enPer(m.f); });
    L.sort(function (a, b) { return a.f < b.f ? 1 : a.f > b.f ? -1 : 0; });
    return L;
  }

  function vMov(m, conAcciones) {
    if (m.t === 'E') {
      var p = m.p;
      return '<div class="mv ent"><div class="mv-i">📥</div><div class="mv-c"><div class="mv-t">Llegó acero · pedido ' + esc(p.pedido) + '</div><div class="mv-s">' + esc(p.estructura) + '</div>' +
        '<div class="mv-m"><span>' + pz(p.piezas) + '</span><span>' + kg(p.kg) + ' kg</span><span>' + esc(p.usuario) + ' · ' + fechaDia(p.fecha) + '</span></div></div>' +
        (conAcciones && esAdmin() ? '<button class="btn chico sec" data-a="anularCarga" data-v="' + esc(p.loadId) + '">Dar de baja</button>' : '') + '</div>';
    }
    var g = m.g, g0 = g[0], arm = tp(g0) === 'ARMADO', activas = g.filter(function (x) { return x.estado !== 'ANULADA'; }), anG = !activas.length, uso = anG ? g : activas;
    var nP = 0, nK = 0, els = [];
    uso.forEach(function (x) { nP += x.cantidad; nK += x.kg; if (els.indexOf(x.elemento) < 0) els.push(x.elemento); });
    var tit = g0.modo === 'PCT' ? (arm ? 'Armado del ' : 'Salida del ') + fmtPct(g0.pct) + ' %' : (arm ? (nP === 1 ? 'Se armó ' : 'Se armaron ') : (nP === 1 ? 'Salió ' : 'Salieron ')) + pz(nP);
    var pend = g.some(function (x) { return x.pendiente; });
    var det = '<details class="mv-d"><summary>Ver las ' + g.length + (g.length === 1 ? ' posición' : ' posiciones') + '</summary><table><thead><tr><th>Posición</th><th>Varilla</th><th class="n">Piezas</th><th class="n">Kg</th></tr></thead><tbody>' +
      g.map(function (x) { return '<tr' + (x.estado === 'ANULADA' && !anG ? ' class="anu"' : '') + '><td><b>' + esc(x.marca || '—') + '</b></td><td>' + esc(C.diamLabel(x.diametro)) + '</td><td class="n">' + n0(x.cantidad) + '</td><td class="n">' + kg(x.kg) + '</td></tr>'; }).join('') + '</tbody></table></details>';
    return '<div class="mv ' + (arm ? 'arm' : 'out') + (anG ? ' anul' : '') + '"><div class="mv-i">' + (arm ? '🔧' : '🚚') + '</div><div class="mv-c"><div class="mv-t">' + tit +
      (anG ? '<span class="chp anu">Anulada</span>' : '') + (pend ? '<span class="chp pen">Sin enviar</span>' : '') + '</div><div class="mv-s">' + els.map(esc).join(' · ') + '</div>' +
      '<div class="mv-m"><span>' + kg(nK) + ' kg</span>' + (g0.modo !== 'PCT' && g0.fase ? '<span>Fase: ' + esc(g0.fase) + '</span>' : '') + '<span>' + esc(g0.usuario) + ' · ' + fecha(g0.fecha) + '</span>' + (g0.obs ? '<span>' + esc(g0.obs) + '</span>' : '') + '</div>' + det + '</div>' +
      (conAcciones && esAdmin() && !anG && g.every(function (x) { return !x.pendiente; }) ? '<button class="btn chico sec" data-a="anularSalida" data-v="' + esc(activas.map(function (x) { return x.id; }).join(',')) + '">Anular</button>' : '') + '</div>';
  }
  // ---- gráficos del panel (SVG/CSS, sin librerías) ----
  function donut(l, a, o) {
    var t = l + a + o || 1, R = 15.915, off = 25, seg = [[l, '#2e7d4f'], [a, '#8a97a6'], [o, '#1f4e79']], acc = 0, h = '';
    seg.forEach(function (x) { var p = 100 * x[0] / t; if (p > 0) h += '<circle cx="21" cy="21" r="' + R + '" fill="none" stroke="' + x[1] + '" stroke-width="7" stroke-dasharray="' + p.toFixed(2) + ' ' + (100 - p).toFixed(2) + '" stroke-dashoffset="' + (off - acc).toFixed(2) + '"/>'; acc += p; });
    var av = Math.round(100 * (a + o) / t);
    return '<svg class="dn" viewBox="0 0 42 42" role="img" aria-label="Distribución de piezas"><circle cx="21" cy="21" r="' + R + '" fill="none" stroke="#e2e8f0" stroke-width="7"/>' + h +
      '<text x="21" y="20.5" text-anchor="middle" class="dn-n">' + av + '%</text><text x="21" y="26" text-anchor="middle" class="dn-s">usado</text></svg>';
  }
  function barraH(x) {
    var t = x.in_p || 1, f = function (n) { return (100 * n / t).toFixed(1) + '%'; };
    return '<div class="bh"><i class="lib" style="width:' + f(x.lib_p) + '"></i><i class="arm" style="width:' + f(x.arm_p) + '"></i><i class="out" style="width:' + f(x.out_p) + '"></i></div>';
  }
  function leyenda() { return '<div class="ley"><span><i class="lib"></i>Libre</span><span><i class="arm"></i>Armado</span><span><i class="out"></i>Salió</span></div>'; }
  // ---- Panel: todo respeta el periodo del filtro (Dashboard o botones propios) ----
  function aggPeriodo() {
    var r = { lle: { p: 0, kg: 0 }, arm: { p: 0, kg: 0 }, out: { p: 0, kg: 0 }, dia: {}, diam: {} };
    function d(k) { return r.dia[k] || (r.dia[k] = { lle: 0, arm: 0, out: 0 }); }
    function dm(k) { return r.diam[k] || (r.diam[k] = { lle: 0, arm: 0, out: 0, lle_p: 0, arm_p: 0, out_p: 0 }); }
    S.estado.entradas.forEach(function (e) {
      var f = String(e.fecha || '').slice(0, 10); if (!enPer(f)) return;
      var q = +e.cantidad || 0, k = +e.kg || 0; r.lle.p += q; r.lle.kg += k; d(f).lle += k; var x = dm(e.diametro); x.lle += k; x.lle_p += q;
    });
    S.estado.salidas.forEach(function (e) {
      if (e.estado === 'ANULADA') return;
      var f = String(e.fecha || '').slice(0, 10); if (!enPer(f)) return;
      var q = +e.cantidad || 0, k = +e.kg || 0, t = tp(e) === 'ARMADO' ? 'arm' : 'out';
      r[t].p += q; r[t].kg += k; d(f)[t] += k; var x = dm(e.diametro); x[t] += k; x[t + '_p'] += q;
    });
    return r;
  }
  function textoPeriodo() {
    var r = rangoPer(); if (!r) return 'Todo el historial';
    function f(x) { return x.slice(8, 10) + '/' + x.slice(5, 7) + '/' + x.slice(0, 4); }
    if (S.per.k === 'rango' && !S.per.d && !S.per.h) return 'Todo el historial';
    return r[0] === r[1] ? f(r[0]) : (r[0] < '1000' ? 'Hasta ' : 'Del ' + f(r[0]) + ' ') + (r[1] > '9000' ? '' : 'al ' + f(r[1]));
  }
  function diasGrafico(ag) {
    var r = rangoPer(), hoy = hoyISO(), ini, fin, ks = Object.keys(ag.dia).sort();
    fin = r && r[1] < hoy && r[1] < '9000' ? r[1] : hoy;
    ini = r && r[0] > '1000' ? r[0] : (ks.length ? ks[0] : fin);
    var out = [], d = new Date(fin + 'T12:00:00'), lim = 31;
    while (out.length < lim) { var f = isoDe(d); if (f < ini) break; out.unshift(f); d.setDate(d.getDate() - 1); }
    return { dias: out, recorte: out.length === lim && out[0] > ini };
  }
  function graficoDias(ag) {
    var g = diasGrafico(ag), dias = g.dias, n = dias.length || 1, W = 320, H = 150, L = 34, B = 18, T = 8, iw = W - L - 6, ih = H - B - T;
    var mx = 1; dias.forEach(function (f) { var y = ag.dia[f] || {}; mx = Math.max(mx, y.lle || 0, y.arm || 0, y.out || 0); });
    var paso = Math.pow(10, Math.floor(Math.log10(mx))), top = Math.ceil(mx / paso) * paso; if (top / paso < 2) top = paso * 2;
    var gx = iw / n, bw = Math.max(2, Math.min(9, gx / 3.6)), h = '';
    for (var i = 0; i <= 4; i++) { var v = top * i / 4, y = T + ih - ih * i / 4; h += '<line x1="' + L + '" x2="' + (W - 4) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#e3e7ec"/><text x="' + (L - 4) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end" class="tx">' + (v >= 1000 ? (v / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + 'k' : Math.round(v)) + '</text>'; }
    var cols = [['lle', '#2e7d4f'], ['arm', '#8a97a6'], ['out', '#1f4e79']], cada = Math.ceil(n / 7);
    dias.forEach(function (f, k) {
      var y = ag.dia[f] || {}, x0 = L + k * gx + gx / 2 - bw * 1.5;
      cols.forEach(function (c, j) { var v = y[c[0]] || 0, hh = ih * v / top; if (v > 0) h += '<rect x="' + (x0 + j * bw).toFixed(1) + '" y="' + (T + ih - hh).toFixed(1) + '" width="' + (bw - .6).toFixed(1) + '" height="' + hh.toFixed(1) + '" fill="' + c[1] + '"/>'; });
      if (k % cada === 0 || k === n - 1) h += '<text x="' + (L + k * gx + gx / 2).toFixed(1) + '" y="' + (H - 5) + '" text-anchor="middle" class="tx">' + f.slice(8, 10) + '/' + f.slice(5, 7) + '</text>';
    });
    return '<div class="card gr"><h3>Kilos por día</h3><p class="peq mut" style="margin:0 0 6px">' + textoPeriodo() + (g.recorte ? ' · se muestran los últimos 31 días' : '') + '</p>' +
      '<div class="ley"><span><i class="lib"></i>Llegó</span><span><i class="arm"></i>Armado</span><span><i class="out"></i>Salió</span></div>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="tr" role="img" aria-label="Kilos por día">' + h + '</svg></div>';
  }
  function kpiPer(tit, cls, x) {
    return '<div class="kp ' + cls + '"><small>' + tit + '</small><b>' + n0(x.p) + '<em> pzs</em></b><strong>' + kg(x.kg) + '<em> kg</em></strong></div>';
  }
  function vPanel() {
    if (!S.estado.entradas.length) return sinInventario();
    var c = S.calc, t = c.tot, ag = aggPeriodo();
    var diams = Object.keys(c.porDiam).sort(function (a, b) { return C.diamOrder(a) - C.diamOrder(b); });
    var h = '<div class="hero"><small>Hoy en la playa de hierros</small><b>' + n0(t.sal_p) + '<em> piezas</em></b><span>' + kg(t.sal_kg) + ' kg · de ' + n0(t.in_p) + ' piezas (' + kg(t.in_kg) + ' kg) que llegaron en total</span>' + apilada(t) + '</div>';
    h += vFiltro();
    h += '<h2 class="sec-t">Movimiento del período <small>' + textoPeriodo() + '</small></h2><div class="kp3">' + kpiPer('Llegó', 'lib', ag.lle) + kpiPer('Armado', 'arm', ag.arm) + kpiPer('Salió', 'out', ag.out) + '</div>';
    h += graficoDias(ag);
    // estado actual de la playa
    h += '<div class="card gr"><h3>Estado actual del acero</h3><div class="dn-w">' + donut(t.lib_p, t.arm_p, t.out_p) +
      '<div class="dn-l"><div><i class="lib"></i><b>' + n0(t.lib_p) + '</b> libres<small>' + kg(t.lib_kg) + ' kg</small></div><div><i class="arm"></i><b>' + n0(t.arm_p) + '</b> armadas<small>' + kg(t.arm_kg) + ' kg</small></div><div><i class="out"></i><b>' + n0(t.out_p) + '</b> salieron<small>' + kg(t.out_kg) + ' kg</small></div></div></div></div>';
    // kilos por diámetro en el período
    var dp = diams.filter(function (d) { var x = ag.diam[d]; return x && (x.lle || x.arm || x.out); });
    var mxd = Math.max.apply(null, dp.map(function (d) { var x = ag.diam[d]; return Math.max(x.lle, x.arm, x.out); }).concat([1]));
    h += '<div class="card gr"><h3>Kilos por tipo de varilla en el período</h3><div class="ley"><span><i class="lib"></i>Llegó</span><span><i class="arm"></i>Armado</span><span><i class="out"></i>Salió</span></div>' +
      (dp.length ? dp.map(function (d) {
        var x = ag.diam[d], w = function (n) { return Math.max(n > 0 ? 1.5 : 0, 100 * n / mxd).toFixed(1) + '%'; };
        function fila(cl, k, q) { return '<div class="dm"><div class="dm-b"><i class="' + cl + '" style="width:' + w(k) + '"></i></div><span><b>' + kg(k) + '</b> kg · ' + n0(q) + ' pzs</span></div>'; }
        return '<div class="bh-r"><div class="bh-t"><b>' + esc(C.diamLabel(d)) + '</b></div>' + fila('lib', x.lle, x.lle_p) + fila('arm', x.arm, x.arm_p) + fila('out', x.out, x.out_p) + '</div>';
      }).join('') : '<div class="vacio">Sin movimiento en este período</div>') + '</div>';
    // estructuras con más movimiento en el período (solo datos clave del período)
    var te = {};
    S.estado.salidas.forEach(function (x) { if (x.estado === 'ANULADA' || !enPer(String(x.fecha || '').slice(0, 10))) return; var k = x.elemento || '—', o = te[k] || (te[k] = { arm: 0, out: 0, p: 0 }); if (tp(x) === 'ARMADO') o.arm += +x.kg || 0; else o.out += +x.kg || 0; o.p += +x.cantidad || 0; });
    var tl = Object.keys(te).map(function (k) { return { e: k, x: te[k], t: te[k].arm + te[k].out }; }).sort(function (a, b) { return b.t - a.t; }).slice(0, 6), mxe = Math.max.apply(null, tl.map(function (r) { return r.t; }).concat([1]));
    h += '<div class="card gr"><h3>Estructuras con más movimiento</h3><p class="peq mut" style="margin:0 0 8px">Kilos armados y que salieron en el período</p>' +
      (tl.length ? tl.map(function (r) { return '<div class="bh-r"><div class="bh-t"><b>' + esc(r.e) + '</b><span>' + kg(r.t) + ' kg</span></div><div class="bh"><i class="arm" style="width:' + (100 * r.x.arm / mxe).toFixed(1) + '%"></i><i class="out" style="width:' + (100 * r.x.out / mxe).toFixed(1) + '%"></i></div><small>Armado <b>' + kg(r.x.arm) + '</b> kg · Salió <b>' + kg(r.x.out) + '</b> kg</small></div>'; }).join('') : '<div class="vacio">Sin movimiento en este período</div>') + '</div>';
    return h;
  }
  function diamsDisponibles() {
    return Object.keys(S.calc.porDiam).filter(function (d) { return S.calc.porDiam[d].sal_p > 0; })
      .sort(function (a, b) { return C.diamOrder(a) - C.diamOrder(b); });
  }
  function elemsDe(d) {
    var r = [];
    Object.keys(S.calc.porElemDiam).forEach(function (k) {
      var i = k.lastIndexOf('|');
      if (k.slice(i + 1) === d && S.calc.porElemDiam[k].sal_p > 0) r.push(k.slice(0, i));
    });
    return r.sort();
  }
  function marcasDe(e, d) {
    var seen = {}, r = [];
    S.estado.entradas.forEach(function (x) {
      if (x.estructura !== e || x.diametro !== d || seen[x.marca]) return;
      seen[x.marca] = 1;
      var sd = S.calc.porMarca[e + '|' + d + '|' + x.marca];
      if (sd && sd.sal_p > 0) r.push({ marca: x.marca, largo: x.largo, disp: sd.sal_p });
    });
    return r.sort(function (a, b) { return cmpMarca(a.marca, b.marca); });
  }
  function elemsDisp() {
    var r = {};
    Object.keys(S.calc.porElemDiam).forEach(function (k) {
      if (dispDe(S.calc.porElemDiam[k]) > 0) r[k.slice(0, k.lastIndexOf('|'))] = 1;
    });
    return Object.keys(r).sort();
  }
  function diamsDeElem(e) {
    return diamsDisponibles().filter(function (d) { var x = S.calc.porElemDiam[e + '|' + d]; return x && x.sal_p > 0; });
  }
  function enCarrito(e, d, p) {
    return S.sal.items.reduce(function (a, it) { return a + (it.elem === e && it.diam === d && it.pos === p ? it.cant : 0); }, 0);
  }
  function todasElems() {
    var r = {};
    S.estado.entradas.forEach(function (x) { r[x.estructura] = 1; });
    return Object.keys(r).sort();
  }
  function fmtPct(x) { return Number(x || 0).toLocaleString('es-CO', { maximumFractionDigits: 1 }); }
  function fasesDe(e) {
    var seen = {}, r = [];
    S.estado.salidas.slice().sort(function (a, b) { return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0; }).forEach(function (x) {
      if (x.elemento === e && x.fase && !seen[x.fase]) { seen[x.fase] = 1; r.push(x.fase); }
    });
    return r;
  }
  function pctAcum(e) {
    var G = {};
    S.estado.salidas.forEach(function (x) { if (x.elemento === e && x.estado !== 'ANULADA' && x.modo === 'PCT' && tp(x) === S.sal.tipo) G[String(x.id).replace(/-\d+$/, '')] = x.pct || 0; });
    return Object.keys(G).reduce(function (t, k) { return t + G[k]; }, 0);
  }
  function tomadoPct(e, d, m) {
    return S.estado.salidas.reduce(function (t, x) { return t + (x.elemento === e && x.diametro === d && x.marca === m && x.estado !== 'ANULADA' && x.modo === 'PCT' && tp(x) === S.sal.tipo ? x.cantidad : 0); }, 0);
  }
  function itemsPct(e, p) {
    var cum = Math.min(100, pctAcum(e) + p), r = [], vistos = {}, pos = [], totP = 0;
    S.estado.entradas.forEach(function (x) {
      if (x.estructura !== e) return;
      var k = x.diametro + '|' + x.marca; if (vistos[k]) return; vistos[k] = 1;
      var v = S.calc.porMarca[e + '|' + x.diametro + '|' + x.marca]; if (!v) return;
      pos.push({ k: k, v: v, base: Math.floor(v.in_p * cum / 100 + 1e-9), rem: v.in_p * cum / 100 - Math.floor(v.in_p * cum / 100 + 1e-9) }); totP += v.in_p;
    });
    // Para que el porcentaje sea el que se pidió: las piezas sueltas que sobran al redondear se reparten por mayor resto.
    var metaTot = cum >= 100 - 1e-9 ? totP : Math.round(totP * cum / 100 + 1e-9), extra = metaTot - pos.reduce(function (t, o) { return t + o.base; }, 0);
    pos.slice().sort(function (a, b) { return b.rem - a.rem; }).forEach(function (o) { if (extra > 0 && o.base < o.v.in_p) { o.base++; extra--; } });
    var metaPos = {}; pos.forEach(function (o) { metaPos[o.k] = o.base; });
    vistos = {};
    S.estado.entradas.forEach(function (x) {
      if (x.estructura !== e) return;
      var k = x.diametro + '|' + x.marca; if (vistos[k]) return; vistos[k] = 1;
      var v = S.calc.porMarca[e + '|' + x.diametro + '|' + x.marca]; if (!v) return;
      var meta = cum >= 100 - 1e-9 ? v.in_p : (metaPos[k] || 0);
      var q = Math.max(0, Math.min(dispDe(v), meta - tomadoPct(e, x.diametro, x.marca)));
      if (q > 0) r.push({ id: '', largo: x.largo || 0, elem: e, diam: x.diametro, pos: x.marca, marca: x.marca, cant: q, kg: C.kgSalida(S.calc, e, x.diametro, q, x.marca) });
    });
    return r.sort(function (a, b) { return C.diamOrder(a.diam) - C.diamOrder(b.diam) || cmpMarca(a.marca, b.marca); });
  }
  function nEstDe(e) {
    var p = S.estado.pedidos.filter(function (x) { return x.estructura === e; })[0];
    return Math.max(1, Math.round(+(p && p.nEstructuras) || 1));
  }
  function predefinir1() { // si la cartilla es para varias estructuras, se propone 1 estructura
    var s = S.sal; if (s.modo !== 'pct' || !s.elem) return;
    var N = nEstDe(s.elem), rest = Math.max(0, 100 - pctAcum(s.elem));
    if (N > 1 && rest > 0) { s.pct = String(Math.round(Math.min(rest, 100 / N) * 100) / 100); aplicarPct(); }
  }
  function aplicarPct() {
    var s = S.sal, p = parseFloat(String(s.pct).replace(',', '.')) || 0, rest = Math.max(0, 100 - pctAcum(s.elem));
    s.items = s.elem && p > 0 && p <= rest + 1e-9 ? itemsPct(s.elem, p) : [];
    s.err = p > rest + 1e-9 ? 'Solo falta ' + fmtPct(rest) + ' % para completar la estructura.' : '';
  }
  function vBalance(e) {
    var vistos = {}, filas = [];
    S.estado.entradas.forEach(function (x) {
      if (x.estructura !== e) return;
      var k = x.diametro + '|' + x.marca; if (vistos[k]) return; vistos[k] = 1;
      var v = S.calc.porMarca[e + '|' + x.diametro + '|' + x.marca]; if (!v) return;
      filas.push({ marca: x.marca, diam: x.diametro, in_p: v.in_p, pct: tomadoPct(e, x.diametro, x.marca), sal_p: v.sal_p, sal_kg: v.sal_kg });
    });
    filas.sort(function (a, b) { return C.diamOrder(a.diam) - C.diamOrder(b.diam) || cmpMarca(a.marca, b.marca); });
    var quedan = filas.filter(function (f) { return f.sal_p > 0; });
    return '<div class="balance"><div class="paso-h"><b>' + esc(e) + ' llegó al 100 %</b><button type="button" class="lnk" data-a="cerrarBal">Cerrar</button></div>' +
      (quedan.length ? '<p class="mut" style="margin:0 0 8px">Esto es lo que queda en almacén por posición:</p><div class="tw"><table><thead><tr><th>Posición</th><th>Varilla</th><th class="n">Ingresó</th><th class="n">Queda</th><th class="n">Kg</th></tr></thead><tbody>' +
        quedan.map(function (f) { return '<tr><td><b>' + esc(f.marca) + '</b></td><td>' + esc(C.diamLabel(f.diam)) + '</td><td class="n">' + n0(f.in_p) + '</td><td class="n"><b>' + n0(f.sal_p) + '</b></td><td class="n">' + kg(f.sal_kg) + '</td></tr>'; }).join('') + '</tbody></table></div>'
        : '<p class="mut" style="margin:0">No queda acero de esta estructura en el almacén.</p>') + '</div>';
  }
  function ajustarSalida() {
    var s = S.sal, es = elemsDisp();
    if (todasElems().indexOf(s.elem) < 0) s.elem = '';
    if (!s.elem && es.length === 1) { s.elem = es[0]; }
  }
  function cantEn(e, d, m) { return enCarrito(e, d, m); }
  function piezasSalida(e) {
    var ms = [], vistos = {};
    S.estado.entradas.forEach(function (x) {
      if (x.estructura !== e) return;
      var k = x.diametro + '|' + x.marca;
      if (vistos[k]) return; vistos[k] = 1;
      var v = S.calc.porMarca[e + '|' + x.diametro + '|' + x.marca];
      if (!v) return;
      var en = cantEn(e, x.diametro, x.marca);
      if (dispDe(v) > 0 || en > 0) ms.push({ marca: x.marca, diam: x.diametro, largo: x.largo, disp: dispDe(v) - en, total: v.in_p, en: en });
    });
    return ms.sort(function (a, b) { return C.diamOrder(a.diam) - C.diamOrder(b.diam) || cmpMarca(a.marca, b.marca); });
  }
  function setCant(e, d, m, n) {
    var s = S.sal, v = S.calc.porMarca[e + '|' + d + '|' + m]; if (!v) return;
    n = Math.max(0, Math.min(dispDe(v), Math.floor(+n || 0)));
    var it = s.items.filter(function (x) { return x.elem === e && x.diam === d && x.marca === m; })[0];
    if (!it && n > 0) { var ent = S.estado.entradas.filter(function (z) { return z.estructura === e && z.diametro === d && z.marca === m; })[0] || {};
      it = { id: '', largo: ent.largo || 0, elem: e, diam: d, pos: m, marca: m, cant: 0, kg: 0 }; s.items.push(it); }
    if (it) { it.cant = n; if (n <= 0) s.items.splice(s.items.indexOf(it), 1); else it.kg = C.kgSalida(S.calc, e, d, n, m); }
    s.err = ''; s.msg = '';
  }
  function sumarItem(e, d, m, delta) {
    var s = S.sal, it = s.items.filter(function (x) { return x.elem === e && x.diam === d && x.marca === m; })[0];
    var v = S.calc.porMarca[e + '|' + d + '|' + m]; if (!v) return;
    if (delta > 0) {
      if (dispDe(v) - (it ? it.cant : 0) < 1) { toast('No quedan más piezas de esa posición'); return; }
      if (!it) { var ent = S.estado.entradas.filter(function (z) { return z.estructura === e && z.diametro === d && z.marca === m; })[0] || {};
        it = { id: '', largo: ent.largo || 0, elem: e, diam: d, pos: m, marca: m, cant: 0, kg: 0 }; s.items.push(it); }
      it.cant += 1;
    } else if (it) {
      it.cant -= 1;
      if (it.cant <= 0) s.items.splice(s.items.indexOf(it), 1);
    }
    if (it && it.cant > 0) it.kg = C.kgSalida(S.calc, e, d, it.cant, m);
    s.err = ''; s.msg = '';
  }

  function vSalida() {
    if (!S.estado.entradas.length) return sinInventario();
    ajustarSalida();
    var s = S.sal, arm = esArm(), todas = todasElems(), conSaldo = elemsDisp();
    var h = '<div class="card sal ' + (arm ? 't-arm' : 't-out') + '"><div class="tipo"><button type="button" class="tp arm' + (arm ? ' on' : '') + '" data-a="tipo" data-v="ARMADO"><span>🔧</span><b>Armar</b><small>Se usa. Sigue en la playa.</small></button>' +
      '<button type="button" class="tp out' + (!arm ? ' on' : '') + '" data-a="tipo" data-v="SALIDA"><span>🚚</span><b>Sacar</b><small>Sale de la playa.</small></button></div>';
    if (s.msg) h += '<div class="okmsg">✓ ' + esc(s.msg) + '</div>';
    if (s.balElem && !arm) h += vBalance(s.balElem);
    if (!conSaldo.length && !s.items.length) return h + '<div class="vacio">' + (arm ? 'No queda acero libre para armar.' : 'No queda acero en la playa.') + '</div></div>';
    h += '<div class="seg"><button type="button" class="' + (s.modo === 'pos' ? 'on' : '') + '" data-a="modo" data-v="pos">Por posiciones</button><button type="button" class="' + (s.modo === 'pct' ? 'on' : '') + '" data-a="modo" data-v="pct">Por % de avance</button></div>';
    h += '<section class="paso"><div class="paso-h"><i>1</i><b>¿Cuándo y dónde?</b></div><div class="fgrid">' +
      '<div class="fld"><label for="s-fecha">Fecha</label><input id="s-fecha" type="date" max="' + hoyISO() + '" value="' + esc(s.fecha || hoyISO()) + '" data-i="sal.fecha"></div>' +
      '<div class="fld" style="grid-column: 1 / -1"><label for="s-elem">Estructura</label><select id="s-elem" data-f="sal.elem">' + (s.elem ? '' : '<option value="">Elija la estructura…</option>') +
        todas.map(function (e) {
          var pzs = dispDe(S.calc.porElem[e]), ped = {};
          S.estado.pedidos.forEach(function (p) { if (p.estructura === e) ped[p.pedido] = 1; });
          return '<option value="' + esc(e) + '"' + (e === s.elem ? ' selected' : '') + (pzs > 0 || e === s.elem ? '' : ' disabled') + '>' + esc(e) + ' · ' + (pzs > 0 ? n0(pzs) + (arm ? ' libres' : ' piezas') : 'sin acero') + '</option>'; }).join('') + '</select></div>' +
      (s.modo === 'pos' && s.elem ? '<div class="fld" style="grid-column: 1 / -1"><label for="s-fase">Fase</label><input id="s-fase" type="text" list="fases" maxlength="60" autocomplete="off" placeholder="Ej. Losa de fondo, Muros, Cabezal" value="' + esc(s.fase) + '" data-i="sal.fase"><datalist id="fases">' + fasesDe(s.elem).map(function (f) { return '<option value="' + esc(f) + '">'; }).join('') + '</datalist></div>' : '') +
      '</div></section>';
    if (s.elem && s.modo === 'pct') {
      var ac = pctAcum(s.elem), rest = Math.max(0, 100 - ac);
      h += '<section class="paso"><div class="paso-h"><i>2</i><b>¿Qué porcentaje?</b></div>' +
        '<div class="avance"><div class="av-b"><i style="width:' + Math.min(100, ac) + '%"></i></div><span>Ya ' + (arm ? 'se armó ' : 'salió ') + '<b>' + fmtPct(ac) + ' %</b>' + (rest <= 0 ? ' · completa' : '') + '</span></div>';
      if (rest <= 0) h += '<div class="vacio-s">Esta estructura ya está al 100 %.</div>';
      else if (nEstDe(s.elem) > 1) {
        var NE = nEstDe(s.elem), kEst = Math.max(1, Math.min(NE, Math.round((parseFloat(String(s.pct).replace(',', '.')) || 0) * NE / 100)));
        h += '<div class="peq mut" style="margin:6px 0">Esta cartilla es para <b>' + NE + ' estructuras</b>: cada una es ' + fmtPct(Math.round(10000 / NE) / 100) + ' %.</div>' +
          '<div class="fch">' + [1, 2, 3, 5].filter(function (x) { return x < NE && x * 100 / NE <= rest + 1e-9; }).map(function (x) { return '<button type="button" class="fc' + (Math.abs((parseFloat(String(s.pct).replace(',', '.')) || 0) - x * 100 / NE) < 1e-6 ? ' on' : '') + '" data-a="pctset" data-v="' + (x * 100 / NE) + '">' + x + (x === 1 ? ' estructura' : ' estructuras') + '</button>'; }).join('') +
          '<button type="button" class="fc" data-a="pctset" data-v="' + rest + '">Todo lo que falta (' + fmtPct(rest) + ' %)</button></div>' +
          '<div class="pctin"><input id="s-pct" type="text" inputmode="decimal" autocomplete="off" placeholder="0" value="' + esc(s.pct) + '" data-i="sal.pct"><span>% de la cartilla</span></div>';
      } else h += '<div class="fch">' + [10, 25, 50, 75].filter(function (x) { return x < rest; }).map(function (x) { return '<button type="button" class="fc" data-a="pctset" data-v="' + x + '">' + x + ' %</button>'; }).join('') +
        '<button type="button" class="fc" data-a="pctset" data-v="' + rest + '">Completar ' + fmtPct(rest) + ' %</button></div>' +
        '<div class="pctin"><input id="s-pct" type="text" inputmode="decimal" autocomplete="off" placeholder="0" value="' + esc(s.pct) + '" data-i="sal.pct"><span>% de la estructura</span></div>';
      h += '</section>';
    } else if (s.elem) {
      var todasP = piezasSalida(s.elem), diams = [];
      todasP.forEach(function (p) { if (diams.indexOf(p.diam) < 0) diams.push(p.diam); });
      var q = String(s.q || '').trim().toLowerCase().replace(',', '.');
      var lista = todasP.filter(function (p) {
        if (p.disp <= 0) return false;
        if (s.fdiam && p.diam !== s.fdiam) return false;
        return p.marca.toLowerCase().indexOf(q) >= 0 || (p.largo && p.largo.toFixed(2).indexOf(q) === 0);
      });
      h += '<section class="paso"><div class="paso-h"><i>2</i><b>Busque la posición</b></div>' +
        '<div class="busq"><input id="s-q" type="search" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Escriba la posición. Ej. 4.06 o 2a" value="' + esc(s.q) + '" data-i="sal.q"></div>';
      if (diams.length > 1) h += '<div class="fch">' + diams.map(function (d) { return '<button type="button" class="fc' + (s.fdiam === d ? ' on' : '') + '" data-a="fdiam" data-v="' + (s.fdiam === d ? '' : esc(d)) + '">' + esc(C.diamLabel(d)) + '</button>'; }).join('') + '</div>';
      if (!q) h += '<div class="vacio-s">Las posiciones aparecen aquí cuando usted escribe.</div>';
      else if (!lista.length) h += '<div class="vacio-s">No hay posiciones que coincidan con “' + esc(s.q) + '”.</div>';
      else h += '<div class="rlist">' + lista.map(function (p) {
        var a1 = ' data-v="' + esc(p.marca) + '" data-d="' + esc(p.diam) + '"';
        return '<div class="rr"><div class="rr-i"><b>' + esc(p.marca) + '</b><span>' + esc(C.diamLabel(p.diam)) + (p.largo ? ' · ' + p.largo.toFixed(2) + ' m' : '') + ' · ' + (arm ? 'libres ' : 'quedan ') + n0(p.disp) + (nEstDe(s.elem) > 1 ? ' · por estructura ' + fmtPct(Math.round(((S.calc.porMarca[s.elem + '|' + p.diam + '|' + p.marca] || {}).in_p || 0) / nEstDe(s.elem) * 100) / 100) : '') + '</span></div>' +
          '<button type="button" class="b1" data-a="sumar"' + a1 + '>+1</button>' +
          (p.disp > 1 ? '<button type="button" class="bt" data-a="todas"' + a1 + '>Todas · ' + n0(p.disp) + '</button>' : '') + '</div>'; }).join('') + '</div>';
      h += '</section>';
    }
    h += '<section class="paso"><div class="paso-h"><i>3</i><b>' + (arm ? 'Lo que se arma' : 'Lo que sale') + '</b>' + (s.items.length ? '<button type="button" class="lnk" data-a="vaciar">Vaciar</button>' : '') + '</div>';
    if (!s.items.length) h += '<div class="vacio-s">Todavía no ha agregado piezas.</div>';
    else h += '<div class="rlist">' + s.items.map(function (it, ix) {
      var v = S.calc.porMarca[it.elem + '|' + it.diam + '|' + it.marca], mx = v ? dispDe(v) : it.cant, a1 = ' data-v="' + esc(it.marca) + '" data-d="' + esc(it.diam) + '"';
      return '<div class="rr en"><div class="rr-i"><b>' + esc(it.marca) + '</b><span>' + esc(C.diamLabel(it.diam)) + (it.largo ? ' · ' + it.largo.toFixed(2) + ' m' : '') + ' · ' + kg(it.kg) + ' kg</span></div>' +
        '<div class="pc-ctl"><button type="button" data-a="restar"' + a1 + ' aria-label="Quitar una">−</button><input class="qn" type="number" inputmode="numeric" min="0" max="' + mx + '" value="' + it.cant + '" data-q="' + ix + '" aria-label="Cantidad"><button type="button" data-a="sumar"' + a1 + ' aria-label="Agregar una"' + (it.cant >= mx ? ' disabled' : '') + '>+</button></div>' +
        '<button type="button" class="bx" data-a="quitar" data-v="' + ix + '" aria-label="Quitar">✕</button></div>'; }).join('') + '</div>';
    h += '<details class="mas"><summary>Agregar una nota (opcional)</summary><input id="s-obs" type="text" maxlength="120" placeholder="Ej. turno noche" value="' + esc(s.obs) + '" data-i="sal.obs"></details></section>';
    if (s.err) h += '<div class="error">' + esc(s.err) + '</div>';
    var tp2 = 0, tk = 0; s.items.forEach(function (it) { tp2 += it.cant; tk += it.kg; });
    h += '<div class="sb-esp"></div><div class="sbar"><div class="sres">' + (s.items.length
      ? '<b>' + pz(tp2) + '</b><small>' + kg(tk) + ' kg</small>'
      : '<span class="mut">Aún no hay piezas</span>') + '</div>' +
      '<button type="button" class="btn sacar2" data-a="registrarSalida"' + (s.items.length ? '' : ' disabled') + '>' + (arm ? '🔧 Guardar armado' : '🚚 Guardar salida') + '</button></div>';
    return h + '</div>';
  }
  function tablaInv(filas, cols) {
    var tot = { in_p: 0, in_kg: 0, out_p: 0, sal_p: 0, sal_kg: 0 };
    var h = '<div class="tw"><table><thead><tr>' + cols.map(function (c) { return '<th' + (c.n ? ' class="n"' : '') + '>' + c.t + '</th>'; }).join('') + '</tr></thead><tbody>';
    filas.forEach(function (f) {
      h += '<tr>' + cols.map(function (c) { return '<td' + (c.n ? ' class="n"' : '') + '>' + c.f(f) + '</td>'; }).join('') + '</tr>';
      tot.in_p += f.x.in_p; tot.in_kg += f.x.in_kg; tot.out_p += f.x.out_p; tot.sal_p += f.x.sal_p; tot.sal_kg += f.x.sal_kg;
    });
    if (filas.length > 1) h += '<tr class="tot">' + cols.map(function (c, i) { return '<td' + (c.n ? ' class="n"' : '') + '>' + (i === 0 ? 'Total' : c.tot ? c.tot(tot) : '') + '</td>'; }).join('') + '</tr>';
    return h + '</tbody></table></div>';
  }

  function vInv() {
    if (!S.estado.entradas.length) return sinInventario();
    var c = S.calc, v = S.inv, t = c.tot, filas = [];
    var elems = Object.keys(c.porElem).sort();
    var diams = Object.keys(c.porDiam).sort(function (a, b) { return C.diamOrder(a) - C.diamOrder(b); });
    var tarjetas;
    if (v.vista === 'diametro') {
      Object.keys(v.elem ? c.porElemDiam : c.porDiam).forEach(function (k) {
        var d = v.elem ? k.slice(k.lastIndexOf('|') + 1) : k, e = v.elem ? k.slice(0, k.lastIndexOf('|')) : '';
        if (v.elem && e !== v.elem) return;
        filas.push({ d: d, x: (v.elem ? c.porElemDiam : c.porDiam)[k] });
      });
      filas.sort(function (a, b) { return C.diamOrder(a.d) - C.diamOrder(b.d); });
      tarjetas = filas.map(function (f) { return estCard(esc(C.diamLabel(f.d)), '', f.x); });
    } else if (v.vista === 'elemento') {
      Object.keys(v.diam ? c.porElemDiam : c.porElem).forEach(function (k) {
        var e = v.diam ? k.slice(0, k.lastIndexOf('|')) : k, d = v.diam ? k.slice(k.lastIndexOf('|') + 1) : '';
        if (v.diam && d !== v.diam) return;
        filas.push({ e: e, x: (v.diam ? c.porElemDiam : c.porElem)[k] });
      });
      filas.sort(function (a, b) { return a.e < b.e ? -1 : 1; });
      tarjetas = filas.map(function (f) { return estCard(esc(f.e), '', f.x); });
    } else {
      var seen = {};
      S.estado.entradas.forEach(function (e) {
        var k = e.estructura + '|' + e.diametro + '|' + e.marca;
        if (seen[k] || (v.elem && e.estructura !== v.elem) || (v.diam && e.diametro !== v.diam)) return;
        seen[k] = 1;
        filas.push({ e: e.estructura, d: e.diametro, m: e.marca, largo: e.largo, x: c.porMarca[k] });
      });
      filas.sort(function (a, b) { return (a.e < b.e ? -1 : a.e > b.e ? 1 : 0) || C.diamOrder(a.d) - C.diamOrder(b.d) || cmpMarca(a.m, b.m); });
      tarjetas = filas.slice(0, 200).map(function (f) { return estCard('Posición ' + esc(f.m), esc(C.diamLabel(f.d)) + (f.largo ? ' · ' + f.largo.toFixed(2) + ' m' : '') + (v.elem ? '' : ' · ' + esc(f.e)), f.x); });
      if (filas.length > 200) tarjetas.push('<p class="peq mut">Se muestran 200 de ' + filas.length + '. Use los filtros para ver el resto.</p>');
    }
    return '<div class="hero"><small>En la playa de hierros hay</small><b>' + pz(t.sal_p) + '</b><span>' + kg(t.sal_kg) + ' kg</span>' + apilada(t) + '</div>' +
      '<div class="tri"><div class="tl lib"><div class="tl-i">✅</div><b>' + n0(t.lib_p) + '</b><strong>Libre</strong><i>' + kg(t.lib_kg) + ' kg</i></div>' +
      '<div class="tl arm"><div class="tl-i">🔧</div><b>' + n0(t.arm_p) + '</b><strong>Armado</strong><i>' + kg(t.arm_kg) + ' kg</i></div>' +
      '<div class="tl out"><div class="tl-i">🚚</div><b>' + n0(t.out_p) + '</b><strong>Salió</strong><i>' + kg(t.out_kg) + ' kg</i></div></div>' +
      '<div class="card"><div class="seg">' + [['diametro', 'Por varilla'], ['elemento', 'Por estructura'], ['marca', 'Por posición']].map(function (o) { return '<button class="' + (v.vista === o[0] ? 'on' : '') + '" data-a="invVista" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>' +
      '<div class="row2"><select data-f="inv.elem" style="flex:1;min-width:150px"><option value="">Todas las estructuras</option>' + elems.map(function (e) { return '<option value="' + esc(e) + '"' + (e === v.elem ? ' selected' : '') + '>' + esc(e) + '</option>'; }).join('') + '</select>' +
      '<select data-f="inv.diam" style="flex:1;min-width:130px"><option value="">Todas las varillas</option>' + diams.map(function (d) { return '<option value="' + esc(d) + '"' + (d === v.diam ? ' selected' : '') + '>' + esc(C.diamLabel(d)) + '</option>'; }).join('') + '</select></div></div>' +
      (tarjetas.length ? tarjetas.join('') : '<div class="card vacio">Sin datos con ese filtro</div>');
  }
  function pedidosLista() { var o = {}; S.estado.pedidos.forEach(function (p) { o[p.pedido] = 1; }); return Object.keys(o).sort(function (x, y) { return String(y).localeCompare(String(x), undefined, { numeric: true }); }); }
  function vMovs() {
    var L = movimientos();
    return vFiltro() + '<div class="card"><div class="row2" style="justify-content:space-between"><h2 style="margin:0">Movimientos</h2><button class="btn chico sec" data-a="csv">Descargar CSV</button></div>' +
      '<div class="mfil"><label for="m-q">Filtrar por número de pedido</label><select id="m-q" data-f="mov.q"><option value="">Todos los pedidos</option>' + pedidosLista().map(function (n) { return '<option value="' + esc(n) + '"' + (String(S.mq || '') === String(n) ? ' selected' : '') + '>Pedido ' + esc(n) + '</option>'; }).join('') + '</select></div>' +
      (S.mq ? '<p class="peq mut">Mostrando todos los movimientos de las estructuras del pedido ' + esc(S.mq) + ' (sin límite de fechas).</p>' : '') +
      (L.length ? L.slice(0, 150).map(function (m) { return vMov(m, true); }).join('') : '<div class="vacio">Sin movimientos</div>') +
      (L.length > 150 ? '<p class="peq mut">Se muestran los 150 más recientes. El CSV trae todo.</p>' : '') +
      (!Api.remoto && esAdmin() ? '<div style="margin-top:14px"><button class="btn chico peligro" data-a="borrarLocal">Borrar datos de prueba de este navegador</button></div>' : '') + '</div>';
  }

  // ---------- Informe diario (PDF de armado por estructura) ----------
  function numVar(d) { var n = C.NUMERO[d]; return n || (d ? C.diamLabel(d) : ''); }
  function datosInforme(dia) {
    var fd = function (x) { return String(x.fecha || '').slice(0, 10); };
    var act = S.estado.salidas.filter(function (x) { return x.estado !== 'ANULADA'; });
    var arm = act.filter(function (x) { return fd(x) === dia && tp(x) === 'ARMADO'; });
    var sal = act.filter(function (x) { return fd(x) === dia && tp(x) === 'SALIDA'; });
    var calc = S.calc || C.calcular(S.estado), tot = function (e) { return (calc.porElem[e] || {}).in_p || 0; };
    var ini = {}, hoyEnt = { p: 0, kg: 0 };
    S.estado.entradas.forEach(function (e) {
      var f = fd(e);
      if (f < dia) { var o = ini[e.diametro] || (ini[e.diametro] = { p: 0, kg: 0 }); o.p += +e.cantidad || 0; o.kg += +e.kg || 0; }
      else if (f === dia) { hoyEnt.p += +e.cantidad || 0; hoyEnt.kg += +e.kg || 0; }
    });
    act.forEach(function (x) { if (tp(x) === 'SALIDA' && fd(x) < dia) { var o = ini[x.diametro] || (ini[x.diametro] = { p: 0, kg: 0 }); o.p -= +x.cantidad || 0; o.kg -= +x.kg || 0; } });
    var run = {}, runH = {}, orig = {}, M = { aSale: { p: 0, kg: 0 }, aPrev: { p: 0, kg: 0 }, dir: { p: 0, kg: 0 } };
    act.filter(function (x) { return fd(x) <= dia; }).sort(function (a, b) { return String(a.fecha) < String(b.fecha) ? -1 : String(a.fecha) > String(b.fecha) ? 1 : String(a.id) < String(b.id) ? -1 : 1; }).forEach(function (x) {
      var k = x.elemento + '|' + x.diametro + '|' + (x.marca || ''), c = +x.cantidad || 0;
      if (tp(x) === 'ARMADO') { run[k] = (run[k] || 0) + c; if (fd(x) === dia) runH[k] = (runH[k] || 0) + c; return; }
      var viejo = Math.max(0, (run[k] || 0) - (runH[k] || 0)), dOld = Math.min(viejo, c), dHoy = Math.min(runH[k] || 0, c - dOld), dir = c - dOld - dHoy;
      run[k] = (run[k] || 0) - dOld - dHoy; runH[k] = (runH[k] || 0) - dHoy;
      if (fd(x) === dia) {
        orig[x.id] = [dOld + dHoy, dir];
        var kp = c ? (+x.kg || 0) / c : 0;
        M.aSale.p += dHoy; M.aSale.kg += dHoy * kp; M.aPrev.p += dOld; M.aPrev.kg += dOld * kp; M.dir.p += dir; M.dir.kg += dir * kp;
      }
    });
    function agrupar(L, modo) {
      var G = {}, ord = [];
      L.forEach(function (x) {
        var c = +x.cantidad || 0, kgx = +x.kg || 0, o = orig[x.id] || [0, c], partes = modo ? [['Salió armado', o[0]], ['Salió directo', o[1]]] : [['Armado', c]];
        partes.forEach(function (pt) {
          if (!pt[1]) return;
          var k = x.elemento + '|' + x.diametro + '|' + pt[0];
          if (!G[k]) { G[k] = { e: x.elemento, d: x.diametro, est: pt[0], p: 0, kg: 0, fases: {}, us: {}, pos: {} }; ord.push(k); }
          var g = G[k]; g.p += pt[1]; g.kg += c ? kgx * pt[1] / c : 0;
          if (x.fase) g.fases[x.fase] = 1; if (x.usuario) g.us[x.usuario] = 1; if (x.marca) g.pos[x.marca] = 1;
        });
      });
      ord.sort(function (a, b) { var x = G[a], y = G[b]; return x.e < y.e ? -1 : x.e > y.e ? 1 : C.diamOrder(x.d) - C.diamOrder(y.d) || (x.est < y.est ? -1 : 1); });
      return ord.map(function (k) { var g = G[k]; g.pc = tot(g.e) ? 100 * g.p / tot(g.e) : 0; return g; });
    }
    var ks = Object.keys(ini).filter(function (k) { return ini[k].p > 0; }).sort(function (a, b) { return C.diamOrder(a) - C.diamOrder(b); });
    var nEst = {}; arm.forEach(function (x) { nEst[x.elemento] = 1; });
    var fin = C.calcular({ pedidos: S.estado.pedidos, entradas: S.estado.entradas.filter(function (e) { return fd(e) <= dia; }), salidas: S.estado.salidas.filter(function (x) { return fd(x) <= dia; }) });
    var pu = {}; S.estado.pedidos.forEach(function (p) { pu[p.loadId] = p; });
    var EG = {}, eord = [];
    S.estado.entradas.forEach(function (e) {
      if (fd(e) !== dia) return;
      var k = e.estructura + '|' + e.diametro;
      if (!EG[k]) { EG[k] = { e: e.estructura, d: e.diametro, est: 'Ingreso', p: 0, kg: 0, fases: {}, us: {}, pos: {}, ped: {}, nopc: true }; eord.push(k); }
      var g = EG[k]; g.p += +e.cantidad || 0; g.kg += +e.kg || 0; g.ped[e.pedido] = 1; var pp = pu[e.loadId]; if (pp && pp.usuario) g.us[pp.usuario] = 1;
    });
    eord.sort(function (a, b) { var x = EG[a], y = EG[b]; return x.e < y.e ? -1 : x.e > y.e ? 1 : C.diamOrder(x.d) - C.diamOrder(y.d); });
    var ini0 = C.calcular({ pedidos: S.estado.pedidos, entradas: S.estado.entradas.filter(function (e) { return fd(e) < dia; }), salidas: S.estado.salidas.filter(function (x) { return fd(x) < dia; }) });
    return {
      entG: eord.map(function (k) { return EG[k]; }), ini0: ini0, fin: fin, M: M, armP: arm.reduce(function (a, x) { return a + (+x.cantidad || 0); }, 0), dia: dia, ini: ini, ks: ks, hoyEnt: hoyEnt, armG: agrupar(arm, false), salG: agrupar(sal, true), nEst: Object.keys(nEst).length,
      kgArm: arm.reduce(function (a, x) { return a + (+x.kg || 0); }, 0), kgSal: sal.reduce(function (a, x) { return a + (+x.kg || 0); }, 0)
    };
  }
  function vInforme() {
    var dia = S.inf.d || hoyISO(), hasta = S.inf.h && S.inf.h >= dia ? S.inf.h : dia, nd = diasRango(dia, hasta).length, D = datosInforme(dia);
    return '<div class="card inf-ctl"><h2 style="margin-top:0">Informe</h2><div class="fgrid"><label class="f" style="margin:0">Desde<input type="date" max="' + hoyISO() + '" value="' + esc(dia) + '" data-f="inf.d"></label>' +
      '<label class="f" style="margin:0">Hasta<input type="date" max="' + hoyISO() + '" min="' + esc(dia) + '" value="' + esc(hasta) + '" data-f="inf.h"></label></div>' +
      (nd === 1 ? '<div class="inf-res"><div><b>' + D.nEst + '</b><small>estructuras armadas</small></div><div><b>' + kg(D.kgArm) + '</b><small>kg armados</small></div><div><b>' + kg(D.kgSal) + '</b><small>kg que salieron</small></div></div>'
        : '<div class="inf-res"><div><b>' + nd + '</b><small>días: una hoja de informe por cada día</small></div></div>') +
      '<button class="btn blk" data-a="bajarInforme">⬇️ Descargar informe (PDF)</button>' +
      '<button class="btn blk sec" data-a="bajarExcel" style="margin-top:8px">📊 Descargar datos en Excel</button>' +
      '<p class="peq mut">PDF: un día o un rango (máx. 31 días), una hoja por día, con el personal y las fotos de acero del Parte diario.<br>Excel: el saldo consolidado anterior al período y, después, las entradas y los movimientos del período.</p></div>';
  }
  function diasRango(d, h) {
    var L = [], x = new Date(d + 'T12:00:00'), y = new Date(h + 'T12:00:00');
    for (; x <= y && L.length < 40; x.setDate(x.getDate() + 1)) L.push(x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'));
    return L;
  }
  function descargarInforme() {
    var d = S.inf.d || hoyISO(), h = S.inf.h && S.inf.h >= d ? S.inf.h : d, dias = diasRango(d, h);
    if (dias.length > 31) { toast('Máximo 31 días por informe'); return; }
    var INFO = {}, k = 0;
    function sig() {
      if (k >= dias.length) { toast('Armando el PDF…'); setTimeout(function () { generarInforme(dias, INFO); }, 50); return; }
      toast('Preparando informe… día ' + (k + 1) + ' de ' + dias.length);
      Api.infoDia(S.ses, dias[k]).then(function (r) { INFO[dias[k]] = r && r.ok ? r : { personal: [], sinDatos: true }; k++; sig(); });
    }
    sig();
  }
  function generarInforme(dias, INFO) {
    var dia0 = dias[0], dia1 = dias[dias.length - 1];
    var P = new MiniPdf('Parte diario de producción - Taller de acero ' + (dia0 === dia1 ? dia0 : dia0 + ' a ' + dia1));
    var M = 36, AN = 523, FIN = 800, y = 0, VERDE = [0.043, 0.42, 0.227], CLARO = [0.91, 0.945, 0.925], BL = [1, 1, 1];
    var resp = S.ses ? S.ses.nombre : '';
    function pagina() { P.nueva(); y = M; }
    function banda(t) { P.rect(M, y, AN, 17, VERDE); P.texto(M + AN / 2 - P.ancho(t, 9, true) / 2, y + 12, t, 9, true, BL); y += 17; }
    function celda(x, w, h, lineas, o) {
      o = o || {}; P.rect(x, y, w, h, o.fill, [0, 0, 0]);
      var yy = y + 3 + (o.size || 8.5), n = 0;
      lineas.forEach(function (ln) {
        var sz = ln.size || o.size || 8.5, tx = M, ax = P.ancho(ln.t, sz, ln.b);
        tx = o.al === 'c' ? x + w / 2 - ax / 2 : o.al === 'r' ? x + w - 3 - ax : x + 3;
        P.texto(tx, yy + n, ln.t, sz, ln.b, ln.c); n += sz + 2.2;
      });
    }
    function alto(lineas, size) { return Math.max(16, lineas.reduce(function (a, l) { return a + (l.size || size || 8.5) + 2.2; }, 0) + 5); }
    function cuerpo(dia, PER) {
    var D = datosInforme(dia), d = dia.split('-');
    pagina();
    P.rect(M, y, AN, 34, VERDE);
    var t1 = 'PARTE DIARIO DE PRODUCCIÓN · TALLER DE ACERO'; P.texto(M + AN / 2 - P.ancho(t1, 12, true) / 2, y + 15, t1, 12, true, BL);
    var t2 = CFG.TITULO || 'Almacén de aceros'; P.texto(M + AN / 2 - P.ancho(t2, 8) / 2, y + 28, t2, 8, false, BL); y += 34;
    // fila de datos
    var meta = [['FECHA', d[2] + '/' + d[1] + '/' + d[0]], ['ESTRUCTURAS ARMADAS', String(D.nEst)], ['ARMADO', kg(D.kgArm) + ' kg'], ['SALIÓ', kg(D.kgSal) + ' kg']], mw = [110, 150, 130, 133], mx = M;
    meta.forEach(function (m, i) { P.rect(mx, y, mw[i], 22, CLARO, [0, 0, 0]); P.texto(mx + 4, y + 8, m[0], 6.5, true); P.texto(mx + 4, y + 18, m[1], 9.5, true); mx += mw[i]; });
    y += 22;
    y += 8;
    // personal del día: el mismo que se registró en el Parte diario
    var PW = [215, 170, 46, 46, 46], PT = ['Nombre', 'Cargo', 'Inicio', 'Fin', 'Horas'], pl = PER.personal || [];
    banda('PERSONAL DEL DÍA (OFICIALES Y AYUDANTES)');
    (function () { var x = M; PT.forEach(function (t, i) { celda(x, PW[i], 16, [{ t: t, b: true, size: 7.5 }], { fill: CLARO, al: i > 1 ? 'c' : 'l', size: 7.5 }); x += PW[i]; }); y += 16; })();
    if (!pl.length) { P.rect(M, y, AN, 18, null, [0, 0, 0]); P.texto(M + 6, y + 12, PER.sinDatos ? 'No se pudo consultar el Parte diario (sin conexión).' : 'No hay personal registrado en el Parte diario de este día.', 8.5); y += 18; }
    else pl.forEach(function (q) {
      if (y + 16 > FIN) pagina();
      var x = M;
      [q.nombre, q.cargo, q.inicio, q.fin, q.horas].forEach(function (t, i) { celda(x, PW[i], 16, [{ t: String(t || ''), size: 8, c: PER.previo ? [0.8, 0.1, 0.1] : undefined }], { al: i > 1 ? 'c' : 'l', size: 8 }); x += PW[i]; });
      y += 16;
    });
    if (pl.length) {
      var pf = PER.fechaParte ? PER.fechaParte.split('-').reverse().join('/') : '';
      P.texto(M, y + 10, 'Total personal: ' + pl.length + (PER.de ? ' · tomado del Parte diario de ' + PER.de : '') + (PER.previo ? ' · el Parte de este día aún no se llena: se muestra el del ' + pf : ''), 7.5, false, PER.previo ? [0.8, 0.1, 0.1] : [0.25, 0.25, 0.25]);
    }
    y += 20;
    // 1) almacén al iniciar
    function tabla4(titulo, primera, claves, mapa) {
      var W4 = [165, 52, 70, 52, 70, 52, 62];
      function cab4() { var x = M, T = [primera, 'Libre pzs', 'Libre kg', 'Armado pzs', 'Armado kg', 'Total pzs', 'Total kg']; T.forEach(function (t, i) { celda(x, W4[i], 16, [{ t: t, b: true, size: 7 }], { fill: CLARO, al: i ? 'c' : 'l', size: 7 }); x += W4[i]; }); y += 16; }
      if (y + 17 + 16 + 20 > FIN) pagina();
      banda(titulo); cab4();
      var T0 = { lib_p: 0, lib_kg: 0, arm_p: 0, arm_kg: 0, sal_p: 0, sal_kg: 0 };
      claves.forEach(function (k) {
        var q = mapa[k], ln = P.partir(k === '__' ? '' : (primera === '#Varilla' ? C.diamLabel(k) : k), W4[0] - 6, 8, false), h = Math.max(16, ln.length * 10.5 + 6);
        if (y + h > FIN) { pagina(); cab4(); }
        var vals = [q.lib_p, q.lib_kg, q.arm_p, q.arm_kg, q.sal_p, q.sal_kg], x = M;
        celda(x, W4[0], h, ln.map(function (t) { return { t: t, size: 8 }; }), { size: 8 }); x += W4[0];
        vals.forEach(function (v, i) { celda(x, W4[i + 1], h, [{ t: i % 2 ? kg(v) : n0(v), size: 8, b: i >= 4 }], { al: 'r', size: 8 }); x += W4[i + 1]; });
        y += h; Object.keys(T0).forEach(function (f) { T0[f] += q[f] || 0; });
      });
      if (y + 16 > FIN) { pagina(); cab4(); }
      var x2 = M; celda(x2, W4[0], 16, [{ t: 'TOTAL', b: true }], { fill: CLARO }); x2 += W4[0];
      [T0.lib_p, T0.lib_kg, T0.arm_p, T0.arm_kg, T0.sal_p, T0.sal_kg].forEach(function (v, i) { celda(x2, W4[i + 1], 16, [{ t: i % 2 ? kg(v) : n0(v), b: true, size: 8 }], { fill: CLARO, al: 'r' }); x2 += W4[i + 1]; });
      y += 16 + 10;
    }
    var F0 = D.ini0, k0 = Object.keys(F0.porDiam).filter(function (k) { return F0.porDiam[k].sal_p > 0; }).sort(function (a, b) { return C.diamOrder(a) - C.diamOrder(b); });
    if (k0.length) tabla4('1 · ACERO EN EL ALMACÉN AL INICIAR EL DÍA · POR VARILLA', '#Varilla', k0, F0.porDiam);
    else { banda('1 · ACERO EN EL ALMACÉN AL INICIAR EL DÍA'); P.rect(M, y, AN, 18, null, [0, 0, 0]); P.texto(M + 6, y + 12, 'No había acero en el almacén al iniciar el día.', 8.5); y += 28; }
    y += 8;
    // 2) y 3) tablas con filas que se ajustan
    var CW = [50, 208, 42, 36, 42, 65, 80], CT = ['Estado', 'Estructura', '#Varilla', 'Cant.', '% piezas', 'Kg', 'Responsable'];
    function cabecera() { var x = M; CT.forEach(function (t, i) { celda(x, CW[i], 16, [{ t: t, b: true, size: 7.5 }], { fill: CLARO, al: i === 1 || i === 6 ? 'l' : 'c', size: 7.5 }); x += CW[i]; }); y += 16; }
    function tabla(titulo, bloques, vacio) {
      if (y + 17 + 16 + 24 > FIN) pagina();
      banda(titulo); cabecera();
      if (!bloques.some(function (bl) { return bl.G.length; })) { P.rect(M, y, AN, 18, null, [0, 0, 0]); P.texto(M + 6, y + 12, vacio, 8.5); y += 28; return; }
      bloques.forEach(function (bl) {
        if (!bl.G.length) return;
        var tp_ = 0, tk = 0;
        bl.G.forEach(function (r) {
          var L1 = P.partir(r.e, CW[1] - 6, 8.5, true).map(function (t) { return { t: t, b: true }; });
          if (r.ped) P.partir('Pedido: ' + Object.keys(r.ped).join(', '), CW[1] - 6, 7).forEach(function (t) { L1.push({ t: t, size: 7, c: [0.2, 0.2, 0.2] }); });
          if (Object.keys(r.fases).length) P.partir('Fase: ' + Object.keys(r.fases).join(', '), CW[1] - 6, 7).forEach(function (t) { L1.push({ t: t, size: 7, c: [0.2, 0.2, 0.2] }); });
          var pos = Object.keys(r.pos).sort(cmpMarca).join(', ');
          if (pos) P.partir('Pos.: ' + pos, CW[1] - 6, 7).forEach(function (t) { L1.push({ t: t, size: 7, c: [0.2, 0.2, 0.2] }); });
          var Lr = P.partir(Object.keys(r.us).join(', '), CW[6] - 6, 8.5).map(function (t) { return { t: t }; });
          var Le = P.partir(r.est, CW[0] - 4, 8, true).map(function (t) { return { t: t, b: true, size: 8 }; });
          var h = Math.max(alto(L1), alto(Lr), alto(Le, 8));
          if (y + h > FIN) { pagina(); cabecera(); }
          var x = M;
          [[Le, 'c'], [L1, 'l'], [[{ t: numVar(r.d), b: true }], 'c'], [[{ t: n0(r.p) }], 'c'], [[{ t: r.nopc ? '' : fmtPct(r.pc) + '%' }], 'c'], [[{ t: kg(r.kg) }], 'r'], [Lr, 'l']].forEach(function (c, i) { celda(x, CW[i], h, c[0], { al: c[1] }); x += CW[i]; });
          y += h; tp_ += r.p; tk += r.kg;
        });
        if (y + 16 > FIN) { pagina(); cabecera(); }
        celda(M, CW[0] + CW[1] + CW[2], 16, [{ t: bl.total || 'TOTAL', b: true }], { fill: CLARO });
        celda(M + CW[0] + CW[1] + CW[2], CW[3], 16, [{ t: n0(tp_), b: true }], { fill: CLARO, al: 'c' });
        celda(M + CW[0] + CW[1] + CW[2] + CW[3], CW[4], 16, [], { fill: CLARO });
        celda(M + AN - CW[5] - CW[6], CW[5], 16, [{ t: kg(tk), b: true }], { fill: CLARO, al: 'r' });
        celda(M + AN - CW[6], CW[6], 16, [], { fill: CLARO });
        y += 16;
      });
      y += 10;
    }
    tabla('2 · PRODUCCIÓN DE ACERO DEL DÍA (ARMADO POR ESTRUCTURA)', [{ G: D.armG, total: 'TOTAL ARMADO' }], 'No se armó acero este día.');
    tabla('3 · INGRESOS Y SALIDAS DE ACERO DEL DÍA', [{ G: D.entG, total: 'TOTAL INGRESOS' }, { G: D.salG, total: 'TOTAL SALIDAS' }], 'No hubo ingresos ni salidas de acero este día.');
    // observaciones
    var Mx = D.M, obs = [];
    var sP = D.salG.reduce(function (a, r) { return a + r.p; }, 0), sK = D.salG.reduce(function (a, r) { return a + r.kg; }, 0), T0 = D.ini0.tot, T1 = D.fin.tot;
    obs.push('Balance del almacén: iniciaron ' + n0(T0.sal_p) + ' piezas (' + kg(T0.sal_kg) + ' kg) + ingresaron ' + n0(D.hoyEnt.p) + ' (' + kg(D.hoyEnt.kg) + ' kg) - salieron ' + n0(sP) + ' (' + kg(sK) + ' kg) = cierran ' + n0(T1.sal_p) + ' piezas (' + kg(T1.sal_kg) + ' kg).');
    if (D.armP) obs.push('Se armaron ' + kg(D.kgArm) + ' kg (' + n0(D.armP) + ' piezas). De ellos, ' + kg(Mx.aSale.kg) + ' kg (' + n0(Mx.aSale.p) + ' piezas) salieron del almacén y ' + kg(Math.max(0, D.kgArm - Mx.aSale.kg)) + ' kg (' + n0(D.armP - Mx.aSale.p) + ' piezas) siguen en el almacén como acero armado.');
    if (Mx.aPrev.p) obs.push('Además salieron ' + kg(Mx.aPrev.kg) + ' kg (' + n0(Mx.aPrev.p) + ' piezas) de acero armado en días anteriores.');
    if (Mx.dir.p) obs.push('Salieron directo, sin armar: ' + kg(Mx.dir.kg) + ' kg (' + n0(Mx.dir.p) + ' piezas).');
    obs.push(D.kgSal ? 'Total que salió del almacén en el día: ' + kg(D.kgSal) + ' kg.' : 'En el día no salió acero del almacén.');
    var oL = []; obs.forEach(function (t) { P.partir(t, AN - 22, 8.5).forEach(function (ln, i) { oL.push({ t: ln, pt: i === 0 }); }); });
    var oH = oL.length * 11 + 8;
    if (y + 17 + oH > FIN) pagina();
    banda('OBSERVACIONES DEL DÍA');
    P.rect(M, y, AN, oH, null, [0, 0, 0]);
    oL.forEach(function (l, i) { if (l.pt) P.texto(M + 6, y + 12 + i * 11, '•', 8.5, true); P.texto(M + 16, y + 12 + i * 11, l.t, 8.5); });
    y += oH + 10;
    // almacén actualizado al cierre
    var F = D.fin;
    var kd = Object.keys(F.porDiam).filter(function (k) { return F.porDiam[k].sal_p > 0; }).sort(function (a, b) { return C.diamOrder(a) - C.diamOrder(b); });
    var ke = Object.keys(F.porElem).filter(function (k) { return F.porElem[k].sal_p > 0; }).sort();
    if (kd.length) {
      tabla4('4 · ACERO EN EL ALMACÉN AL CIERRE DEL DÍA · POR VARILLA', '#Varilla', kd, F.porDiam);
      tabla4('5 · ACERO EN EL ALMACÉN AL CIERRE DEL DÍA · POR ESTRUCTURA', 'Estructura', ke, F.porElem);
    } else { banda('4 · ACERO EN EL ALMACÉN AL CIERRE DEL DÍA'); P.rect(M, y, AN, 18, null, [0, 0, 0]); P.texto(M + 6, y + 12, 'No queda acero en el almacén.', 8.5); y += 28; }
    // fotos del Parte diario relacionadas con acero
    var FT = (PER.fotos || []).filter(function (f) { return f && f.data; });
    if (FT.length) {
      if (y + 17 + 190 > FIN) pagina();
      banda('FOTOS DEL PARTE DIARIO RELACIONADAS CON ACERO');
      y += 6;
      FT.forEach(function (f, k) {
        var col = k % 2, cx = M + col * (AN / 2 + 3), cw = AN / 2 - 3;
        if (col === 0 && y + 180 > FIN) pagina();
        P.rect(cx, y, cw, 160, null, [0.6, 0.6, 0.6]);
        P.imagen(cx + 2, y + 2, cw - 4, 156, f.data);
        var cap = (f.caption || f.actividad || 'Foto del parte diario') + (f.usuario ? ' · ' + f.usuario : '');
        P.partir(cap, cw - 4, 7.5).slice(0, 2).forEach(function (t, i) { P.texto(cx + 2, y + 170 + i * 9, t, 7.5, false, [0.2, 0.2, 0.2]); });
        if (col === 1 || k === FT.length - 1) y += 192;
      });
    }
    if (y + 50 > FIN) pagina();
    y += 26; P.linea(M, y, M + 250, y); P.linea(M + 290, y, M + AN, y);
    P.texto(M, y + 11, 'Responsable: ' + resp, 8.5); P.texto(M + 290, y + 11, 'Firma', 8.5);
    }
    dias.forEach(function (dd) { cuerpo(dd, INFO[dd] || { personal: [], sinDatos: true }); });
    var gen = 'Generado ' + new Date().toLocaleString('es-CO') + '';
    P.pages.forEach(function (pg, i) {
      P.cur = pg; P.texto(M, 826, gen, 7, false, [0.35, 0.35, 0.35]);
      var h = 'Hoja ' + (i + 1) + ' de ' + P.pages.length; P.texto(M + AN - P.ancho(h, 7.5), 826, h, 7.5, true);
    });
    var blob = new Blob([P.salida()], { type: 'application/pdf' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'Informe_armado_' + (dia0 === dia1 ? dia0 : dia0 + '_a_' + dia1) + '.pdf';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    toast('Informe descargado');
  }

  var PAG = 15;
  function vPedidos() {
    if (!esAdmin()) return '<div class="card vacio">Solo el administrador ve los pedidos.</div>';
    var q = String(S.ped.q || '').trim().toLowerCase();
    var L = S.estado.pedidos.filter(function (p) {
      return !q || (String(p.pedido) + ' ' + p.estructura + ' ' + (p.archivo || '') + ' ' + (p.usuario || '')).toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0; });
    var tp2 = 0, tk = 0; L.forEach(function (p) { tp2 += p.piezas; tk += p.kg; });
    var pags = Math.max(1, Math.ceil(L.length / PAG)); if (S.ped.pag >= pags) S.ped.pag = pags - 1; if (S.ped.pag < 0) S.ped.pag = 0;
    var vis = L.slice(S.ped.pag * PAG, S.ped.pag * PAG + PAG);
    var h = '<div class="hero"><small>Pedidos' + (q ? ' que coinciden' : ' cargados') + '</small><b>' + n0(L.length) + (L.length === 1 ? ' pedido' : ' pedidos') + '</b><span>' + pz(tp2) + ' · ' + kg(tk) + ' kg</span></div>' +
      '<div class="card"><input id="p-q" type="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Buscar por pedido, estructura o archivo" value="' + esc(S.ped.q) + '" data-i="ped.q"></div>';
    if (!vis.length) return h + '<div class="card vacio">' + (S.estado.pedidos.length ? 'Ningún pedido coincide con “' + esc(S.ped.q) + '”.' : 'Aún no hay pedidos cargados.') + '</div>';
    h += vis.map(function (p) {
      var x = S.calc.porElem[p.estructura] || { lib_p: 0, arm_p: 0, out_p: 0 };
      return '<div class="pd"><div class="pd-h"><b>Pedido ' + esc(p.pedido) + '</b><span>' + fechaDia(p.fecha) + '</span></div><div class="pd-e">' + esc(p.estructura) + (p.descripcion ? '<em>' + esc(p.descripcion) + '</em>' : '') + '</div>' +
        '<div class="pd-m"><span><b>' + n0(p.piezas) + '</b> piezas</span><span><b>' + kg(p.kg) + '</b> kg</span><span>' + esc(p.usuario) + '</span></div>' +
        '<div class="acc"><button class="btn chico sec" data-a="dli" data-v="' + esc(p.loadId) + '" style="margin-top:8px">⬇ Descargar DLI</button> <button class="btn chico sec" data-a="anularCarga" data-v="' + esc(p.loadId) + '" style="margin-top:8px">🗑 Dar de baja</button></div>' +
        '<div class="pd-s"><span class="lib">✅ ' + n0(x.lib_p) + ' libres</span><span class="arm">🔧 ' + n0(x.arm_p) + ' armadas</span><span class="out">🚚 ' + n0(x.out_p) + ' salieron</span></div></div>';
    }).join('');
    if (pags > 1) h += '<div class="pag"><button class="btn sec" data-a="pagPed" data-v="-1"' + (S.ped.pag <= 0 ? ' disabled' : '') + '>← Anterior</button><span>Página ' + (S.ped.pag + 1) + ' de ' + pags + '</span><button class="btn sec" data-a="pagPed" data-v="1"' + (S.ped.pag >= pags - 1 ? ' disabled' : '') + '>Siguiente →</button></div>';
    return h;
  }

  function resumenDiam(parsed) {
    var por = {};
    parsed.rows.forEach(function (r) { var x = por[r.diametro] || (por[r.diametro] = { p: 0, kg: 0 }); x.p += r.cantidad; x.kg += r.kg; });
    return por;
  }
  function vCargar() {
    if (!esAdmin()) return '<div class="card vacio">Solo el administrador puede cargar un DLI.</div>';
    var h = '<div class="card"><h2>Cargar archivos DLI</h2><p class="mut" style="margin-top:0">Seleccione uno o varios .dli (o el PDF de la cartilla). Cada uno se registra con su número de pedido y suma al inventario las piezas con cantidad mayor que cero.</p>' +
      '<label class="btn" for="dli-file">Elegir archivos .dli o PDF</label><input id="dli-file" type="file" accept=".dli,.pdf,application/pdf" multiple style="display:none"></div>';
    S.cargas.forEach(function (c, i) {
      var p = c.parsed, por = resumenDiam(p), ya = S.estado.pedidos.filter(function (x) { var b = function (t) { return String(t || '').replace(/\.(dli|pdf)$/i, '').trim().toLowerCase(); }; return x.estructura === p.nombre || (p.archivo && b(x.archivo) === b(p.archivo)); });
      h += '<div class="card"><h3>' + esc(p.nombre) + (p.descripcion ? '<span class="tag">' + esc(p.descripcion) + '</span>' : '') + '</h3>' +
        '<div class="peq mut">' + esc(p.archivo) + ' · ' + p.rows.length + ' filas · ' + n0(p.totalPiezas) + ' piezas · ' + kg(p.totalKg) + ' kg</div>';
      p.avisos.forEach(function (a) { h += '<div class="aviso">⚠ ' + esc(a) + '</div>'; });
      if (c.pedirPdf) h += '<div class="error"><b>No pude leer este DLI con seguridad.</b> Para no equivocarnos, seleccione el <b>PDF de la cartilla</b> (el listado, sin -General ni -Resumen).<div style="margin-top:8px"><label class="btn" for="pdf-' + i + '">Elegir el PDF de la cartilla</label><input id="pdf-' + i + '" data-pdfpara="' + i + '" type="file" accept=".pdf,application/pdf" style="display:none"></div></div>';
      if (ya.length) h += '<div class="error"><b>🚫 Este DLI ya fue cargado</b> (pedido ' + ya.map(function (x) { return esc(x.pedido); }).join(', ') + '). No se puede guardar de nuevo, ni con otro número de pedido.</div>';
      h += '<div class="tw"><table><thead><tr><th>Diámetro</th><th class="n">Piezas</th><th class="n">Kg</th></tr></thead><tbody>' +
        Object.keys(por).sort(function (a, b) { return C.diamOrder(a) - C.diamOrder(b); }).map(function (d) { return '<tr><td>' + esc(C.diamLabel(d)) + '</td><td class="n">' + n0(por[d].p) + '</td><td class="n">' + kg(por[d].kg) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      var pend = [];
      if (pend.length) {
        h += '<div class="aviso"><b>Falta el largo de ' + pend.length + ' marca(s).</b> Escríbalo para poder registrar:</div><div class="tw"><table><tbody>' +
          pend.map(function (o) { return '<tr><td>Marca ' + esc(o.r.marca) + '</td><td>' + esc(o.r.cantidad) + ' pzs · ' + esc(o.r.forma) + '</td><td class="n"><input class="mini" type="number" step="0.01" min="0" placeholder="m" data-largo="' + i + ':' + o.j + '"></td></tr>'; }).join('') + '</tbody></table></div>';
      }
      h += '<details><summary>Ver las ' + p.rows.length + ' filas</summary><div class="tw"><table><thead><tr><th>Marca</th><th class="n">Cant.</th><th>Diám.</th><th class="n">Largo m</th><th class="n">Kg</th></tr></thead><tbody>' +
        p.rows.map(function (r) { return '<tr><td>' + esc(r.marca) + '</td><td class="n">' + r.cantidad + '</td><td>' + esc(C.diamLabel(r.diametro)) + '</td><td class="n">' + (r.largo ? kg(r.largo) : '—') + '</td><td class="n">' + kg(r.kg) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
      h += '<div class="fld" style="margin-top:10px"><label>Nombre de la estructura</label><input type="text" maxlength="80" value="' + esc(p.nombre) + '" data-i="carga.' + i + '.nombre"><div class="peq mut">Si es un complemento de otra estructura ya cargada, cámbiele el nombre (ej. «CAISSON AT COMPLEMENTO»).</div></div>';
      if (!ya.length) h += '<div class="fgrid"><div class="fld"><label>Número de pedido</label><input type="text" inputmode="numeric" placeholder="Ej. 203192" value="' + esc(c.pedido) + '" data-i="carga.' + i + '.pedido"></div>' +
        '<div class="fld"><label>Fecha en que llegó a obra</label><input type="date" max="' + hoyISO() + '" value="' + esc(c.llegada || hoyISO()) + '" data-i="carga.' + i + '.llegada"></div></div>' +
        '<div class="fld"><label>¿Para cuántas estructuras es esta cartilla?</label><input type="text" inputmode="numeric" placeholder="1" value="' + esc(c.nEst) + '" data-i="carga.' + i + '.nest"><div class="peq mut">Los kilos y cantidades de la cartilla son el total de esas estructuras (ej. 10 pilotes). Después podrá registrar el armado de 1 estructura a la vez.</div></div>';
      if (c.err && !ya.length) h += '<div class="error">' + esc(c.err) + '</div>';
      h += '<div class="row2" style="margin-top:12px">' + (ya.length ? '' : '<button class="btn" data-a="registrarCarga" data-v="' + i + '">Registrar en inventario</button>') + '<button class="btn sec" data-a="quitarCarga" data-v="' + i + '">Quitar</button></div></div>';
    });
    return h;
  }

  function vista() {
    if (!S.cargado) return vCargando();
    switch (S.tab) {
      case 'salida': return vSalida();
      case 'inv': return vInv();
      case 'mov': return vMovs();
      case 'cargar': return vCargar();
      case 'ped': return vPedidos();
      case 'inf': return vInforme();
      default: return MODO === 'salidas' ? vSalida() : vPanel();
    }
  }

  function render() {
    var app = $('app');
    if (!S.ses) { app.innerHTML = S.auto ? '<main>' + vCargando() + '</main>' : vLogin(); return; }
    S.calc = C.calcular(S.estado);
    var fo = S.focus; S.focus = '';
    // Conservar lo que el usuario estaba viendo: posición vertical, barra de pestañas y filtros desplazados.
    var y0 = window.pageYOffset, h0 = app.offsetHeight, sx = {};
    app.style.minHeight = h0 + 'px';
    Array.prototype.forEach.call(app.querySelectorAll('.tabs,.fch'), function (e, i) { sx[e.className + i] = e.scrollLeft; });
    app.innerHTML = '<div class="cab">' + vTop() + vTabs() + '</div>' + vBandas() + '<main>' + vista() + '</main>' + (EMB ? '' : '<div class="pie">Acero · ' + (MODO === 'salidas' ? 'Salidas' : 'Panel de control') + '</div>');
    if (fo && $(fo)) { var el = $(fo); el.focus(); try { el.select(); } catch (e) { } }
    Array.prototype.forEach.call(app.querySelectorAll('.tabs,.fch'), function (e, i) { if (sx[e.className + i] != null) e.scrollLeft = sx[e.className + i]; });
    var on = app.querySelector('.tabs .on'); if (on && on.parentNode.scrollWidth > on.parentNode.clientWidth) { var pr = on.parentNode, l = on.offsetLeft, r = l + on.offsetWidth; if (l < pr.scrollLeft || r > pr.scrollLeft + pr.clientWidth) pr.scrollLeft = l - 12; }
    if (window.pageYOffset !== y0) window.scrollTo(0, y0);
    setTimeout(function () { app.style.minHeight = ''; }, 400);
  }

  // ---------- Acciones ----------
  function cargarEstado() {
    return Api.estado(S.ses).then(function (r) {
      if (!r.ok) {
        if (r.error === 'Llave no válida') { Api.salir(); S.ses = null; S.loginErr = 'La llave ya no es válida. Ingresa de nuevo.'; }
        else toast(r.error);
        S.cargado = true; render(); return;
      }
      S.estado = r.estado; S.offline = !!r.offline; S.cargado = true; render();
    });
  }
  function enviarCola() {
    if (S.enviando || !Api.remoto || !S.ses) return Promise.resolve();
    S.enviando = true; render();
    return Api.flush(S.ses).then(function (r) {
      S.enviando = false;
      if (r.enviadas) { toast(r.enviadas + ' salida(s) enviadas'); return cargarEstado(); }
      render();
    }).catch(function () { S.enviando = false; });
  }

  // pdf.js se carga solo cuando hace falta (el archivo queda guardado para uso sin señal)
  function cargarPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise(function (ok, no) {
      var sc = document.createElement('script'); sc.src = 'vendor/pdf.min.js';
      sc.onload = function () { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; ok(window.pdfjsLib); } catch (e) { no(e); } };
      sc.onerror = function () { no(new Error('sin pdf.js')); }; document.head.appendChild(sc);
    });
  }
  function leerPdf(buf, nombre) {
    return cargarPdfJs().then(function (lib) { return lib.getDocument({ data: new Uint8Array(buf.slice ? buf.slice(0) : buf) }).promise; }).then(function (doc) {
      var pgs = [], seq = Promise.resolve();
      for (var i = 1; i <= doc.numPages; i++) (function (n) { seq = seq.then(function () { return doc.getPage(n); }).then(function (pg) { return pg.getTextContent(); }).then(function (t) { pgs.push(t.items.map(function (x) { return { s: x.str, x: x.transform[4], y: x.transform[5] }; })); }); })(i);
      return seq.then(function () { return C.parsePDF(pgs, nombre); });
    });
  }
  function b64De(buf) { var bin = '', u8 = new Uint8Array(buf); for (var k = 0; k < u8.length; k += 8192) bin += String.fromCharCode.apply(null, u8.subarray(k, k + 8192)); return btoa(bin); }
  // Un DLI "falla" si no se entiende con seguridad: entonces se pide el PDF de la cartilla
  function dliFalla(p) {
    if (!p.rows.length || (p.errores && p.errores.length)) return true;
    if (p.rows.some(function (r) { return !r.largo || !r.peso; })) return true;
    return !!(p.kgDLI && Math.abs(p.totalKg - p.kgDLI) / p.kgDLI > 0.05);
  }
  function leerArchivos(files) {
    var lista = Array.prototype.slice.call(files);
    return lista.reduce(function (p, f) {
      return p.then(function () { return f.arrayBuffer(); }).then(function (buf) {
        if (/\.pdf$/i.test(f.name)) {
          return leerPdf(buf, f.name).then(function (parsed) { S.cargas.push({ parsed: parsed, b64: b64De(buf), pedido: '', llegada: hoyISO(), nEst: '1', err: '' }); })
            .catch(function () { toast('No se pudo leer el PDF ' + f.name + '. Sin señal por primera vez, o el archivo no es el listado.'); });
        }
        var parsed = C.parseDLI(new Uint8Array(buf), f.name);
        S.cargas.push({ parsed: parsed, b64: b64De(buf), pedido: '', llegada: hoyISO(), nEst: '1', err: '', pedirPdf: dliFalla(parsed) });
      }).catch(function () { toast('No se pudo leer ' + f.name); });
    }, Promise.resolve()).then(render);
  }
  function usarPdf(i, file) {
    var c = S.cargas[i]; if (!c || !file) return Promise.resolve();
    return file.arrayBuffer().then(function (buf) { return leerPdf(buf, file.name).then(function (p) {
      if (!p.rows.length || p.errores.length) { c.err = 'El PDF tampoco se pudo leer: ' + (p.errores[0] || 'no trae piezas') + ' Envíeme el archivo para ajustar el lector.'; return; }
      var nom = c.parsed.nombre; p.nombre = nom && !/^\s*$/.test(nom) ? nom : p.nombre;
      c.parsed = p; c.b64 = b64De(buf); c.pedirPdf = false; c.err = '';
    }); }).catch(function () { c.err = 'No se pudo leer el PDF.'; }).then(render);
  }

  function registrarCarga(i) {
    var c = S.cargas[i]; if (!c) return;
    var p = c.parsed;
    c.err = '';
    if (!String(c.pedido).trim()) c.err = 'Escriba el número de pedido.';
    else if (!/^\d{4}-\d\d-\d\d$/.test(c.llegada || '') || c.llegada > hoyISO()) c.err = 'Elija la fecha en que llegó el pedido a obra (no puede ser futura).';
    else if (c.pedirPdf) c.err = 'Falta el PDF de la cartilla: este DLI no se pudo leer con seguridad.';
    else if (!p.rows.length) c.err = 'El archivo no trae piezas.';
    else if (p.errores && p.errores.length) c.err = 'No se puede registrar: hay ' + p.errores.length + ' fila(s) del archivo que no se entendieron (ver avisos arriba). Envíe el archivo para ajustar el lector.';
    else if (!String(p.nombre).trim()) c.err = 'Escriba el nombre de la estructura.';
    else {
      var mal = p.rows.filter(function (r) { return !r.largo || !r.peso; })[0];
      if (mal) c.err = 'Complete la marca ' + mal.marca + ' (falta largo o peso del diámetro ' + mal.diametro + ').';
    }
    if (!c.err) {
      var baseArch = function (t) { return String(t || '').replace(/\.(dli|pdf)$/i, '').trim().toLowerCase(); };
      var rep = S.estado.pedidos.filter(function (x) { return x.estructura === p.nombre || (p.archivo && baseArch(x.archivo) === baseArch(p.archivo)); })[0];
      if (!rep) rep = S.cargas.filter(function (x, j) { return j !== i && (x.parsed.nombre === p.nombre || baseArch(x.parsed.archivo) === baseArch(p.archivo)); })[0] ? { pedido: 'en esta misma lista' } : null;
      if (rep) c.err = 'Este DLI ya fue cargado (' + p.nombre + ', pedido ' + rep.pedido + '). No se puede guardar de nuevo, ni con otro número de pedido.';
    }
    if (c.err) { render(); return; }
    Api.cargarDLI(S.ses, p, c.pedido, c.llegada, c.b64, Math.max(1, parseInt(c.nEst, 10) || 1)).then(function (r) {
      if (!r.ok) { c.err = /sin conexi/i.test(r.error || '') ? 'Sin señal: este DLI NO se ha cargado todavía. Se queda aquí en pantalla; cuando tengas señal vuelve a pulsar Guardar.' : r.error; render(); return; }
      S.cargas.splice(i, 1);
      toast('Cargado: pedido ' + String(c.pedido).trim() + ' · ' + p.nombre);
      S.tab = 'panel';
      return cargarEstado();
    });
  }

  function registrarSalida() {
    var s = S.sal, lista = s.items.slice(), actual = null, tipoReg = s.tipo === 'ARMADO' ? 'ARMADO' : 'SALIDA';
    S.tipo2 = tipoReg;
    if (!lista.length) { s.err = s.modo === 'pct' ? 'Escriba el porcentaje de avance.' : 'Elija al menos una pieza.'; s.msg = ''; render(); return; }
    if (s.modo === 'pos' && !String(s.fase).trim()) { s.err = 'Escriba la fase.'; s.msg = ''; render(); return; }
    var pctV = s.modo === 'pct' ? (parseFloat(String(s.pct).replace(',', '.')) || 0) : 0, elemSel = s.elem;
    var llegaA100 = s.modo === 'pct' && tipoReg === 'SALIDA' && pctAcum(elemSel) + pctV >= 100 - 1e-9;
    var fch = /^\d{4}-\d\d-\d\d$/.test(s.fecha) ? s.fecha : hoyISO();
    if (fch > hoyISO()) { s.err = 'La fecha no puede ser futura.'; s.msg = ''; render(); return; }
    // El acero tiene que existir en la fecha elegida (no se arma ni se saca lo que aún no había llegado).
    var fdd = function (x) { return String(x.fecha || '').slice(0, 10); };
    var calcF = C.calcular({ pedidos: S.estado.pedidos, entradas: S.estado.entradas.filter(function (e) { return fdd(e) <= fch; }), salidas: S.estado.salidas.filter(function (x) { return fdd(x) <= fch && x.estado !== 'ANULADA'; }) });
    for (var j = 0; j < lista.length; j++) {
      var errF = tipoReg === 'ARMADO' ? C.validarArmado(calcF, lista[j].elem, lista[j].diam, lista[j].cant, lista[j].marca) : C.validarSalida(calcF, lista[j].elem, lista[j].diam, lista[j].cant, lista[j].marca);
      if (errF) {
        var llego = S.estado.entradas.filter(function (e) { return e.estructura === lista[j].elem; }).map(fdd).sort()[0];
        s.err = 'El ' + fch.split('-').reverse().join('/') + ' no había ese acero en el almacén' + (llego ? ' (llegó el ' + llego.split('-').reverse().join('/') + ')' : '') + '. Posición ' + lista[j].pos + ': ' + errF; s.msg = ''; render(); return;
      }
    }
    for (var i = 0; i < lista.length; i++) {
      var err = S.tipo2 === 'ARMADO' ? C.validarArmado(S.calc, lista[i].elem, lista[i].diam, lista[i].cant, lista[i].marca) : C.validarSalida(S.calc, lista[i].elem, lista[i].diam, lista[i].cant, lista[i].marca);
      if (err) { s.err = 'Posición ' + lista[i].pos + ': ' + err; s.msg = ''; render(); return; }
    }
    if (!s.grupo) s.grupo = 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    var totKg = 0, totP = 0; lista.forEach(function (it) { totKg += it.kg; totP += it.cant; });
    var obs = s.obs;
    s.err = ''; s.msg = '';
    Api.salidaLote(S.ses, { grupo: s.grupo, items: lista.map(function (it) { return { diametro: it.diam, cantidad: it.cant, elemento: it.elem, marca: it.marca }; }), obs: obs, fecha: fch, hora: horaAhora(), fase: s.modo === 'pos' ? String(s.fase).trim() : '', modo: s.modo === 'pct' ? 'PCT' : 'POS', pct: pctV, tipo: tipoReg }).then(function (r) {
      if (!r.ok) { s.err = r.error; render(); return; }
      s.obs = ''; s.fecha = ''; s.hora = ''; s.err = ''; s.grupo = ''; s.n = 0; s.items = []; s.q = ''; s.pct = ''; s.elem = ''; s.diam = ''; s.marca = ''; s.pos = ''; s.cant = 1; s.fase = ''; s.fdiam = '';
      s.balElem = '';
      s.msg = (tipoReg === 'ARMADO' ? 'Armado guardado: ' : 'Salida guardada: ') + pz(totP) + ' (≈ ' + kg(totKg) + ' kg)' + (s.modo === 'pct' ? ' · ' + fmtPct(pctV) + ' % de avance' : '') + '.';
      window.scrollTo(0, 0);
      S.tab = 'panel'; try { sessionStorage.setItem('ac_tab_' + MODO, 'panel'); } catch (e) { } toast(s.msg); s.msg = '';
      if (Api.remoto) { S.estado = Api.conCola(S.estado); render(); return enviarCola(); }
      return cargarEstado();
    });
  }

  function descargarDLI(loadId) {
    var p = null; S.estado.pedidos.forEach(function (x) { if (String(x.loadId) === String(loadId)) p = x; });
    if (!p) return;
    if (p.archivoId && Api.remoto) {
      toast('Preparando el archivo DLI…');
      return Api.dliArchivo(S.ses, loadId).then(function (r) {
        if (!r || !r.ok) { toast((r && r.error) || 'No se pudo bajar el archivo original'); return descargarDLICsv(p, loadId); }
        var bin = atob(r.data), u8 = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u8], { type: 'application/octet-stream' })); a.download = r.nombre || ('pedido_' + p.pedido + '.dli');
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      }).catch(function () { toast('Sin conexión: no se pudo bajar el DLI'); });
    }
    descargarDLICsv(p, loadId);
  }
  function descargarDLICsv(p, loadId) {
    var q = function (v) { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var num = function (n) { return String(n == null ? '' : n).replace('.', ','); };
    var f = [['Pedido', 'Estructura', 'Descripcion', 'Posicion', 'Diametro', 'Cantidad', 'Largo_m', 'Kg_unit', 'Kg_total']];
    S.estado.entradas.forEach(function (e) { if (String(e.loadId) === String(loadId)) f.push([e.pedido, e.estructura, p.descripcion || '', e.marca, e.diametro, e.cantidad, num(e.largo), num(e.kgUnit), num(e.kg)]); });
    var blob = new Blob(['\ufeff' + f.map(function (r) { return r.map(q).join(';'); }).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'DLI_pedido_' + String(p.pedido).replace(/[^\w-]+/g, '_') + '_' + String(p.estructura).replace(/[^\w-]+/g, '_') + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function descargarExcel() {
    var d = S.inf.d || hoyISO(), h = S.inf.h && S.inf.h >= d ? S.inf.h : d, F = function (x) { return x.split('-').reverse().join('/'); };
    var fd = function (x) { return String(x.fecha || '').slice(0, 10); }, act = function (x) { return x.estado !== 'ANULADA'; };
    var ini = C.calcular({ pedidos: S.estado.pedidos, entradas: S.estado.entradas.filter(function (e) { return fd(e) < d; }), salidas: S.estado.salidas.filter(function (x) { return fd(x) < d && act(x); }) });
    var R = function (n) { return Math.round((n || 0) * 1000) / 1000; };
    // 1) Consolidado anterior al período
    var H1 = ['Estructura', 'Varilla', 'Llegó (pzs)', 'Llegó (kg)', 'Salió (pzs)', 'Salió (kg)', 'En almacén (pzs)', 'En almacén (kg)', 'Armadas (pzs)', 'Armadas (kg)', 'Libres (pzs)', 'Libres (kg)'];
    var s1 = [[{ v: 'Consolidado de acero ANTES del período (todo lo anterior al ' + F(d) + ')', s: 5 }], [{ v: 'Es el saldo con el que inicia el período ' + F(d) + ' a ' + F(h) + '.', s: 8 }], [], H1.map(function (t) { return { v: t, s: 1 }; })];
    var ks = Object.keys(ini.porElemDiam).sort(function (a, b) { var x = a.split('|'), y = b.split('|'); return x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : C.diamOrder(x[1]) - C.diamOrder(y[1]); }), T = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    ks.forEach(function (k) {
      var x = ini.porElemDiam[k], p = k.split('|'), v = [x.in_p, R(x.in_kg), x.out_p, R(x.out_kg), x.sal_p, R(x.sal_kg), x.arm_p, R(x.arm_kg), x.lib_p, R(x.lib_kg)];
      v.forEach(function (n, i) { T[i] += n; });
      s1.push([p[0], C.diamLabel(p[1])].concat(v.map(function (n, i) { return { v: n, s: i % 2 ? 3 : 4 }; })));
    });
    if (ks.length) s1.push([{ v: 'TOTAL', s: 2 }, ''].concat(T.map(function (n, i) { return { v: R(n), s: i % 2 ? 6 : 7 }; })));
    else s1.push(['Sin acero registrado antes de este período.']);
    // 2) Entradas del período
    var ped = {}; S.estado.pedidos.forEach(function (p) { ped[p.loadId] = p; });
    var E = S.estado.entradas.filter(function (e) { return fd(e) >= d && fd(e) <= h; }).sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : cmpMarca(a.marca, b.marca); });
    var s2 = [[{ v: 'Entradas de acero del ' + F(d) + ' al ' + F(h), s: 5 }], [], ['Fecha de llegada', 'Pedido', 'Estructura', 'Posición', 'Varilla', 'Cantidad', 'Largo (m)', 'Kg unitario', 'Kg total', 'Archivo DLI', 'Cargó'].map(function (t) { return { v: t, s: 1 }; })], tE = [0, 0];
    E.forEach(function (e) {
      var p = ped[e.loadId] || {}; tE[0] += e.cantidad; tE[1] += e.kg;
      s2.push([F(fd(e)), e.pedido, e.estructura, e.marca, C.diamLabel(e.diametro), { v: e.cantidad, s: 4 }, { v: R(e.largo), s: 3 }, { v: R(e.kgUnit), s: 3 }, { v: R(e.kg), s: 3 }, p.archivo || '', p.usuario || '']);
    });
    s2.push(E.length ? [{ v: 'TOTAL', s: 2 }, '', '', '', '', { v: tE[0], s: 7 }, '', '', { v: R(tE[1]), s: 6 }] : ['No hubo entradas en este período.']);
    // 3) Movimientos del período
    var M = S.estado.salidas.filter(function (x) { return fd(x) >= d && fd(x) <= h; }).sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : cmpMarca(a.marca, b.marca); });
    var s3 = [[{ v: 'Armados y salidas del ' + F(d) + ' al ' + F(h), s: 5 }], [{ v: 'Los movimientos ANULADOS aparecen marcados y no se suman en los totales.', s: 8 }], ['Fecha', 'Hora', 'Tipo', 'Estructura', 'Posición', 'Varilla', 'Cantidad', 'Kg', 'Fase', 'Avance %', 'Registró', 'Estado', 'Observación'].map(function (t) { return { v: t, s: 1 }; })], tA = [0, 0], tS = [0, 0];
    M.forEach(function (x) {
      var arm = tp(x) === 'ARMADO', ok = act(x);
      if (ok) { var t = arm ? tA : tS; t[0] += x.cantidad; t[1] += x.kg; }
      s3.push([F(fd(x)), String(x.fecha).slice(11, 16), arm ? 'Armado' : 'Salida', x.elemento, x.marca || '', C.diamLabel(x.diametro), { v: x.cantidad, s: 4 }, { v: R(x.kg), s: 3 }, x.fase || '', x.modo === 'PCT' ? { v: x.pct || 0, s: 3 } : '', x.usuario || '', ok ? 'Activo' : 'ANULADO', x.obs || '']);
    });
    if (M.length) { s3.push([{ v: 'TOTAL ARMADO', s: 2 }, '', '', '', '', '', { v: tA[0], s: 7 }, { v: R(tA[1]), s: 6 }]); s3.push([{ v: 'TOTAL SALIÓ', s: 2 }, '', '', '', '', '', { v: tS[0], s: 7 }, { v: R(tS[1]), s: 6 }]); }
    else s3.push(['No hubo armados ni salidas en este período.']);
    var bytes = MiniXlsx.construir([
      { name: 'Saldo anterior', rows: s1, widths: [30, 12, 13, 13, 13, 13, 15, 15, 13, 13, 13, 13], freeze: 4 },
      { name: 'Entradas', rows: s2, widths: [16, 11, 30, 11, 10, 11, 11, 12, 12, 40, 18], freeze: 3 },
      { name: 'Armados y salidas', rows: s3, widths: [12, 8, 10, 30, 11, 10, 11, 12, 10, 10, 18, 11, 30], freeze: 3 }
    ], 'Carlos Eduardo Bermúdez Castro');
    var blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Acero_' + (d === h ? d : d + '_a_' + h) + '.xlsx';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('Excel descargado');
  }
  function descargarCSV() {
    var q = function (v) { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var num = function (n) { return String(n == null ? '' : n).replace('.', ','); };
    var f = [['Tipo', 'Fecha', 'Pedido', 'Elemento', 'Posicion', 'Diametro', 'Cantidad', 'Largo_m', 'Kg', 'Usuario', 'Observacion', 'Estado']];
    var ped = {}; S.estado.pedidos.forEach(function (p) { ped[p.loadId] = p; });
    S.estado.entradas.forEach(function (e) { var p = ped[e.loadId] || {}; f.push(['ENTRADA', e.fecha, e.pedido, e.estructura, e.marca, e.diametro, e.cantidad, num(e.largo), num(e.kg), p.usuario || '', '', '']); });
    S.estado.salidas.forEach(function (s) { f.push([tp(s), s.fecha, '', s.elemento, s.marca, s.diametro, s.cantidad, '', num(s.kg), s.usuario, s.obs, s.estado]); });
    var blob = new Blob(['﻿' + f.map(function (r) { return r.map(q).join(';'); }).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'movimientos_aceros.csv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }


  // ---------- Eventos ----------
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-a]'); if (!el) return;
    var a = el.getAttribute('data-a'), v = el.getAttribute('data-v');
    switch (a) {
      case 'tipo': if (S.sal.tipo !== v) { S.sal.tipo = v; S.sal.items = []; S.sal.pct = ''; S.sal.err = ''; S.sal.msg = ''; S.sal.balElem = ''; S.sal.q = ''; } render(); break;
      case 'modo': if (S.sal.modo !== v) { S.sal.modo = v; S.sal.items = []; S.sal.pct = ''; S.sal.err = ''; S.sal.msg = ''; S.sal.balElem = ''; predefinir1(); } render(); break;
      case 'pctset': S.sal.pct = String(v); S.sal.msg = ''; aplicarPct(); render(); break;
      case 'cerrarBal': S.sal.balElem = ''; render(); break;
      case 'pagPed': S.ped.pag += +v; render(); window.scrollTo(0, 0); break;
      case 'per': S.per.k = v; render(); break;
      case 'tab': S.tab = v; try { sessionStorage.setItem('ac_tab_' + MODO, v); } catch (e) { } render(); break;
      case 'refrescar': cargarEstado().then(function () { toast('Actualizado'); }); break;
      case 'salir': Api.salir(); S.ses = null; S.loginErr = ''; render(); break;
      case 'todas': setCant(S.sal.elem, el.getAttribute('data-d'), v, 99999); render(); break;
      case 'quitar': S.sal.items.splice(+v, 1); S.sal.err = ''; render(); break;
      case 'sumar': sumarItem(S.sal.elem, el.getAttribute('data-d'), v, 1); render(); break;
      case 'restar': sumarItem(S.sal.elem, el.getAttribute('data-d'), v, -1); render(); break;
      case 'fdiam': S.sal.fdiam = v; render(); break;
      case 'vaciar': S.sal.items = []; S.sal.err = ''; render(); break;
      case 'registrarSalida': registrarSalida(); break;
      case 'invVista': S.inv.vista = v; render(); break;
      case 'registrarCarga': registrarCarga(+v); break;
      case 'quitarCarga': S.cargas.splice(+v, 1); render(); break;
      case 'csv': descargarCSV(); break;
      case 'bajarInforme': descargarInforme(); break;
      case 'bajarExcel': descargarExcel(); break;
      case 'dli': descargarDLI(v); break;
      case 'enviarCola': enviarCola(); break;
      case 'limpiarErrores': Api.limpiarErroresCola(); render(); break;
      case 'anularSalida':
        if (confirm('¿Anular esto? El acero vuelve a como estaba antes.')) {
          toast('Anulando…');
          Api.anularSalida(S.ses, String(v).split(',')).then(function (r) {
            toast(r.ok ? 'Anulado' : r.error);
            if (r.ok) { S.tab = MODO === 'salidas' ? 'inv' : 'panel'; window.scrollTo(0, 0); }
            return cargarEstado();
          });
        }
        break;
      case 'anularCarga': {
        var pc = S.estado.pedidos.filter(function (x) { return x.loadId === v; })[0]; if (!pc) break;
        var nm = S.estado.salidas.filter(function (x) { return x.estado !== 'ANULADA' && x.elemento === pc.estructura; }).length;
        if (nm) { S.avisoBaja = 'No se puede dar de baja el pedido ' + pc.pedido + ' (' + pc.estructura + '): ya tiene ' + nm + ' movimiento(s) de armado o salida asociados. Primero anule esos movimientos en la pestaña Movimientos.'; render(); window.scrollTo(0, 0); break; }
        if (confirm('¿Dar de baja el pedido ' + pc.pedido + ' (' + pc.estructura + ')? Se quitan sus piezas del inventario. Úselo si el DLI se cargó mal.')) Api.anularCarga(S.ses, v).then(function (r) { if (r.ok) toast('Pedido dado de baja'); else { S.avisoBaja = r.error; render(); } return cargarEstado(); });
        break;
      }
      case 'cerrarAviso': S.avisoBaja = ''; render(); break;
        break;
      case 'borrarLocal':
        if (confirm('¿Borrar TODOS los datos de prueba de este navegador?')) { Api.borrarLocal(); S.estado = { pedidos: [], entradas: [], salidas: [] }; render(); toast('Datos de prueba borrados'); }
        break;
    }
  });

  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.getAttribute('data-pdfpara') != null) { usarPdf(+t.getAttribute('data-pdfpara'), t.files[0]).then(function () { t.value = ''; }); return; }
    if (t.id === 'dli-file') { leerArchivos(t.files).then(function () { t.value = ''; }); return; }
    var f = t.getAttribute('data-f');
    if (/^carga\.\d+\.nombre$/.test(t.getAttribute('data-i') || '')) { var cn = S.cargas[+t.getAttribute('data-i').split('.')[1]]; if (cn) { cn.parsed.nombre = String(t.value).trim() || cn.parsed.nombre; cn.err = ''; render(); } return; }
    if (f === 'mov.q') { S.mq = t.value; render(); return; }
    if (f) {
      var p = f.split('.'); S[p[0]][p[1]] = t.value;
      if (f === 'sal.elem') { S.sal.q = ''; S.sal.fdiam = ''; S.sal.items = []; S.sal.pct = ''; S.sal.balElem = ''; S.sal.fase = ''; predefinir1(); }
      S.sal.err = ''; S.sal.msg = '';
      render(); return;
    }
    var dq = t.getAttribute('data-q');
    if (dq !== null) { var itq = S.sal.items[+dq]; if (itq) setCant(itq.elem, itq.diam, itq.marca, t.value); render(); return; }
    var lg = t.getAttribute('data-largo');
    if (lg) {
      var ij = lg.split(':'), c = S.cargas[+ij[0]], row = c.parsed.rows[+ij[1]], val = parseFloat(String(t.value).replace(',', '.'));
      if (val > 0) {
        row.largo = val; row.aviso = '';
        C.recalcular(c.parsed.rows);
        var tt = C.totales(c.parsed.rows); c.parsed.totalPiezas = tt.totalPiezas; c.parsed.totalKg = tt.totalKg;
        c.parsed.avisos = c.parsed.avisos.filter(function (x) { return x.indexOf('Marca ' + row.marca + ':') !== 0; });
        render();
      }
    }
  });

  document.addEventListener('input', function (ev) {
    var t = ev.target, i = t.getAttribute('data-i'); if (!i) return;
    if (i === 'sal.obs') S.sal.obs = t.value;
    else if (i === 'sal.q') { S.sal.q = t.value; S.focus = 's-q'; render(); var e3 = $('s-q'); if (e3) { try { e3.setSelectionRange(e3.value.length, e3.value.length); } catch (x) { } } }
    else if (i === 'ped.q') { S.ped.q = t.value; S.ped.pag = 0; S.focus = 'p-q'; render(); var e5 = $('p-q'); if (e5) { try { e5.setSelectionRange(e5.value.length, e5.value.length); } catch (x) { } } }
    else if (i === 'sal.fecha') S.sal.fecha = t.value;
    else if (i === 'mov.q') { S.mq = t.value; S.focus = 'm-q'; render(); var e6 = $('m-q'); if (e6) { try { e6.setSelectionRange(e6.value.length, e6.value.length); } catch (x) { } } }
    else if (i === 'sal.fase') S.sal.fase = t.value;
    else if (i === 'sal.pct') { S.sal.pct = t.value.replace(/[^0-9.,]/g, ''); S.sal.msg = ''; aplicarPct(); S.focus = 's-pct'; render(); var e4 = $('s-pct'); if (e4) { try { e4.setSelectionRange(e4.value.length, e4.value.length); } catch (x) { } } }
    else {
      var m0 = /^carga\.(\d+)\.nombre$/.exec(i); if (m0 && S.cargas[+m0[1]]) S.cargas[+m0[1]].parsed.nombre = t.value;
      var m = /^carga\.(\d+)\.pedido$/.exec(i), m2 = /^carga\.(\d+)\.llegada$/.exec(i);
      if (m && S.cargas[+m[1]]) S.cargas[+m[1]].pedido = t.value;
      if (m2 && S.cargas[+m2[1]]) S.cargas[+m2[1]].llegada = t.value;
      var m3 = /^carga\.(\d+)\.nest$/.exec(i); if (m3 && S.cargas[+m3[1]]) S.cargas[+m3[1]].nEst = t.value.replace(/\D/g, '');
    }
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter') return;
    if (ev.target.id === 's-q') { ev.preventDefault(); var qq = String(S.sal.q || '').trim().toLowerCase(), ex = piezasSalida(S.sal.elem).filter(function (p) { return p.marca.toLowerCase() === qq && p.disp > 0; }); if (ex.length === 1) { sumarItem(S.sal.elem, ex[0].diam, ex[0].marca, 1); S.sal.q = ''; S.focus = 's-q'; render(); } }
  });

  document.addEventListener('submit', function (ev) {
    if (ev.target.id !== 'f-login') return;
    ev.preventDefault();
    var pin = $('l-pin').value;
    Api.login(pin).then(function (r) {
      if (!r.ok) { S.loginErr = r.error; render(); return; }
      if (MODO === 'dashboard' && r.ses.rol !== 'admin') { Api.salir(); S.loginErr = 'Este panel es solo para administradores. Usa la app de Acero.'; render(); return; }
      S.ses = r.ses; S.loginErr = ''; S.tab = MODO === 'salidas' ? 'salida' : 'panel';
      render(); enviarCola().then(cargarEstado);
    });
  });

  window.addEventListener('online', enviarCola);
  // Pide al navegador que NO borre los datos guardados en el celular (cola sin enviar) aunque falte espacio.
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
  setInterval(function () { if (S.ses && Api.pendientes()) enviarCola(); }, 30000);

  // ---------- Modo incrustado en el Dashboard: periodo y actualización los manda el Dashboard ----------
  if (EMB) {
    document.body.classList.add('emb');
    var avisaAlto = function () { try { parent.postMessage({ t: 'acero-alto', h: Math.ceil(document.documentElement.getBoundingClientRect().height) }, location.origin); } catch (e) { } };
    if (window.ResizeObserver) new ResizeObserver(avisaAlto).observe(document.body);
    window.addEventListener('message', function (ev) {
      if (ev.origin !== location.origin || !ev.data || ev.data.t !== 'per') return;
      S.per = { k: 'rango', d: ev.data.d || '', h: ev.data.h || '' };
      if (/^(panel|inv|mov|ped|inf)$/.test(ev.data.tab || '')) S.tab = ev.data.tab;
      if (ev.data.r && S.ses) cargarEstado(); else render();
    });
    try { parent.postMessage({ t: 'acero-listo' }, location.origin); } catch (e) { }
  }

  // ---------- Inicio ----------
  try { var tt0 = sessionStorage.getItem('ac_tab_' + MODO); if (/^(panel|inv|mov|ped|inf|salida|cargar)$/.test(tt0 || '')) S.tab = tt0; } catch (e) { }
  S.ses = Api.sesion();
  if (S.ses && MODO === 'dashboard' && S.ses.rol !== 'admin') { Api.salir(); S.ses = null; S.loginErr = 'Este panel es solo para administradores. Usa la app de Acero.'; }
  if (S.ses) { render(); enviarCola().then(cargarEstado); }
  else {
    render();
    // el panel entra solo con la llave de administrador del Dashboard (misma sesión)
    var l0 = ''; try { l0 = MODO === 'dashboard' ? (localStorage.getItem('adm') || sessionStorage.getItem('adm') || '') : ''; } catch (e) { }
    if (l0) { S.auto = true; render(); }
    if (l0) Api.login(l0).then(function (r) {
      if (!r.ok || r.ses.rol !== 'admin') { Api.salir(); S.auto = false; render(); return; }
      S.ses = r.ses; S.loginErr = ''; render(); enviarCola().then(cargarEstado);
    }).catch(function () { S.auto = false; S.loginErr = 'No se pudo conectar.'; render(); });
  }
})();
