/* Acero — pantallas de obra (rediseño): INICIO con tres botones y rutas guiadas, una pregunta por pantalla.
 *   📥 LLEGÓ  → ¿para qué? (estructura / stock) → ¿cuál? → ¿todo o una parte? → ¿cuándo? → listo
 *   🔧 ARMAR  → ¿qué estructura? → avance (unidades · completo / % / posiciones) · usar stock · cerrar y contar sobrante
 *   🚚 SALIÓ  → ¿qué sale? (estructura armada / stock) → ¿todo o una parte? → ¿para dónde? → listo
 * Autor: Carlos Eduardo Bermúdez Castro */
(function () {
  'use strict';
  var X = null;
  var STK = ['ACERO RECTO', 'ACERO FIGURADO'], NOM = { 'ACERO RECTO': 'Stock estándar', 'ACERO FIGURADO': 'Stock figurado' };
  var SIS = /^(SOBRANTE|TRASLADO|AJUSTE|STOCK)$/, OBS_SIS = /^(Sobrante del armado|Pas[oó] a |Cierre al 100|Ajuste de conteo|Armado con acero)/, OBS_SOB = /^(Sobrante del armado|Cierre al 100)/;

  // ------------------------------------------------------------------ utilidades
  function esc(s) { return X.esc(s); }
  function enc(s) { return encodeURIComponent(s); }
  function pz(n) { return X.pz(n); }
  function K(n) { return X.kg(n) + ' kg'; }
  function esStk(e) { return STK.indexOf(e) >= 0; }
  function calc() { return X.S.calc || X.C.calcular(X.S.estado); }
  function nuevoId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function W() { return X.S.w || (X.S.w = { r: '', p: '', hist: [] }); }
  function ruta(r, p) { X.S.w = { r: r, p: p, hist: [], vals: {}, kgs: {}, err: '', busy: false }; X.S.tab = 'ini'; X.render(); window.scrollTo(0, 0); }
  function ir(p) { var w = W(); w.hist.push(w.p); w.p = p; w.err = ''; X.render(); window.scrollTo(0, 0); }
  function inicio() { X.S.w = { r: '', p: '', hist: [] }; X.render(); window.scrollTo(0, 0); }
  function fallo(msg) { var w = W(); w.busy = false; w.err = msg || 'No se pudo guardar. Intenta de nuevo.'; X.render(); }
  function listo(msg, sub, extra) { var w = W(), r = w.r, e = w.elem; X.S.w = { r: r, p: 'ok', hist: [], okMsg: msg, okSub: sub || '', elem: e, extra: extra || '' }; X.render(); window.scrollTo(0, 0); return X.cargarEstado(); }
  function grande(a, v, ico, tit, sub, cls) {
    return '<button type="button" class="bg ' + (cls || '') + '" data-a="' + a + '"' + (v != null ? ' data-v="' + esc(v) + '"' : '') + '><span class="bg-i">' + ico + '</span><b>' + tit + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</button>';
  }
  function opcion(a, v, ico, tit, sub) { // fila grande para escoger de una lista
    return '<button type="button" class="op" data-a="' + a + '" data-v="' + esc(v) + '"><span class="op-i">' + ico + '</span><span class="op-t"><b>' + tit + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span><span class="op-f">›</span></button>';
  }
  function stp(key, val, max) {
    return '<span class="stp"><button type="button" data-a="ws" data-v="' + enc(key) + '|-1|' + max + '">−</button><b>' + val + '</b><button type="button" data-a="ws" data-v="' + enc(key) + '|1|' + max + '">+</button></span>';
  }
  function cab(tit, sub) {
    var w = W(), RT = { llego: '📥 Llegó acero', armar: '🔧 Armar', salio: '🚚 Salió acero' };
    return '<div class="wz-h"><button type="button" class="btn sec" data-a="wBack">← Atrás</button><b>' + RT[w.r] + '</b><button type="button" class="btn sec chico" data-a="wHome">🏠</button></div>' +
      '<div class="card wz"><h2>' + tit + '</h2>' + (sub ? '<div class="peq mut" style="margin-bottom:8px">' + sub + '</div>' : '');
  }
  function pie() { var w = W(); return (w.err ? '<div class="error">' + esc(w.err) + '</div>' : '') + '</div>'; }
  function guardarBtn(a, txt) { var w = W(); return '<button type="button" class="btn blk ok gr" data-a="' + a + '"' + (w.busy ? ' disabled' : '') + '>' + (w.busy ? 'Guardando…' : txt) + '</button>'; }

  // ------------------------------------------------------------------ datos
  /** Unidades (cuántas estructuras iguales trae la cartilla). */
  function unidades(est) { var n = 0; X.S.estado.pedidos.forEach(function (p) { if (p.estructura === est && !SIS.test(String(p.pedido))) n += Math.max(1, +p.nEstructuras || 1); }); return n || 1; }
  /** Posiciones de una estructura o stock, con lo que hay libre, armado y el total de la cartilla. */
  function posiciones(elem) {
    var S = X.S, c = calc(), seen = {}, L = [], tot = {};
    (S.estado.cartilla || []).forEach(function (e) { if (e.estructura === elem) tot[e.diametro + '|' + e.marca] = (tot[e.diametro + '|' + e.marca] || 0) + e.cantidad; });
    S.estado.entradas.forEach(function (e) {
      if (e.estructura !== elem) return;
      var k = e.diametro + '|' + e.marca; if (seen[k]) return; seen[k] = 1;
      var m = c.porMarca[elem + '|' + e.diametro + '|' + e.marca] || {};
      L.push({ k: k, d: e.diametro, m: e.marca, largo: e.largo, lib: m.lib_p || 0, arm: m.arm_p || 0, sal: m.sal_p || 0, kgU: e.kgUnit, tot: tot[k] || m.in_p || 0, stock: /^S-/.test(e.marca) && e.pedido === 'STOCK' });
    });
    return L.sort(function (a, b) { return X.C.diamOrder(a.d) - X.C.diamOrder(b.d) || (a.largo - b.largo) || (a.m < b.m ? -1 : 1); });
  }
  function posTxt(p) { return '<b>' + esc(p.m) + '</b> · ' + esc(X.C.diamLabel(p.d)) + ' · ' + p.largo + ' m'; }
  /** Resumen de cada estructura: pedido, llegó, libre, armado, salió, sobrante y kilos tomados del stock. */
  function estructuras() {
    var S = X.S, c = calc(), seen = {}, L = [];
    S.estado.pedidos.forEach(function (p) {
      if (esStk(p.estructura) || seen[p.estructura]) return; seen[p.estructura] = 1;
      var n = p.estructura, x = c.porElem[n] || {}, cartKg = 0, recKg = 0, stockKg = 0, sobKg = 0, esCart = false;
      (S.estado.cartilla || []).forEach(function (e) { if (e.estructura === n) { esCart = true; cartKg += e.kg; recKg += e.recibida * e.kgUnit; } });
      S.estado.entradas.forEach(function (e) { if (e.estructura === n && e.pedido === 'STOCK') stockKg += e.kg; });
      S.estado.salidas.forEach(function (s) { if (s.elemento === n && s.estado !== 'ANULADA' && s.tipo !== 'ARMADO' && OBS_SOB.test(String(s.obs || ''))) sobKg += +s.kg || 0; });
      var inKg = x.in_kg || 0, pedKg = esCart ? cartKg : inKg - stockKg, salioKg = Math.max(0, (x.out_kg || 0) - sobKg), armKg = x.arm_kg || 0, usado = armKg + salioKg, un = unidades(n);
      var cerr = (S.estado.armados || []).some(function (a) { return a.elemento === n && a.estado === 'TERMINADO'; }) && !(x.lib_p > 0);
      L.push({ n: n, ped: p.pedido, un: un, pedKg: pedKg, porLlegar: esCart ? Math.max(0, cartKg - recKg) : 0, libKg: x.lib_kg || 0, lib: x.lib_p || 0, armKg: armKg, arm: x.arm_p || 0, salioKg: salioKg, sobKg: sobKg, stockKg: stockKg,
        usado: usado, usadoPed: Math.max(0, usado - stockKg), eq: pedKg > 0 ? Math.min(un, Math.round(10 * un * usado / pedKg) / 10) : 0, eqArm: pedKg > 0 ? un * armKg / pedKg : 0, cerrada: cerr, inP: x.in_p || 0 });
    });
    return L;
  }
  function est1(n) { return estructuras().filter(function (e) { return e.n === n; })[0] || { n: n, un: 1 }; }
  /** Pedidos con algo por llegar. */
  function porRecibir() {
    var seen = {}, L = [];
    (X.S.estado.cartilla || []).forEach(function (e) { if (seen[e.loadId]) return; seen[e.loadId] = 1; var rc = X.recibo(e.loadId); if (rc && rc.est !== 'COMPLETO') L.push({ id: e.loadId, pedido: e.pedido, est: e.estructura, rc: rc, falta: rc.tk - rc.rk }); });
    return L;
  }
  function pend(loadId) {
    var rc = X.recibo(loadId); if (!rc) return [];
    return rc.rows.filter(function (e) { return e.cantidad - e.recibida > 0; }).sort(function (a, b) { return (X.C.diamOrder(a.diametro) - X.C.diamOrder(b.diametro)) || (a.marca < b.marca ? -1 : a.marca > b.marca ? 1 : 0); });
  }
  function totVals(P, kgU) { var w = W(), p = 0, k = 0; P.forEach(function (e) { var q = w.vals[e.k] || 0; p += q; k += q * (kgU ? kgU(e) : e.kgU); }); return { p: p, kg: k }; }

  // ================================================================== INICIO
  function tile(ico, t, v, sub) { return '<div class="kg"><span>' + ico + ' ' + t + '</span><b>' + v + '</b><small>' + sub + '</small></div>'; }
  function almacen() {
    var c = calc(), E = estructuras(), pl = porRecibir(), pk = 0, lib = 0, arm = 0;
    pl.forEach(function (q) { pk += q.falta; }); E.forEach(function (e) { lib += e.libKg; arm += e.armKg; });
    var r = c.porElem['ACERO RECTO'] || {}, f = c.porElem['ACERO FIGURADO'] || {};
    return '<div class="kgs k3">' + tile('⏳', 'Por llegar', K(pk), pl.length + (pl.length === 1 ? ' pedido' : ' pedidos')) + tile('🟢', 'Para armar', K(lib), 'acero de estructuras') + tile('🔧', 'Armado', K(arm), 'listo para salir') +
      tile('🧱', 'Stock estándar', K(r.sal_kg || 0), 'barras 6 y 12 m') + tile('🧵', 'Stock figurado', K(f.sal_kg || 0), 'cortes y figuras') + '</div>';
  }
  function tarjetasEstructuras() {
    var E = estructuras(); if (!E.length) return '';
    var h = '<div class="card gr"><h3>🏗️ Estructuras</h3><div class="ley"><span><i class="pen"></i>Por llegar</span><span><i class="lib"></i>Para armar</span><span><i class="arm"></i>Armado</span><span><i class="out"></i>Salió</span></div>';
    E.forEach(function (e) {
      var t = Math.max(1, e.porLlegar + e.libKg + e.armKg + e.salioKg), w = function (v) { return (100 * v / t).toFixed(1) + '%'; };
      var estado = e.cerrada ? (e.armKg > 0 ? '🏁 Armada · lista para salir' : '🏁 Terminada') : e.inP <= 0 ? '⏳ Esperando el acero' : e.usado > 0 ? '🔧 Armando' : '🟢 Lista para armar';
      h += '<div class="bh-r"><div class="bh-t"><b>' + esc(e.n) + (e.un > 1 ? ' <small>× ' + e.un + '</small>' : '') + '</b><span>' + estado + '</span></div>' +
        '<div class="pila"><i class="out" style="width:' + w(e.salioKg) + '"></i><i class="arm" style="width:' + w(e.armKg) + '"></i><i class="lib" style="width:' + w(e.libKg) + '"></i><i class="pen" style="width:' + w(e.porLlegar) + '"></i></div>' +
        '<div class="peq mut">Pedido ' + esc(e.ped) + ': ' + K(e.pedKg) + (e.porLlegar > 0 ? ' · faltan por llegar ' + K(e.porLlegar) : '') + ' · para armar ' + K(e.libKg) + ' · armado ' + K(e.armKg) + ' · salió ' + K(e.salioKg) + (e.un > 1 ? ' · ≈ ' + String(e.eq).replace('.', ',') + ' de ' + e.un + ' armadas' : '') + '</div>' +
        (e.usado > 0 ? '<div class="peq"><b>Acero usado: ' + K(e.usado) + '</b> = ' + K(e.usadoPed) + ' del pedido' + (e.stockKg > 0 ? ' + ' + K(e.stockKg) + ' del stock' : '') + (e.sobKg > 0 ? ' · sobró ' + K(e.sobKg) + ' (pasó a stock)' : '') + '</div>' : '') + '</div>';
    });
    return h + '</div>';
  }
  function vStockListas() {
    var h = '';
    STK.forEach(function (s) {
      var P = posiciones(s).filter(function (p) { return p.lib > 0; }); if (!P.length) return;
      h += '<div class="card"><h3>' + (s === 'ACERO RECTO' ? '🧱 ' : '🧵 ') + NOM[s] + '</h3>' + P.map(function (p) { return '<div class="fila"><div>' + posTxt(p) + '</div><div><b>' + pz(p.lib) + '</b> · ' + K(p.lib * p.kgU) + '</div></div>'; }).join('') + '</div>';
    });
    return h;
  }
  function eventos() {
    var S = X.S, L = [], G = {}, orden = [];
    S.estado.pedidos.forEach(function (p) {
      if (SIS.test(String(p.pedido))) return;
      if (X.recibo(p.loadId)) { L.push({ f: p.fecha, h: mv('', '📄', 'Pedido montado en oficina', p.estructura, ['Pedido ' + esc(p.pedido), pz(p.piezas) + ' · ' + K(p.kg), esc(p.usuario || '') + ' · ' + X.fecha(p.fecha)]) }); return; }
      L.push({ f: p.fecha, h: X.vMov({ t: 'E', f: p.fecha, p: p }, true) });
    });
    var RG = {}, ro = [];
    (S.estado.recepciones || []).forEach(function (e) { var k = String(e.id).replace(/-\d+$/, ''); if (!RG[k]) { RG[k] = []; ro.push(k); } RG[k].push(e); });
    ro.forEach(function (k) { var g = RG[k], tp = 0, tk = 0; g.forEach(function (e) { tp += e.cantidad; tk += e.kg; }); L.push({ f: g[0].fecha, h: mv('ent', '📥', 'Llegó acero a la obra', g[0].estructura, ['Pedido ' + esc(g[0].pedido), pz(tp) + ' · ' + K(tk), esc(g[0].usuario || '') + ' · ' + X.fecha(g[0].fecha)]) }); });
    (S.estado.armados || []).forEach(function (a) { if (a.estado === 'TERMINADO') L.push({ f: a.fin, h: mv('fin', '🏁', 'Se cerró el armado', a.elemento, [esc(a.sobrante || 'Sin sobrante'), esc(a.usuarioFin || '') + ' · ' + X.fecha(a.fin)]) }); });
    S.estado.salidas.forEach(function (s) { var k = String(s.id).replace(/-\d+$/, '').replace(/-[SA]$/, ''); if (!G[k]) { G[k] = []; orden.push(k); } G[k].push(s); });
    orden.forEach(function (k) { var g = G[k]; if (OBS_SIS.test(String(g[0].obs || '')) || /^Armado de /.test(String(g[0].obs || ''))) return; L.push({ f: g[0].fecha, h: X.vMov({ t: 'S', f: g[0].fecha, s: g[0], g: g }, true) }); });
    return L.sort(function (a, b) { return a.f < b.f ? 1 : a.f > b.f ? -1 : 0; });
  }
  function mv(cls, ico, tit, sub, meta) { return '<div class="mv ' + cls + '"><div class="mv-i">' + ico + '</div><div class="mv-c"><div class="mv-t">' + tit + '</div><div class="mv-s">' + esc(sub) + '</div><div class="mv-m">' + meta.map(function (m) { return '<span>' + m + '</span>'; }).join('') + '</div></div></div>'; }
  function vInicio() {
    var E = estructuras(), pl = porRecibir(), c = calc();
    var nArm = E.filter(function (e) { return e.lib > 0; }).length, nSal = E.filter(function (e) { return e.arm > 0; }).length, stk = ((c.porElem['ACERO RECTO'] || {}).sal_p || 0) + ((c.porElem['ACERO FIGURADO'] || {}).sal_p || 0);
    var h = '<div class="card"><h2 style="margin:0">¿Qué vas a registrar?</h2></div><div class="tres">' +
      grande('wRuta', 'llego', '📥', 'LLEGÓ ACERO', pl.length ? pl.length + (pl.length === 1 ? ' pedido por llegar' : ' pedidos por llegar') : 'Recibir acero en la obra', 'b1') +
      grande('wRuta', 'armar', '🔧', 'ARMAR', nArm ? nArm + (nArm === 1 ? ' estructura con acero' : ' estructuras con acero') : 'Dar avance de armado', 'b2') +
      grande('wRuta', 'salio', '🚚', 'SALIÓ ACERO', nSal ? nSal + (nSal === 1 ? ' estructura armada' : ' estructuras armadas') : (stk ? 'Sacar acero del stock' : 'Dar salida del almacén'), 'b3') + '</div>';
    h += '<div class="card"><h3 style="margin:0">🏬 El almacén ahora</h3></div>' + almacen() + tarjetasEstructuras() + vStockListas();
    var Ev = eventos();
    h += '<div class="card"><div class="row2" style="justify-content:space-between"><h3 style="margin:0">🕒 Lo último que pasó</h3>' + (X.esAdmin() ? '<button class="btn chico sec" data-a="csv">⬇ CSV</button>' : '') + '</div></div>';
    if (!Ev.length) h += '<div class="card vacio">Todavía no hay movimientos.</div>';
    var dia = ''; Ev.slice(0, 40).forEach(function (e) { var d = String(e.f).slice(0, 10); if (d !== dia) { dia = d; h += '<div class="dia">' + (d === X.hoyISO() ? 'Hoy · ' : '') + X.fechaDia(d) + '</div>'; } h += e.h; });
    return h;
  }
  function vOk() {
    var w = W(), otra = { llego: 'Registrar otra llegada', armar: 'Registrar otro armado', salio: 'Registrar otra salida' }[w.r];
    return '<div class="card wz cen"><div style="font-size:3.4rem;line-height:1">✅</div><h2>' + esc(w.okMsg) + '</h2>' + (w.okSub ? '<p>' + esc(w.okSub) + '</p>' : '') + (w.extra || '') +
      '<button type="button" class="btn blk gr" data-a="wHome">🏠 Volver al inicio</button><button type="button" class="btn blk sec" style="margin-top:8px" data-a="wRuta" data-v="' + w.r + '">' + otra + '</button></div>';
  }

  // ================================================================== LLEGÓ
  function vLlego() {
    var w = W(), h = '', pl = porRecibir();
    if (w.p === 'l1') return cab('¿Para qué llegó el acero?') + '<div class="bgs dos">' + grande('wL1', 'est', '🏗️', 'Para una estructura', 'Viene con su pedido') + grande('wL1', 'stk', '📦', 'Para el stock', 'Barras o figurado sin estructura') + '</div>' + pie();
    if (w.p === 'l2e') {
      var Le = pl.filter(function (q) { return !esStk(q.est); });
      h = cab('¿De cuál estructura llegó?', 'Toca la estructura. Solo aparecen los pedidos que montó la oficina.');
      if (!Le.length) h += '<div class="vacio">No hay pedidos de estructuras por llegar.<br>Pide a la oficina que monte el pedido.</div>';
      return h + Le.map(function (q) { return opcion('wLoad', q.id, '🏗️', esc(q.est), 'Pedido ' + esc(q.pedido) + ' · ' + (q.rc.est === 'PARCIAL' ? 'ya llegó una parte · ' : '') + 'faltan ' + K(q.falta)); }).join('') + pie();
    }
    if (w.p === 'l2s') return cab('¿A cuál stock llegó?') + '<div class="bgs dos">' + grande('wLs', 'ACERO RECTO', '🧱', 'Stock estándar', 'Barras rectas de 6 m y 12 m') + grande('wLs', 'ACERO FIGURADO', '🧵', 'Stock figurado', 'Estribos, ganchos, cortes') + '</div>' + pie();
    if (w.p === 'l2p') { // stock con pedidos montados
      var Ls = pl.filter(function (q) { return q.est === w.stock; });
      return cab('¿Llegó con un pedido?', NOM[w.stock]) + Ls.map(function (q) { return opcion('wLoad', q.id, '📄', 'Pedido ' + esc(q.pedido), 'faltan ' + K(q.falta)); }).join('') + opcion('wLform', '', '📸', 'Llegó sin pedido', 'Se registra con la foto de la remisión') + pie();
    }
    var q0 = pl.filter(function (q) { return q.id === w.load; })[0];
    if (w.p === 'l3') {
      if (!q0) return cab('Este pedido ya se recibió completo') + pie();
      return cab('¿Llegó todo lo que faltaba?', esc(q0.est) + ' · Pedido ' + esc(q0.pedido) + ' · faltan ' + K(q0.falta)) + '<div class="bgs dos">' + grande('wTodo', '1', '✅', 'Sí, llegó todo', K(q0.falta)) + grande('wTodo', '0', '🟡', 'Solo una parte', 'Marco lo que llegó') + '</div>' + pie();
    }
    if (w.p === 'l3p') {
      var P = pend(w.load);
      h = cab('¿Qué llegó?', 'Marca ✓ si llegó toda la posición, o escribe los kilos que llegaron.');
      P.forEach(function (e, i) {
        var key = e.diametro + '|' + e.marca, pe = e.cantidad - e.recibida, v = w.vals[key] || 0, kgx = w.kgs[key] === undefined ? '' : w.kgs[key];
        h += '<div class="fila" style="gap:8px"><label style="display:flex;align-items:center;gap:10px;flex:1"><input type="checkbox" data-rc="' + i + '"' + (v >= pe ? ' checked' : '') + ' class="chk"><span><b>' + esc(e.marca) + '</b> · ' + esc(X.C.diamLabel(e.diametro)) + ' · ' + e.largo + ' m<div class="peq mut">Faltan ' + pz(pe) + ' · ' + K(pe * e.kgUnit) + '</div></span></label>' +
          '<div style="width:96px"><input type="text" inputmode="decimal" placeholder="kg" value="' + esc(kgx) + '" data-rk="' + i + '" aria-label="Kilos recibidos de ' + esc(e.marca) + '"><div class="peq mut" id="rp' + i + '">' + (v > 0 ? pz(v) : '') + '</div></div></div>';
      });
      var tt = totLleg();
      return h + '<button type="button" class="btn blk gr" id="rec-ok" data-a="wLsig"' + (tt.p > 0 ? '' : ' disabled') + '>Siguiente → (<span id="rec-tot">' + X.kg(tt.kg) + '</span> kg)</button>' + pie();
    }
    if (w.p === 'l4') {
      var kgT = w.todo ? (q0 ? q0.falta : 0) : totLleg().kg;
      if (!w.fecha) { w.fecha = X.hoyISO(); w.hora = X.horaAhora(); }
      return cab('¿Cuándo llegó?', 'Ya viene con el día y la hora de ahora. Cámbialos solo si llegó antes.') +
        '<div class="fgrid"><div class="fld"><label>📅 Día</label><input type="date" max="' + X.hoyISO() + '" value="' + esc(w.fecha) + '" data-r="fecha"></div><div class="fld"><label>🕒 Hora</label><input type="time" value="' + esc(w.hora) + '" data-r="hora"></div></div>' +
        '<div class="fld" style="margin-top:10px"><label>📎 Foto o PDF de la remisión (opcional)</label><input type="file" accept="image/*,application/pdf" data-r="file">' + (w.file ? '<div class="peq" style="margin-top:4px">✅ ' + esc(w.file.nombre) + '</div>' : '') + '</div>' +
        '<div class="resu">Llegan <b>' + K(kgT) + '</b> de <b>' + esc(q0 ? q0.est : '') + '</b>' + (w.todo ? ' (todo lo que faltaba)' : ' (una parte)') + '</div>' + guardarBtn('wLok', '✅ Confirmar que llegó') + pie();
    }
    if (w.p === 'lsf') return vLlegoStock();
    return '';
  }
  function totLleg() { var w = W(), p = 0, k = 0; pend(w.load).forEach(function (e) { var q = w.vals[e.diametro + '|' + e.marca] || 0; p += q; k += q * e.kgUnit; }); return { p: p, kg: k }; }
  function vLlegoStock() {
    var w = W(), rec = w.stock === 'ACERO RECTO';
    if (!w.rows) { w.rows = []; w.d = '1/2'; w.l = rec ? '12' : ''; w.c = ''; w.k = ''; w.pedido = ''; }
    var lista = Object.keys(X.C.PESOS).filter(function (k) { return k !== 'ALAMBRE'; }).sort(function (a, b) { return X.C.diamOrder(a) - X.C.diamOrder(b); });
    var h = cab('¿Qué llegó al ' + NOM[w.stock].toLowerCase() + '?', (rec ? 'Solo barras rectas de 6 m o 12 m. ' : '') + 'Llena una varilla y toca «Agregar». Repite por cada varilla de la remisión.') +
      '<div class="fgrid"><div class="fld"><label>Varilla</label><select data-r="d">' + lista.map(function (k) { return '<option value="' + esc(k) + '"' + (w.d === k ? ' selected' : '') + '>' + esc(X.C.diamLabel(k)) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fld"><label>Largo (m)</label>' + (rec ? '<div class="seg" style="margin:0"><button type="button" class="' + (w.l === '6' ? 'on' : '') + '" data-a="wLl" data-v="6">6 m</button><button type="button" class="' + (w.l === '12' ? 'on' : '') + '" data-a="wLl" data-v="12">12 m</button></div>' : '<input type="text" inputmode="decimal" placeholder="Ej. 3,5" value="' + esc(w.l) + '" data-r="l">') + '</div>' +
      '<div class="fld"><label>Cantidad (piezas)</label><input type="text" inputmode="numeric" placeholder="Ej. 50" value="' + esc(w.c) + '" data-r="c"></div>' +
      '<div class="fld"><label>Kilos (según remisión)</label><input type="text" inputmode="decimal" placeholder="kg" value="' + esc(w.k) + '" data-r="k"></div></div>' +
      '<button type="button" class="btn blk" data-a="wLadd" style="margin-top:8px">➕ Agregar</button>';
    if (w.rows.length) {
      var tk = 0; w.rows.forEach(function (x) { tk += x.k; });
      h += '<div class="lst">' + w.rows.map(function (x, i) { return '<div class="fila"><div><b>' + pz(x.c) + '</b> · ' + esc(X.C.diamLabel(x.d)) + ' · ' + x.l + ' m · ' + K(x.k) + '</div><button type="button" class="btn chico sec" data-a="wLdel" data-v="' + i + '">Quitar</button></div>'; }).join('') + '</div>' +
        '<div class="fld" style="margin-top:8px"><label>📎 Foto o PDF de la remisión (obligatorio)</label><input type="file" accept="image/*,application/pdf" data-r="file">' + (w.file ? '<div class="peq" style="margin-top:4px">✅ ' + esc(w.file.nombre) + '</div>' : '<div class="peq mut" style="margin-top:4px">No puede llegar acero sin soporte.</div>') + '</div>' +
        '<div class="fld" style="margin-top:8px"><label>Número de remisión o pedido (opcional)</label><input type="text" value="' + esc(w.pedido) + '" data-r="pedido"></div>' +
        '<div class="resu">Llegan <b>' + K(tk) + '</b> al <b>' + NOM[w.stock] + '</b></div>' + guardarBtn('wLsok', '✅ Confirmar que llegó');
    }
    return h + pie();
  }

  // ================================================================== ARMAR
  function itemsAvance() { // lo que se va a marcar como armado según unidades y modo
    var w = W(), e = est1(w.elem), P = posiciones(w.elem), L = [], falta = [];
    P.forEach(function (p) {
      var q, nec;
      if (w.modo === 'pos') { q = Math.min(p.lib, w.vals[p.k] || 0); nec = q; }
      else { nec = Math.round((p.tot / e.un) * (w.u || 1) * (w.modo === 'pct' ? (w.pct || 0) / 100 : 1)); q = Math.min(p.lib, nec); }
      if (q > 0) L.push({ p: p, q: q });
      if (nec > q) falta.push({ p: p, n: nec - q });
    });
    return { L: L, falta: falta };
  }
  function vArmar() {
    var w = W(), h = '', E = estructuras();
    if (w.p === 'a1') {
      var La = E.filter(function (e) { return e.inP > 0 && (e.lib > 0 || !e.cerrada); });
      h = cab('¿Qué estructura estás armando?', 'Solo aparecen las que ya tienen acero en el almacén.');
      if (!La.length) h += '<div class="vacio">Todavía no hay acero para armar.<br>Primero registra que <b>llegó</b> el acero.</div>';
      return h + La.map(function (e) { return opcion('wElem', e.n, '🏗️', esc(e.n) + (e.un > 1 ? ' × ' + e.un : ''), 'Para armar ' + K(e.libKg) + ' · armado ' + K(e.armKg) + (e.un > 1 ? ' (≈ ' + String(e.eq).replace('.', ',') + ' de ' + e.un + ')' : '')); }).join('') + pie();
    }
    var e = est1(w.elem), P = posiciones(w.elem);
    if (w.p === 'a2') {
      return cab(esc(e.n) + (e.un > 1 ? ' × ' + e.un : ''), 'Para armar ' + K(e.libKg) + ' · armado ' + K(e.armKg) + (e.porLlegar > 0 ? ' · faltan por llegar ' + K(e.porLlegar) : '')) + '<h3 style="margin:6px 0">¿Qué pasó?</h3>' +
        opcion('wAv', '', '🔧', 'Armé una parte', 'Registrar el avance de hoy') + opcion('wAst', '', '🧱', 'Me faltó acero', 'Usar acero del stock para esta estructura') + opcion('wAc', '', '🏁', 'Terminé de armar todo', 'Cerrar y contar el acero que sobró') + pie();
    }
    if (w.p === 'a3u') {
      var u = w.u || 1;
      return cab('¿Cuántas ' + esc(e.n) + ' estás armando?', 'La cartilla trae ' + e.un + '. Van armadas ≈ ' + String(e.eq).replace('.', ',') + '.') +
        '<div class="cen" style="margin:14px 0"><span class="stp gr"><button type="button" data-a="wU" data-v="-1">−</button><b>' + u + '</b><button type="button" data-a="wU" data-v="1">+</button></span><div class="peq mut" style="margin-top:6px">' + (u === 1 ? 'una sola' : u + ' al mismo tiempo') + '</div></div>' +
        '<div class="chips cen2"><button type="button" class="btn sec" data-a="wUset" data-v="1">Solo 1</button><button type="button" class="btn sec" data-a="wUset" data-v="' + e.un + '">Las ' + e.un + '</button></div>' +
        '<button type="button" class="btn blk gr" data-a="wIr" data-v="a3m">Siguiente →</button>' + pie();
    }
    if (w.p === 'a3m') {
      var que = e.un > 1 ? ((w.u || 1) === 1 ? '1 unidad' : (w.u) + ' unidades') : 'la estructura';
      return cab('¿Cuánto armaste?', esc(e.n) + ' · ' + que) + opcion('wModo', 'todo', '💯', 'Completa', 'Se armó todo (100 %)') + opcion('wModo', 'pct', '📊', 'Un porcentaje', 'Por ejemplo la mitad (50 %)') + opcion('wModo', 'pos', '📋', 'Por posiciones', 'Marco cuántas piezas de cada posición') + pie();
    }
    if (w.p === 'a3pct') {
      var pc = w.pct || 50;
      return cab('¿Qué porcentaje armaste?', esc(e.n) + (e.un > 1 ? ' · ' + (w.u || 1) + (w.u > 1 ? ' unidades' : ' unidad') : '')) +
        '<div class="chips cen2">' + [25, 50, 75, 100].map(function (v) { return '<button type="button" class="btn ' + (pc === v ? '' : 'sec') + '" data-a="wPct" data-v="' + v + '">' + v + ' %</button>'; }).join('') + '</div>' +
        '<div class="cen" style="margin:12px 0"><span class="stp gr"><button type="button" data-a="wPctD" data-v="-5">−</button><b>' + pc + ' %</b><button type="button" data-a="wPctD" data-v="5">+</button></span></div>' +
        '<button type="button" class="btn blk gr" data-a="wIr" data-v="a4">Siguiente →</button>' + pie();
    }
    if (w.p === 'a3pos') {
      var Pl = P.filter(function (p) { return p.lib > 0; });
      h = cab('¿Cuántas piezas armaste?', 'Usa + y − en cada posición.');
      if (!Pl.length) h += '<div class="vacio">No hay acero libre de esta estructura.</div>';
      Pl.forEach(function (p) { h += '<div class="fila"><div>' + posTxt(p) + '<div class="peq mut">Hay ' + pz(p.lib) + ' sin armar</div></div>' + stp(p.k, Math.min(p.lib, w.vals[p.k] || 0), p.lib) + '</div>'; });
      var t = totVals(Pl);
      return h + '<button type="button" class="btn blk gr" data-a="wIr" data-v="a4"' + (t.p > 0 ? '' : ' disabled') + '>Siguiente → (' + K(t.kg) + ')</button>' + pie();
    }
    if (w.p === 'a4') {
      var it = itemsAvance(), tk = 0; it.L.forEach(function (x) { tk += x.q * x.p.kgU; });
      var desc = w.modo === 'pos' ? 'por posiciones' : (e.un > 1 ? (w.u || 1) + ' de ' + e.un + ' · ' : '') + (w.modo === 'pct' ? w.pct + ' %' : 'completa');
      h = cab('Revisa y guarda', 'Armado de ' + esc(e.n) + ' · ' + desc);
      if (!it.L.length) h += '<div class="rec bad">No hay acero libre para este avance.</div>';
      h += it.L.map(function (x) { return '<div class="fila"><div>' + posTxt(x.p) + '</div><div><b>' + pz(x.q) + '</b> · ' + K(x.q * x.p.kgU) + '</div></div>'; }).join('');
      if (it.falta.length) h += '<div class="rec warn">⚠️ Falta acero para completar: ' + it.falta.map(function (f) { return esc(f.p.m) + ' (' + f.n + ')'; }).join(', ') + '. Se guarda lo que hay. Si lo completaste con acero del stock, regístralo después en «Me faltó acero».</div>';
      return h + '<div class="resu">Quedan armados <b>' + K(tk) + '</b></div>' + (it.L.length ? guardarBtn('wAok', '✅ Guardar el armado') : '') + pie();
    }
    if (w.p === 'ast') {
      h = cab('¿Qué acero del stock usaste?', 'Sale del stock y queda armado en ' + esc(e.n) + '.'); var hay = false, tk2 = 0, tp2 = 0;
      STK.forEach(function (s) {
        var Ps = posiciones(s).filter(function (p) { return p.lib > 0; }); if (!Ps.length) return; hay = true;
        h += '<h3 style="margin:10px 0 2px">' + (s === 'ACERO RECTO' ? '🧱 ' : '🧵 ') + NOM[s] + '</h3>';
        Ps.forEach(function (p) { var key = s + '~' + p.k, v = Math.min(p.lib, w.vals[key] || 0); tp2 += v; tk2 += v * p.kgU; h += '<div class="fila"><div>' + posTxt(p) + '<div class="peq mut">Hay ' + pz(p.lib) + '</div></div>' + stp(key, v, p.lib) + '</div>'; });
      });
      if (!hay) return h + '<div class="vacio">No hay acero en el stock.</div>' + pie();
      return h + '<div class="resu">Pasan <b>' + K(tk2) + '</b> del stock a <b>' + esc(e.n) + '</b></div>' + (tp2 > 0 ? guardarBtn('wAstOk', '✅ Guardar') : '') + pie();
    }
    if (w.p === 'ac') {
      var Pc = P.filter(function (p) { return p.lib > 0; }), sk = 0, ak = 0;
      h = cab('¿Cuánto acero sobró?', 'Cuenta lo que quedó sin usar de ' + esc(e.n) + '. Lo que sobre pasa al stock; lo demás queda como armado.');
      if (e.porLlegar > 0) h += '<div class="rec warn">⚠️ Todavía faltan por llegar ' + K(e.porLlegar) + ' de este pedido.</div>';
      if (!Pc.length) h += '<div class="rec ok">No quedó acero suelto: no sobró nada.</div>';
      Pc.forEach(function (p) { var v = Math.min(p.lib, w.vals[p.k] || 0); sk += v * p.kgU; ak += (p.lib - v) * p.kgU; h += '<div class="fila"><div>' + posTxt(p) + '<div class="peq mut">Sin armar: ' + pz(p.lib) + ' · si sobra va a ' + (p.largo === 6 || p.largo === 12 ? 'stock estándar' : 'stock figurado') + '</div></div>' + stp(p.k, v, p.lib) + '</div>'; });
      return h + '<div class="resu">Sobran <b>' + K(sk) + '</b> → al stock' + (ak > 0 ? '<br>Quedan armados <b>' + K(ak) + '</b> más' : '') + '</div>' + guardarBtn('wAcOk', '🏁 Cerrar la estructura') + pie();
    }
    return '';
  }

  // ================================================================== SALIÓ
  function vSalio() {
    var w = W(), h = '', E = estructuras();
    if (w.p === 's1') return cab('¿Qué sale del almacén?') + '<div class="bgs dos">' + grande('wS1', 'est', '🏗️', 'Una estructura armada', 'Va para la obra') + grande('wS1', 'stk', '📦', 'Acero del stock', 'Barras o figurado suelto') + '</div>' + pie();
    if (w.p === 's2e') {
      var Ls = E.filter(function (e) { return e.arm > 0; });
      h = cab('¿Cuál estructura sale?', 'Solo aparecen las que tienen acero armado.');
      if (!Ls.length) h += '<div class="vacio">No hay estructuras armadas.<br>Primero registra el <b>armado</b>.</div>';
      return h + Ls.map(function (e) { return opcion('wSelem', e.n, '🏗️', esc(e.n) + (e.un > 1 ? ' × ' + e.un : ''), 'Armado ' + K(e.armKg) + (e.un > 1 ? ' (≈ ' + String(Math.round(e.eqArm * 10) / 10).replace('.', ',') + ' unidades)' : '')); }).join('') + pie();
    }
    if (w.p === 's2s') return cab('¿De cuál stock sale?') + '<div class="bgs dos">' + grande('wSs', 'ACERO RECTO', '🧱', 'Stock estándar', K((calc().porElem['ACERO RECTO'] || {}).sal_kg || 0)) + grande('wSs', 'ACERO FIGURADO', '🧵', 'Stock figurado', K((calc().porElem['ACERO FIGURADO'] || {}).sal_kg || 0)) + '</div>' + pie();
    var e = est1(w.elem), stock = esStk(w.elem), P = posiciones(w.elem).filter(function (p) { return (stock ? p.lib : p.arm) > 0; }), mx = function (p) { return stock ? p.lib : p.arm; };
    if (w.p === 's3') return cab('¿Sale todo lo armado?', esc(e.n) + ' · armado ' + K(e.armKg)) + '<div class="bgs dos">' + grande('wStodo', '1', '✅', 'Sí, sale todo', K(e.armKg)) + grande('wStodo', '0', '🟡', 'Solo una parte', 'Marco lo que sale') + '</div>' + pie();
    if (w.p === 's3p') {
      h = cab('¿Qué sale?', (stock ? NOM[w.elem] : esc(e.n)) + ' · usa + y − en cada ' + (stock ? 'varilla' : 'posición') + '.');
      if (!stock && e.un > 1 && e.eqArm >= 1) { h += '<div class="chips">'; for (var i = 1; i <= Math.min(6, Math.floor(e.eqArm + 0.05)); i++) h += '<button type="button" class="btn sec" data-a="wSun" data-v="' + i + '">' + i + (i === 1 ? ' unidad' : ' unidades') + '</button>'; h += '</div>'; }
      if (!P.length) h += '<div class="vacio">No hay acero para sacar.</div>';
      P.forEach(function (p) { h += '<div class="fila"><div>' + posTxt(p) + '<div class="peq mut">Hay ' + pz(mx(p)) + (stock ? '' : ' armadas') + '</div></div>' + stp(p.k, Math.min(mx(p), w.vals[p.k] || 0), mx(p)) + '</div>'; });
      var t = totVals(P);
      return h + '<button type="button" class="btn blk gr" data-a="wIr" data-v="s4"' + (t.p > 0 ? '' : ' disabled') + '>Siguiente → (' + K(t.kg) + ')</button>' + pie();
    }
    if (w.p === 's4') {
      var tk = 0; P.forEach(function (p) { tk += (w.todo ? mx(p) : Math.min(mx(p), w.vals[p.k] || 0)) * p.kgU; });
      var frentes = E.map(function (x) { return x.n; });
      return cab('¿Para dónde va?', stock ? 'Escribe o escoge para qué estructura o frente sale este acero.' : 'Escribe el frente o sitio de la obra (opcional).') +
        '<div class="fld"><input type="text" placeholder="' + (stock ? 'Ej. BOX 1, cerramiento…' : 'Ej. K5+300, eje 3…') + '" value="' + esc(w.dest || '') + '" data-r="dest" list="w-fr"><datalist id="w-fr">' + (stock ? frentes.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') : '') + '</datalist></div>' +
        '<div class="resu">Salen <b>' + K(tk) + '</b> de <b>' + (stock ? NOM[w.elem] : esc(e.n)) + '</b></div>' + guardarBtn('wSok', '✅ Confirmar la salida') + pie();
    }
    return '';
  }

  // ================================================================== enrutador y acciones
  function vista(tab) {
    if (['ini', 'reg', 'llego', 'armar', 'salio', 'stock', 'mov', 'fin'].indexOf(tab) < 0) return null;
    var w = W();
    if (!w.r) return vInicio();
    if (w.p === 'ok') return vOk();
    return w.r === 'llego' ? vLlego() : w.r === 'armar' ? vArmar() : vSalio();
  }
  function ahoraISO() { var d = new Date(), z = function (n) { return String(n).padStart(2, '0'); }; return X.hoyISO() + 'T' + z(d.getHours()) + ':' + z(d.getMinutes()) + ':' + z(d.getSeconds()); }
  function enviar(action, data, okMsg, okSub, extra) {
    var w = W(); if (w.busy) return; w.busy = true; w.err = ''; X.render();
    X.Api.accion(X.S.ses, action, data).then(function (res) { if (!res.ok) return fallo(res.error); listo(typeof okMsg === 'function' ? okMsg(res) : okMsg, okSub, extra); });
  }
  function click(a, v) {
    var w = W(), P, items, e;
    switch (a) {
      case 'wRuta': ruta(v, v === 'llego' ? 'l1' : v === 'armar' ? 'a1' : 's1'); return true;
      case 'wHome': inicio(); return true;
      case 'wBack': if (w.hist && w.hist.length) { w.p = w.hist.pop(); w.err = ''; X.render(); window.scrollTo(0, 0); } else inicio(); return true;
      case 'wIr': ir(v); return true;
      case 'ws': { var x = String(v).split('|'), key = decodeURIComponent(x[0]); w.vals[key] = Math.max(0, Math.min(+x[2], (w.vals[key] || 0) + (+x[1]))); X.render(); return true; }
      // ---- Llegó
      case 'wL1': ir(v === 'est' ? 'l2e' : 'l2s'); return true;
      case 'wLs': w.stock = v; w.rows = null; w.file = null; ir(porRecibir().some(function (q) { return q.est === v; }) ? 'l2p' : 'lsf'); return true;
      case 'wLform': ir('lsf'); return true;
      case 'wLoad': w.load = v; w.vals = {}; w.kgs = {}; w.id = nuevoId('R'); ir('l3'); return true;
      case 'wTodo': w.todo = v === '1'; ir(w.todo ? 'l4' : 'l3p'); return true;
      case 'wLsig': if (totLleg().p > 0) ir('l4'); return true;
      case 'wLok': {
        if (!w.fecha || !w.hora) { fallo('Indica el día y la hora en que llegó.'); return true; }
        var d = { loadId: w.load, fecha: w.fecha + 'T' + w.hora, id: w.id };
        if (w.todo) d.todo = true; else { d.items = []; pend(w.load).forEach(function (r) { var q = w.vals[r.diametro + '|' + r.marca] || 0; if (q > 0) d.items.push({ diametro: r.diametro, marca: r.marca, cantidad: q }); }); }
        if (w.file) { d.archivoB64 = w.file.b64; d.archivoNombre = w.file.nombre; }
        enviar('recibirPedido', d, function (res) { return 'Llegaron ' + K(res.kg || 0); }, 'Ya están en el almacén, listos para armar.');
        return true;
      }
      case 'wLl': w.l = v; X.render(); return true;
      case 'wLadd': {
        var c = parseInt(String(w.c).replace(/\D/g, ''), 10), l = parseFloat(String(w.l).replace(',', '.')), kl = parseFloat(String(w.k).replace(',', '.'));
        if (!(c > 0)) { fallo('Escribe cuántas piezas llegaron.'); return true; }
        if (!(l > 0) || l > 30) { fallo('Escribe el largo en metros.'); return true; }
        if (w.stock === 'ACERO RECTO' && l !== 6 && l !== 12) { fallo('En el stock estándar solo entran barras de 6 m o 12 m.'); return true; }
        if (w.stock === 'ACERO FIGURADO' && (l === 6 || l === 12)) { fallo('Las barras de 6 m y 12 m van al stock estándar.'); return true; }
        if (!(kl > 0)) { fallo('Escribe los kilos de esta varilla (según la remisión).'); return true; }
        w.rows.push({ d: w.d, l: l, c: c, k: kl }); w.c = ''; w.k = ''; w.err = ''; X.render(); return true;
      }
      case 'wLdel': w.rows.splice(+v, 1); X.render(); return true;
      case 'wLsok': {
        if (!w.rows.length) return true;
        if (!w.file) { fallo('Falta la foto o el PDF de la remisión: no puede llegar acero sin soporte.'); return true; }
        var tk = 0; w.rows.forEach(function (r) { tk += r.k; });
        enviar('ingresoStock', { stock: w.stock, items: w.rows.map(function (r) { return { diametro: r.d, largo: r.l, cantidad: r.c, kg: r.k }; }), pedido: w.pedido, archivoB64: w.file.b64, archivoNombre: w.file.nombre, id: w.id || (w.id = nuevoId('G')) }, 'Llegaron ' + K(tk), 'Ya están en el ' + NOM[w.stock].toLowerCase() + '.');
        return true;
      }
      // ---- Armar
      case 'wElem': w.elem = v; ir('a2'); return true;
      case 'wAv': w.vals = {}; w.u = 1; w.modo = ''; w.id = nuevoId('S'); ir(est1(w.elem).un > 1 ? 'a3u' : 'a3m'); return true;
      case 'wU': w.u = Math.max(1, Math.min(est1(w.elem).un, (w.u || 1) + (+v))); X.render(); return true;
      case 'wUset': w.u = +v; X.render(); return true;
      case 'wModo': w.modo = v; if (v === 'pct') w.pct = w.pct || 50; ir(v === 'todo' ? 'a4' : v === 'pct' ? 'a3pct' : 'a3pos'); return true;
      case 'wPct': w.pct = +v; X.render(); return true;
      case 'wPctD': w.pct = Math.max(5, Math.min(100, (w.pct || 50) + (+v))); X.render(); return true;
      case 'wAok': {
        var it = itemsAvance(); if (!it.L.length) return true; e = est1(w.elem); var tk3 = 0; it.L.forEach(function (q) { tk3 += q.q * q.p.kgU; });
        var cerrar = '<button type="button" class="btn blk" style="margin-bottom:8px" data-a="wCerrarDe" data-v="' + esc(w.elem) + '">🏁 Ya terminé toda la estructura: contar sobrante</button>';
        enviar('salidaLote', { grupo: w.id, tipo: 'ARMADO', modo: w.modo === 'pct' ? 'PCT' : 'POS', pct: w.modo === 'pct' ? w.pct : 0, fase: e.un > 1 && w.modo !== 'pos' ? (w.u || 1) + ' de ' + e.un + ' unidades' : '', fecha: ahoraISO(),
          items: it.L.map(function (q) { return { elemento: w.elem, diametro: q.p.d, marca: q.p.m, cantidad: q.q }; }) }, 'Armado guardado: ' + K(tk3), w.elem, cerrar);
        return true;
      }
      case 'wCerrarDe': X.S.w = { r: 'armar', p: 'ac', hist: ['a2'], vals: {}, kgs: {}, elem: v, id: nuevoId('A'), err: '', busy: false }; X.render(); window.scrollTo(0, 0); return true;
      case 'wAst': w.vals = {}; ir('ast'); return true;
      case 'wAstOk': {
        items = []; var tk4 = 0;
        STK.forEach(function (s) { posiciones(s).forEach(function (p) { var q = Math.min(p.lib, w.vals[s + '~' + p.k] || 0); if (q > 0) { items.push({ stock: s, diametro: p.d, marca: p.m, cantidad: q }); tk4 += q * p.kgU; } }); });
        if (!items.length) return true;
        enviar('usarStock', { elemento: w.elem, items: items }, 'Pasaron ' + K(tk4) + ' del stock', 'Quedaron armados en ' + w.elem + '.');
        return true;
      }
      case 'wAc': w.vals = {}; w.id = nuevoId('A'); ir('ac'); return true;
      case 'wAcOk': {
        P = posiciones(w.elem).filter(function (p) { return p.lib > 0; }); var sk = 0;
        items = P.map(function (p) { var q = Math.min(p.lib, w.vals[p.k] || 0); sk += q * p.kgU; return { diametro: p.d, marca: p.m, queda: q }; });
        enviar('cerrarArmado', { elemento: w.elem, id: w.id, items: items, fecha: ahoraISO() }, 'Estructura cerrada', w.elem + (sk > 0 ? ' · sobraron ' + K(sk) + ' que pasaron al stock.' : ' · no sobró acero.'));
        return true;
      }
      // ---- Salió
      case 'wS1': ir(v === 'est' ? 's2e' : 's2s'); return true;
      case 'wSelem': w.elem = v; w.vals = {}; w.id = nuevoId('S'); ir('s3'); return true;
      case 'wSs': w.elem = v; w.vals = {}; w.todo = false; w.id = nuevoId('S'); ir('s3p'); return true;
      case 'wStodo': w.todo = v === '1'; ir(w.todo ? 's4' : 's3p'); return true;
      case 'wSun': { e = est1(w.elem); posiciones(w.elem).forEach(function (p) { if (p.arm > 0) w.vals[p.k] = Math.min(p.arm, Math.round((p.tot / e.un) * (+v))); }); X.render(); return true; }
      case 'wSok': {
        var stock = esStk(w.elem), dest = String(w.dest || '').trim(); if (stock && !dest) { fallo('Escribe para dónde va el acero.'); return true; }
        items = []; var tk5 = 0;
        posiciones(w.elem).forEach(function (p) { var m = stock ? p.lib : p.arm, q = w.todo ? m : Math.min(m, w.vals[p.k] || 0); if (q > 0) { items.push({ elemento: w.elem, diametro: p.d, marca: p.m, cantidad: q }); tk5 += q * p.kgU; } });
        if (!items.length) { fallo('No hay nada marcado para salir.'); return true; }
        enviar('salidaLote', { grupo: w.id, tipo: 'SALIDA', modo: 'POS', pct: 0, fase: '', fecha: ahoraISO(), items: items, destino: stock ? dest : '', obs: stock ? '' : dest }, 'Salieron ' + K(tk5), (stock ? NOM[w.elem] : w.elem) + (dest ? ' → ' + dest : ''));
        return true;
      }
    }
    return false;
  }
  function input(t) {
    var w = W(), rk = t.getAttribute('data-rk');
    if (rk !== null) { // kilos recibidos de una posición
      var e = pend(w.load)[+rk]; if (!e) return true;
      var txt = t.value.replace(/[^\d.,]/g, ''), kgv = parseFloat(txt.replace(',', '.')), pe = e.cantidad - e.recibida, q = kgv > 0 ? Math.min(pe, Math.max(1, Math.round(kgv / e.kgUnit))) : 0, key = e.diametro + '|' + e.marca;
      w.kgs[key] = txt; w.vals[key] = q;
      var sp = document.getElementById('rp' + rk); if (sp) sp.textContent = q > 0 ? pz(q) : '';
      var cb = document.querySelector('input[data-rc="' + rk + '"]'); if (cb) cb.checked = q >= pe;
      var tt = totLleg(), tg = document.getElementById('rec-tot'), bt = document.getElementById('rec-ok'); if (tg) tg.textContent = X.kg(tt.kg); if (bt) bt.disabled = tt.p <= 0;
      return true;
    }
    var k = t.getAttribute('data-r'); if (!k || k === 'file') return !!k;
    var val = t.value; if (k === 'c') val = val.replace(/[^\d]/g, ''); if (k === 'k' || k === 'l') val = val.replace(/[^\d.,]/g, '');
    w[k] = val; return true;
  }
  function leerSoporte(f) {
    var w = W(); if (!f) return;
    var fin = function (b64, nombre) { w.file = { nombre: nombre, b64: b64 }; w.err = ''; X.render(); };
    if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) { var fr = new FileReader(); fr.onload = function () { fin(String(fr.result).split(',')[1], f.name); }; fr.readAsDataURL(f); return; }
    var img = new Image(), u = URL.createObjectURL(f);
    img.onload = function () { var m = 1600, k = Math.min(1, m / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u); fin(cv.toDataURL('image/jpeg', 0.8).split(',')[1], String(f.name || 'remision').replace(/\.\w+$/, '') + '.jpg'); };
    img.onerror = function () { fallo('No se pudo leer la foto.'); }; img.src = u;
  }
  function cambio(t) {
    var w = W(), rc = t.getAttribute('data-rc');
    if (rc !== null) { // ✓ llegó toda la posición
      var e = pend(w.load)[+rc]; if (!e) return true; var key = e.diametro + '|' + e.marca, pe = e.cantidad - e.recibida;
      w.vals[key] = t.checked ? pe : 0; if (t.checked) w.kgs[key] = String(Math.round(pe * e.kgUnit * 100) / 100); else delete w.kgs[key]; X.render(); return true;
    }
    var k = t.getAttribute('data-r'); if (!k) return false;
    if (k === 'file') { leerSoporte(t.files && t.files[0]); return true; }
    w[k] = t.value; if (k === 'd') X.render(); return true;
  }
  function reset() { /* las rutas se conservan al cambiar de pestaña */ }
  window.AcReg = { init: function (c) { X = c; }, vista: vista, click: click, input: input, cambio: cambio, kpis: almacen, estructuras: tarjetasEstructuras, reset: reset, enCurso: function () { return []; } };
})();
