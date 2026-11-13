/* Acero — pantallas nuevas: Registro (línea de tiempo), Llegó, Armar, Fin de armado, Salió y Stock.
 * Todo con botones grandes y en el orden del proceso. Guarda al instante y envía al servidor en segundo plano. */
(function () {
  'use strict';
  var X = null;
  var STK = ['ACERO RECTO', 'ACERO FIGURADO'], NOM = { 'ACERO RECTO': 'Stock estándar', 'ACERO FIGURADO': 'Stock figurado' };
  var SISTEMA = /^(Sobrante del armado|Pas[oó] a |Cierre al 100|Ajuste de conteo|Armado de |Armado con acero)/;

  function R() {
    var S = X.S;
    return S.reg || (S.reg = {
      arm: { q: '' }, fin: { id: '', modo: '', vals: {}, stk: 'ACERO RECTO', sv: {}, err: '', busy: false, ok: '' },
      sal: { tipo: '', elem: '', stock: '', vals: {}, dest: '', err: '', busy: false, ok: '' },
      stk: { k: 'ACERO RECTO' }, ing: { modo: '', stock: 'ACERO RECTO', rows: [], d: '1/2', l: '12', c: '', k: '', file: null, pedido: '', err: '', busy: false }
    });
  }
  function esc(s) { return X.esc(s); }
  function enc(s) { return encodeURIComponent(s); }
  function esStk(e) { return STK.indexOf(e) >= 0; }
  function armados() { return X.S.estado.armados || []; }
  function enCurso() { return armados().filter(function (a) { return a.estado === 'EN CURSO'; }); }

  /** Estructuras (no stock) con sus cantidades: libres, armadas y total. */
  function estructuras() {
    var S = X.S, calc = S.calc || X.C.calcular(S.estado), seen = {}, L = [];
    S.estado.pedidos.forEach(function (p) {
      if (esStk(p.estructura) || seen[p.estructura]) return; seen[p.estructura] = 1;
      var x = calc.porElem[p.estructura] || {};
      L.push({ n: p.estructura, ped: p.pedido, lib: x.lib_p || 0, libKg: x.lib_kg || 0, arm: x.arm_p || 0, armKg: x.arm_kg || 0, sal: x.sal_p || 0 });
    });
    return L.sort(function (a, b) { return a.n < b.n ? -1 : 1; });
  }
  /** Posiciones de una estructura o stock, con lo que hay libre (o en stock) y lo armado. */
  function posiciones(elem) {
    var S = X.S, calc = S.calc || X.C.calcular(S.estado), seen = {}, L = [];
    S.estado.entradas.forEach(function (e) {
      if (e.estructura !== elem) return;
      var k = e.diametro + '|' + e.marca; if (seen[k]) return; seen[k] = 1;
      var m = calc.porMarca[elem + '|' + e.diametro + '|' + e.marca] || {};
      L.push({ k: k, d: e.diametro, m: e.marca, largo: e.largo, lib: m.lib_p || 0, arm: m.arm_p || 0, sal: m.sal_p || 0, kgU: e.kgUnit });
    });
    return L.sort(function (a, b) { return X.C.diamOrder(a.d) - X.C.diamOrder(b.d) || (a.largo - b.largo) || (a.m < b.m ? -1 : 1); });
  }
  function pz(n) { return X.pz(n); }
  function dur(a, b) {
    var ms = new Date(b || Date.now()) - new Date(a); if (!(ms >= 0)) return '';
    var mn = Math.round(ms / 60000); if (mn < 1) return 'menos de 1 min';
    if (mn < 60) return mn + ' min';
    var h = Math.floor(mn / 60); if (h < 48) return h + ' h ' + (mn % 60 ? (mn % 60) + ' min' : '');
    return Math.round(h / 24) + ' días';
  }
  function stp(scope, key, val, max) {
    return '<span class="stp"><button type="button" data-a="rs" data-v="' + scope + '|' + enc(key) + '|-1|' + max + '">−</button><b>' + val + '</b><button type="button" data-a="rs" data-v="' + scope + '|' + enc(key) + '|1|' + max + '">+</button></span>';
  }
  function grande(a, v, ico, tit, sub, cls) {
    return '<button type="button" class="bg ' + (cls || '') + '" data-a="' + a + '"' + (v != null ? ' data-v="' + esc(v) + '"' : '') + '><span class="bg-i">' + ico + '</span><b>' + tit + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</button>';
  }
  function atras(tab, txt) { return '<button type="button" class="btn sec chico" data-a="rAtras" data-v="' + tab + '">← ' + (txt || 'Volver') + '</button>'; }

  // ---------------------------------------------------------------- Registro (línea de tiempo)
  function cardArm(a, fin) {
    if (!fin) return '<div class="mv arm"><div class="mv-i">🔧</div><div class="mv-c"><div class="mv-t">Empezó el armado' + (a.estado === 'EN CURSO' ? '<span class="chp pen">En curso</span>' : '') + '</div><div class="mv-s">' + esc(a.elemento) + '</div><div class="mv-m"><span>' + esc(a.usuarioIni) + ' · ' + X.fecha(a.inicio) + '</span>' + (a.estado === 'EN CURSO' ? '<span>lleva ' + dur(a.inicio) + '</span>' : '') + '</div></div>' + (a.estado === 'EN CURSO' ? '<button class="btn chico ok" data-a="finElegir" data-v="' + esc(a.id) + '">✅ Terminar</button>' : '') + '</div>';
    return '<div class="mv fin"><div class="mv-i">✅</div><div class="mv-c"><div class="mv-t">Terminó el armado</div><div class="mv-s">' + esc(a.elemento) + '</div><div class="mv-m"><span>Duró ' + dur(a.inicio, a.fin) + '</span><span>' + esc(a.sobrante || '') + '</span><span>' + esc(a.usuarioFin) + ' · ' + X.fecha(a.fin) + '</span></div></div></div>';
  }
  function eventos() {
    var S = X.S, L = [], G = {}, orden = [];
    S.estado.pedidos.forEach(function (p) {
      if (/^(SOBRANTE|TRASLADO|AJUSTE|STOCK)$/.test(String(p.pedido))) return;
      L.push({ f: p.fecha, est: p.estructura, h: X.vMov({ t: 'E', f: p.fecha, p: p }, true) });
    });
    armados().forEach(function (a) {
      if (a.estado === 'ANULADO') return;
      L.push({ f: a.inicio, est: a.elemento, h: cardArm(a, false) });
      if (a.estado === 'TERMINADO') L.push({ f: a.fin, est: a.elemento, h: cardArm(a, true) });
    });
    S.estado.salidas.forEach(function (s) { var k = String(s.id).replace(/-\d+$/, ''); if (!G[k]) { G[k] = []; orden.push(k); } G[k].push(s); });
    orden.forEach(function (k) {
      var g = G[k]; if (SISTEMA.test(String(g[0].obs || ''))) return;
      L.push({ f: g[0].fecha, est: g[0].elemento, h: X.vMov({ t: 'S', f: g[0].fecha, s: g[0], g: g }, true) });
    });
    var q = String(S.mq || '').trim().toLowerCase();
    if (q) {
      var est = {}; S.estado.pedidos.forEach(function (p) { if (String(p.pedido).toLowerCase() === q) est[p.estructura] = 1; });
      L = L.filter(function (e) { return e.est ? !!est[e.est] : false; });
    }
    return L.filter(function (e) { return q || X.enPer(e.f); }).sort(function (a, b) { return a.f < b.f ? 1 : a.f > b.f ? -1 : 0; });
  }
  function vRegistro() {
    var h = '';
    h += X.vFiltro() + '<div class="card"><div class="row2" style="justify-content:space-between"><h2 style="margin:0">🕒 Registro</h2><button class="btn chico sec" data-a="csv">⬇ Descargar CSV</button></div>' +
      '<div class="mfil"><label for="m-q">Filtrar por número de pedido</label><select id="m-q" data-f="mov.q"><option value="">Todos los pedidos</option>' + X.pedidosLista().map(function (n) { return '<option value="' + esc(n) + '"' + (String(X.S.mq || '') === String(n) ? ' selected' : '') + '>Pedido ' + esc(n) + '</option>'; }).join('') + '</select></div>' +
      (X.S.mq ? '<p class="peq mut">Mostrando todo lo del pedido ' + esc(X.S.mq) + ' (sin límite de fechas).</p>' : '') + '</div>';
    var E = eventos();
    if (!E.length) return h + '<div class="card vacio">Todavía no hay movimientos en este periodo.</div>';
    var dia = '';
    E.slice(0, 200).forEach(function (e) {
      var d = String(e.f).slice(0, 10);
      if (d !== dia) { dia = d; h += '<div class="dia">' + (d === X.hoyISO() ? 'Hoy · ' : '') + X.fechaDia(d) + '</div>'; }
      h += e.h;
    });
    if (E.length > 200) h += '<div class="peq mut cen">Se muestran los 200 más recientes. Cambie el periodo para ver otros.</div>';
    return h;
  }

  // ---------------------------------------------------------------- Llegó
  function vLlego() {
    var r = R().ing, h = '', m = r.modo || '';
    h += '<div class="card"><h2>📥 ¿Para qué llegó el acero?</h2></div><div class="bgs">' + grande('llegoModo', 'est', '🏗️', 'Para una estructura', 'Con cartilla (DLI o PDF)', m === 'est' ? 'sel' : '') +
      grande('llegoModo', 'rec', '📦', 'Stock estándar', 'Barras rectas de 6 y 12 m', m === 'rec' ? 'sel' : '') + grande('llegoModo', 'fig', '🧵', 'Stock figurado', 'Todo lo demás', m === 'fig' ? 'sel' : '') + '</div>';
    if (!m) return h;
    if (m === 'est') return h + (X.esAdmin() ? X.vCargar() : '<div class="card"><p class="mut" style="margin:0">La cartilla de una estructura la carga el administrador.</p></div>');
    r.stock = m === 'rec' ? 'ACERO RECTO' : 'ACERO FIGURADO'; if (r.stock === 'ACERO RECTO' && r.l !== '6' && r.l !== '12') r.l = '12';
    h += '<div class="card"><h2>' + (m === 'rec' ? '📦 Llegó al Stock estándar' : '🧵 Llegó al Stock figurado') + '</h2><div class="peq mut" style="margin-bottom:8px">' + (m === 'rec' ? 'Solo barras rectas de 6 m o 12 m.' : 'Estribos, ganchos, cortes y otros largos.') + ' Es obligatorio adjuntar la foto o el PDF de la remisión.</div>';
    var lista = Object.keys(X.C.PESOS).filter(function (k) { return k !== 'ALAMBRE'; }).sort(function (a, b) { return X.C.diamOrder(a) - X.C.diamOrder(b); });
    h += '<div class="fgrid"><div class="fld"><label>Varilla</label><select data-r="ing.d">' + lista.map(function (k) { return '<option value="' + esc(k) + '"' + (r.d === k ? ' selected' : '') + '>' + esc(X.C.diamLabel(k)) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fld"><label>Largo (m)</label>' + (r.stock === 'ACERO RECTO' ? '<div class="seg" style="margin:0"><button type="button" class="' + (r.l === '6' ? 'on' : '') + '" data-a="ingL" data-v="6">6 m</button><button type="button" class="' + (r.l === '12' ? 'on' : '') + '" data-a="ingL" data-v="12">12 m</button></div>' : '<input type="text" inputmode="decimal" value="' + esc(r.l) + '" data-r="ing.l">') + '</div>' +
      '<div class="fld"><label>Cantidad (piezas)</label><input type="text" inputmode="numeric" placeholder="Ej. 50" value="' + esc(r.c) + '" data-r="ing.c"></div>' +
      '<div class="fld"><label>Kilos que llegaron</label><input type="text" inputmode="decimal" placeholder="' + (r.c ? 'Aprox. ' + X.kg((X.C.PESOS[r.d] || 0) * (parseFloat(String(r.l).replace(',', '.')) || 0) * (parseInt(r.c, 10) || 0)) : 'Según la remisión') + '" value="' + esc(r.k) + '" data-r="ing.k"></div></div>' +
      '<button class="btn blk" data-a="ingAdd" style="margin-top:8px">➕ Agregar a la lista</button>';
    if (r.rows.length) {
      h += '<div class="lst">' + r.rows.map(function (x, i) { return '<div class="fila"><div><b>' + pz(x.c) + '</b> · ' + esc(X.C.diamLabel(x.d)) + ' · ' + x.l + ' m · ' + X.kg(x.k) + ' kg</div><button class="btn chico sec" data-a="ingDel" data-v="' + i + '">Quitar</button></div>'; }).join('') + '</div>' +
        '<div class="fld" style="margin-top:8px"><label>📎 Foto o PDF de la remisión (obligatorio)</label><input id="ing-file" type="file" accept="image/*,application/pdf" data-r="ing.file">' + (r.file ? '<div class="peq" style="margin-top:4px">✅ ' + esc(r.file.nombre) + '</div>' : '<div class="peq mut" style="margin-top:4px">No puede llegar acero sin soporte.</div>') + '</div>' +
        '<div class="fld" style="margin-top:8px"><label>Número de pedido o remisión (opcional)</label><input type="text" value="' + esc(r.pedido) + '" data-r="ing.pedido"></div>' +
        '<button class="btn blk ok" data-a="ingOk"' + (r.busy ? ' disabled' : '') + '>' + (r.busy ? 'Guardando…' : '✅ Guardar la llegada') + '</button>';
    }
    if (r.err) h += '<div class="error">' + esc(r.err) + '</div>';
    return h + '</div>';
  }

  // ---------------------------------------------------------------- Armar
  function vArmar() {
    var q = String(R().arm.q || '').trim().toLowerCase(), cur = {}, h = '';
    enCurso().forEach(function (a) { cur[a.elemento] = a; });
    h += '<div class="card"><h2>🔧 ¿Qué estructura vas a armar?</h2><input type="search" class="busca" placeholder="Buscar estructura o pedido…" value="' + esc(R().arm.q) + '" data-r="arm.q"></div>';
    var L = estructuras().filter(function (e) { return (e.lib > 0 || cur[e.n]) && (!q || e.n.toLowerCase().indexOf(q) >= 0 || String(e.ped).toLowerCase().indexOf(q) >= 0); });
    L.sort(function (a, b) { return (cur[b.n] ? 1 : 0) - (cur[a.n] ? 1 : 0) || (a.n < b.n ? -1 : 1); });
    if (!L.length) return h + '<div class="card vacio">No hay estructuras con acero sin armar' + (q ? ' que coincidan con la búsqueda' : '') + '.</div>';
    L.slice(0, 60).forEach(function (e) {
      var a = cur[e.n];
      h += '<div class="card est' + (a ? ' en' : '') + '"><div class="est-t"><b>' + esc(e.n) + '</b><span class="peq mut">Pedido ' + esc(e.ped) + '</span></div><div class="est-n"><span>✅ Libre ' + X.n0(e.lib) + '</span><span>🔧 Armado ' + X.n0(e.arm) + '</span></div>' +
        (a ? '<div class="peq mut" style="margin:6px 0">Empezó ' + X.fecha(a.inicio) + ' · lleva ' + dur(a.inicio) + '</div><div class="row2"><button class="btn ok" data-a="finElegir" data-v="' + esc(a.id) + '">✅ Terminar armado</button><button class="btn sec" data-a="armCancel" data-v="' + esc(a.id) + '">Cancelar</button></div>'
          : '<button class="btn blk" data-a="armIni" data-v="' + esc(e.n) + '">🔧 Empezar a armar</button>') + '</div>';
    });
    if (L.length > 60) h += '<div class="peq mut cen">Hay más estructuras: escribe en el buscador.</div>';
    return h;
  }

  // ---------------------------------------------------------------- Fin de armado
  function vFin() {
    var f = R().fin, cur = enCurso(), h = '';
    if (f.ok) return '<div class="card okmsg2"><b>' + esc(f.ok) + '</b></div><div class="bgs">' + grande('tab', 'reg', '🏠', 'Ver el registro') + grande('tab', 'armar', '🔧', 'Armar otra estructura') + '</div>';
    if (cur.length === 1 && !f.id && !f.libre) f.id = cur[0].id;
    var a = cur.filter(function (x) { return x.id === f.id; })[0];
    if (!cur.length) return '<div class="card vacio">No hay ningún armado en curso.<div style="margin-top:10px"><button class="btn" data-a="tab" data-v="armar">🔧 Ir a Armar</button></div></div>';
    if (!a) {
      h = '<div class="card"><h2>✅ ¿Cuál armado terminó?</h2><p class="mut" style="margin:0">Toca la estructura.</p></div>';
      return h + cur.map(function (x) { return '<div class="card est"><div class="est-t"><b>' + esc(x.elemento) + '</b></div><div class="peq mut">Empezó ' + X.fecha(x.inicio) + ' · lleva ' + dur(x.inicio) + '</div><button class="btn blk" style="margin-top:8px" data-a="finElegir" data-v="' + esc(x.id) + '">✅ Terminó este armado</button></div>'; }).join('');
    }
    var pos = posiciones(a.elemento).filter(function (p) { return p.lib > 0; });
    h += '<div class="card"><div class="est-t"><b>' + esc(a.elemento) + '</b></div><div class="peq mut">Empezó ' + X.fecha(a.inicio) + ' · lleva ' + dur(a.inicio) + '</div>' + (cur.length > 1 ? '<div style="margin-top:8px"><button class="btn chico sec" data-a="finOtro">Cambiar de estructura</button></div>' : '') + '</div>';
    // Paso 1: acero del stock (opcional)
    var sp = posiciones(f.stk).filter(function (p) { return p.sal > 0; });
    h += '<div class="card"><h2>1️⃣ ¿Usaste acero del stock en esta estructura? <span class="tag">opcional</span></h2><div class="seg">' + STK.map(function (s) { return '<button type="button" class="' + (f.stk === s ? 'on' : '') + '" data-a="finStk" data-v="' + s + '">' + NOM[s] + '</button>'; }).join('') + '</div>';
    if (!sp.length) h += '<div class="peq mut">No hay acero en este stock.</div>';
    else {
      h += sp.map(function (p) { var v = f.sv[p.k + '|' + p.m] || 0; return '<div class="fila"><div><b>' + esc(X.C.diamLabel(p.d)) + '</b> · ' + p.largo + ' m<div class="peq mut">Hay ' + X.n0(p.sal) + '</div></div>' + stp('sv', p.k + '|' + p.m, v, p.sal) + '</div>'; }).join('');
      var tot = 0; Object.keys(f.sv).forEach(function (k) { tot += f.sv[k] || 0; });
      if (tot > 0) h += '<button class="btn blk" style="margin-top:8px" data-a="finUsarStock"' + (f.busy ? ' disabled' : '') + '>' + (f.busy ? 'Guardando…' : '⬇️ Pasar ' + pz(tot) + ' a esta estructura') + '</button>';
    }
    h += '</div>';
    // Paso 2: sobrante
    h += '<div class="card"><h2>2️⃣ ¿Quedó acero sin usar?</h2><div class="row2">' + '<button class="btn ' + (f.modo === 'no' ? 'ok' : 'sec') + '" data-a="finModo" data-v="no">No, usé todo</button><button class="btn ' + (f.modo === 'si' ? 'ok' : 'sec') + '" data-a="finModo" data-v="si">Sí, quedó algo</button></div>';
    var sob = { r: 0, f: 0 };
    if (f.modo === 'si') {
      h += '<div class="peq mut" style="margin:10px 0 4px">Escribe cuántas piezas <b>sobraron</b> de cada posición (déjalas en 0 si se usaron todas).</div>' +
        (pos.length ? pos.map(function (p) { var v = f.vals[p.k + '|' + p.m] || 0; return '<div class="fila"><div><b>' + esc(X.posTxt(a.elemento, p.m)) + '</b> · ' + esc(X.C.diamLabel(p.d)) + ' · ' + p.largo + ' m<div class="peq mut">Sin armar: ' + X.n0(p.lib) + '</div></div>' + stp('fin', p.k + '|' + p.m, v, p.lib) + '</div>'; }).join('') : '<div class="peq mut">No hay piezas sin armar.</div>');
    }
    pos.forEach(function (p) { var q = f.modo === 'si' ? (f.vals[p.k + '|' + p.m] || 0) : 0; if (Math.round(p.largo * 100) / 100 === 6 || Math.round(p.largo * 100) / 100 === 12) sob.r += q; else sob.f += q; });
    if (f.modo) {
      var usan = 0; pos.forEach(function (p) { usan += p.lib - (f.modo === 'si' ? (f.vals[p.k + '|' + p.m] || 0) : 0); });
      h += '<div class="resu">Se arman <b>' + X.n0(usan) + '</b> piezas' + (sob.r || sob.f ? ' · sobran: <b>' + X.n0(sob.r) + '</b> → Stock estándar, <b>' + X.n0(sob.f) + '</b> → Stock figurado' : ' · no sobra nada') + '.</div>' +
        '<button class="btn blk ok" data-a="finOk"' + (f.busy ? ' disabled' : '') + '>' + (f.busy ? 'Guardando…' : '✅ Terminar armado') + '</button>';
    }
    if (f.err) h += '<div class="error">' + esc(f.err) + '</div>';
    return h + '</div>';
  }

  // ---------------------------------------------------------------- Salió
  function destinos() {
    var S = X.S, seen = {}, L = [];
    estructuras().forEach(function (e) { if (!seen[e.n]) { seen[e.n] = 1; L.push(e.n); } });
    var rec = [];
    S.estado.salidas.slice().reverse().forEach(function (s) { var d = String(s.destino || '').trim(); if (d && !seen[d]) { seen[d] = 1; rec.push(d); } });
    return { todos: L.concat(rec), rec: rec.slice(0, 6) };
  }
  function vSalio() {
    var s = R().sal, h = '';
    if (s.ok) return '<div class="card okmsg2"><b>' + esc(s.ok) + '</b></div><div class="bgs">' + grande('tab', 'reg', '🏠', 'Ver el registro') + grande('rSalNueva', null, '🚚', 'Otra salida') + '</div>';
    if (!s.tipo) return '<div class="card"><h2>🚚 ¿Qué sale?</h2></div><div class="bgs">' + grande('salTipo', 'est', '🏗️', 'Estructura armada', 'Sale todo lo que se armó') + grande('salTipo', 'stk', '📦', 'Acero del stock', 'Estándar o figurado') + '</div>' +
      '<div class="peq mut cen">El acero de una estructura sin armar no puede salir.</div>';
    h += '<div style="margin-bottom:10px">' + atras('salio', 'Cambiar') + '</div>';
    if (s.tipo === 'est') {
      if (!s.elem) {
        var L = estructuras().filter(function (e) { return e.arm > 0; });
        h += '<div class="card"><h2>🏗️ ¿Qué estructura sale?</h2></div>';
        if (!L.length) return h + '<div class="card vacio">No hay estructuras armadas esperando salir.</div>';
        return h + L.map(function (e) { return '<div class="card est"><div class="est-t"><b>' + esc(e.n) + '</b></div><div class="est-n"><span>🔧 Armado ' + X.n0(e.arm) + ' piezas</span><span>' + X.n0(Math.round(e.armKg)) + ' kg</span></div><button class="btn blk" data-a="salElem" data-v="' + esc(e.n) + '">🚚 Sacar esta estructura</button></div>'; }).join('');
      }
      var e0 = estructuras().filter(function (e) { return e.n === s.elem; })[0] || { arm: 0, armKg: 0 };
      h += '<div class="card"><div class="est-t"><b>' + esc(s.elem) + '</b></div><p style="margin:8px 0">Sale todo lo armado: <b>' + X.n0(e0.arm) + '</b> piezas · <b>' + X.n0(Math.round(e0.armKg)) + '</b> kg.</p>' +
        '<button class="btn blk ok" data-a="salOk"' + (s.busy ? ' disabled' : '') + '>' + (s.busy ? 'Guardando…' : '✅ Confirmar salida') + '</button>' + (s.err ? '<div class="error">' + esc(s.err) + '</div>' : '') + '</div>';
      return h;
    }
    // Del stock
    h += '<div class="card"><h2>📦 ¿De qué stock sale?</h2><div class="seg">' + STK.map(function (k) { return '<button type="button" class="' + (s.stock === k ? 'on' : '') + '" data-a="salStk" data-v="' + k + '">' + NOM[k] + '</button>'; }).join('') + '</div>';
    if (!s.stock) return h + '</div>';
    var P = posiciones(s.stock).filter(function (p) { return p.sal > 0; });
    if (!P.length) return h + '<div class="peq mut">No hay acero en este stock.</div></div>';
    h += P.map(function (p) { var v = s.vals[p.k + '|' + p.m] || 0; return '<div class="fila"><div><b>' + esc(X.C.diamLabel(p.d)) + '</b> · ' + p.largo + ' m<div class="peq mut">Hay ' + X.n0(p.sal) + '</div></div>' + stp('sal', p.k + '|' + p.m, v, p.sal) + '</div>'; }).join('') + '</div>';
    var D = destinos();
    h += '<div class="card"><h2>🏗️ ¿Para qué estructura?</h2>' + (D.rec.length ? '<div class="chips">' + D.rec.map(function (d) { return '<button type="button" class="chip' + (s.dest === d ? ' on' : '') + '" data-a="salDest" data-v="' + esc(d) + '">' + esc(d) + '</button>'; }).join('') + '</div>' : '') +
      '<input type="text" class="busca" list="dl-dest" placeholder="Escribe o escoge la estructura…" value="' + esc(s.dest) + '" data-r="sal.dest"><datalist id="dl-dest">' + D.todos.map(function (d) { return '<option value="' + esc(d) + '">'; }).join('') + '</datalist>' +
      '<div class="chips" style="margin-top:8px"><button type="button" class="chip' + (s.dest === 'SIN ESTRUCTURA' ? ' on' : '') + '" data-a="salDest" data-v="SIN ESTRUCTURA">Sin estructura</button></div>';
    var tot = 0; Object.keys(s.vals).forEach(function (k) { tot += s.vals[k] || 0; });
    h += '<button class="btn blk ok" style="margin-top:10px" data-a="salOk"' + (s.busy || !tot ? ' disabled' : '') + '>' + (s.busy ? 'Guardando…' : tot ? '✅ Sacar ' + pz(tot) : 'Escoge cuántas piezas') + '</button>' + (s.err ? '<div class="error">' + esc(s.err) + '</div>' : '') + '</div>';
    return h;
  }

  // ---------------------------------------------------------------- Stock
  function vStock() {
    var k = R().stk.k, P = posiciones(k).filter(function (p) { return p.sal > 0; }), h = '', S = X.S, calc = S.calc || X.C.calcular(S.estado);
    h += '<div class="seg">' + STK.map(function (s) { var x = calc.porElem[s] || {}; return '<button type="button" class="' + (k === s ? 'on' : '') + '" data-a="stkVer" data-v="' + s + '">' + NOM[s] + '<br><small>' + X.n0(x.sal_p || 0) + ' piezas</small></button>'; }).join('') + '</div>';
    h += '<div class="peq mut" style="margin-bottom:8px">' + (k === 'ACERO RECTO' ? 'Solo barras rectas de 6 m y 12 m.' : 'Todo lo demás: figurado, cortes y otros largos.') + '</div>';
    if (!P.length) h += '<div class="card vacio">No hay acero en este stock.</div>';
    else {
      var kgT = 0, pT = 0;
      h += '<div class="card"><div class="tw"><table><thead><tr><th>Varilla</th><th class="n">Largo</th><th class="n">Piezas</th><th class="n">Kg</th></tr></thead><tbody>' + P.map(function (p) {
        var m = calc.porMarca[k + '|' + p.d + '|' + p.m] || {}; kgT += m.sal_kg || 0; pT += p.sal;
        return '<tr><td>' + esc(X.C.diamLabel(p.d)) + '</td><td class="n">' + p.largo + ' m</td><td class="n"><b>' + X.n0(p.sal) + '</b></td><td class="n">' + X.kg(m.sal_kg || 0) + '</td></tr>';
      }).join('') + '</tbody><tfoot><tr><td colspan="2"><b>Total</b></td><td class="n"><b>' + X.n0(pT) + '</b></td><td class="n"><b>' + X.kg(kgT) + '</b></td></tr></tfoot></table></div></div>';
    }
    return h + '<div class="bgs">' + grande('stkLlego', k, '📥', 'Llegó acero a este stock') + grande('stkSalio', k, '🚚', 'Sacar acero de este stock') + '</div>';
  }

  // ---------------------------------------------------------------- Vista principal
  function vista(tab) {
    switch (tab) {
      case 'reg': return vRegistro();
      case 'llego': return vLlego();
      case 'armar': return vArmar();
      case 'fin': return vFin();
      case 'salio': return vSalio();
      case 'stock': return vStock();
    }
    return null;
  }

  // ---------------------------------------------------------------- Acciones
  function fallo(o, msg) { o.busy = false; o.err = msg || 'No se pudo guardar'; X.render(); }
  function recargar() { return X.cargarEstado(); }
  function listaItems(P, vals) { var L = []; P.forEach(function (p) { var q = vals[p.k + '|' + p.m] || 0; if (q > 0) L.push({ p: p, q: q }); }); return L; }

  function click(a, v, el) {
    var S = X.S, r = R(), x;
    switch (a) {
      case 'rAtras': if (v === 'salio') { r.sal = { tipo: '', elem: '', stock: '', vals: {}, dest: '', err: '', busy: false, ok: '' }; } S.tab = v; X.render(); window.scrollTo(0, 0); return true;
      case 'rSalNueva': r.sal = { tipo: '', elem: '', stock: '', vals: {}, dest: '', err: '', busy: false, ok: '' }; X.render(); return true;
      case 'rs': { // paso + / −
        x = String(v).split('|'); var sc = x[0], key = decodeURIComponent(x[1]), d = +x[2], mx = +x[3], o = sc === 'fin' ? r.fin.vals : sc === 'sv' ? r.fin.sv : r.sal.vals;
        o[key] = Math.max(0, Math.min(mx, (o[key] || 0) + d)); X.render(); return true;
      }
      // ---- Llegó / ingreso a stock
      case 'llegoModo': r.ing.modo = v; r.ing.rows = []; r.ing.err = ''; X.render(); return true;
      case 'ingL': r.ing.l = v; X.render(); return true;
      case 'ingAdd': {
        var c = parseInt(String(r.ing.c).replace(/\D/g, ''), 10), l = parseFloat(String(r.ing.l).replace(',', '.'));
        if (!(c > 0)) { r.ing.err = 'Escribe cuántas piezas llegaron.'; X.render(); return true; }
        if (!(l > 0) || l > 30) { r.ing.err = 'Escribe el largo en metros.'; X.render(); return true; }
        if (r.ing.stock === 'ACERO RECTO' && l !== 6 && l !== 12) { r.ing.err = 'En el stock estándar solo entran barras de 6 m o 12 m.'; X.render(); return true; }
        var kl = parseFloat(String(r.ing.k).replace(',', '.'));
        if (!(kl > 0)) { r.ing.err = 'Escribe los kilos que llegaron de esta varilla (según la remisión).'; X.render(); return true; }
        r.ing.rows.push({ d: r.ing.d, l: l, c: c, k: kl }); r.ing.k = ''; r.ing.c = ''; r.ing.err = ''; X.render(); return true;
      }
      case 'ingDel': r.ing.rows.splice(+v, 1); X.render(); return true;
      case 'ingOk': {
        if (r.ing.busy || !r.ing.rows.length) return true;
        var items = r.ing.rows.map(function (w) { return { diametro: w.d, largo: w.l, cantidad: w.c, kg: w.k }; });
        if (!r.ing.file) { r.ing.err = 'Falta la foto o el PDF de la remisión: no puede llegar acero sin soporte.'; X.render(); return true; }
        r.ing.busy = true; r.ing.err = ''; X.render();
        X.Api.accion(S.ses, 'ingresoStock', { stock: r.ing.stock, items: items, pedido: r.ing.pedido, archivoB64: r.ing.file.b64, archivoNombre: r.ing.file.nombre, id: 'G' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) }).then(function (res) {
          if (!res.ok) return fallo(r.ing, res.error);
          var k = r.ing.stock; r.ing = { modo: r.ing.modo, stock: k, rows: [], d: r.ing.d, l: r.ing.l, c: '', k: '', file: null, pedido: '', err: '', busy: false };
          X.toast('✅ Llegada guardada en ' + NOM[k]); r.stk.k = k; S.tab = 'stock'; recargar();
        });
        return true;
      }
      case 'stkVer': r.stk.k = v; X.render(); return true;
      case 'stkLlego': r.ing.modo = v === 'ACERO RECTO' ? 'rec' : 'fig'; r.ing.rows = []; S.tab = 'llego'; X.render(); window.scrollTo(0, 0); return true;
      case 'stkSalio': r.sal = { tipo: 'stk', elem: '', stock: v, vals: {}, dest: '', err: '', busy: false, ok: '' }; S.tab = 'salio'; X.render(); window.scrollTo(0, 0); return true;
      // ---- Armar
      case 'armIni': {
        var id = 'A' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), now = new Date(), z = function (n) { return String(n).padStart(2, '0'); };
        var ini = X.hoyISO() + 'T' + z(now.getHours()) + ':' + z(now.getMinutes()) + ':' + z(now.getSeconds());
        if (enCurso().some(function (q) { return q.elemento === v; })) { X.toast('Ya se está armando'); return true; }
        var fila = { id: id, elemento: v, inicio: ini, fin: '', usuarioIni: S.ses.nombre, usuarioFin: '', estado: 'EN CURSO', sobrante: '', obs: '', pendiente: true };
        S.estado.armados = (S.estado.armados || []).concat([fila]); S.tab = 'reg'; X.render(); window.scrollTo(0, 0); X.toast('🔧 Armado empezado: ' + v);
        X.Api.accion(S.ses, 'armadoIniciar', { id: id, elemento: v, fecha: ini }).then(function (res) {
          if (!res.ok) { S.estado.armados = S.estado.armados.filter(function (q) { return q.id !== id; }); X.toast(res.error || 'No se pudo guardar'); X.render(); return; }
          recargar();
        });
        return true;
      }
      case 'armCancel':
        if (!confirm('¿Cancelar este armado? (No se pierde acero.)')) return true;
        S.estado.armados.forEach(function (q) { if (q.id === v) q.estado = 'ANULADO'; }); X.render();
        X.Api.accion(S.ses, 'armadoAnular', { id: v }).then(function (res) { if (!res.ok) X.toast(res.error || 'No se pudo cancelar'); recargar(); });
        return true;
      // ---- Fin de armado
      case 'finElegir': r.fin = { libre: false, id: v, modo: '', vals: {}, stk: 'ACERO RECTO', sv: {}, err: '', busy: false, ok: '' }; S.tab = 'fin'; X.render(); window.scrollTo(0, 0); return true;
      case 'finOtro': r.fin.id = ''; r.fin.libre = true; X.render(); return true;
      case 'finStk': r.fin.stk = v; r.fin.sv = {}; X.render(); return true;
      case 'finModo': r.fin.modo = v; r.fin.err = ''; if (v === 'no') r.fin.vals = {}; X.render(); return true;
      case 'finUsarStock': {
        var f = r.fin, ar = enCurso().filter(function (q) { return q.id === f.id; })[0]; if (!ar || f.busy) return true;
        var it = listaItems(posiciones(f.stk), f.sv).map(function (w) { return { stock: f.stk, diametro: w.p.d, marca: w.p.m, cantidad: w.q }; });
        if (!it.length) return true;
        f.busy = true; f.err = ''; X.render();
        X.Api.accion(S.ses, 'usarStock', { elemento: ar.elemento, items: it }).then(function (res) {
          if (!res.ok) return fallo(f, res.error);
          f.busy = false; f.sv = {}; X.toast('⬇️ Acero del stock pasó a ' + ar.elemento); recargar();
        });
        return true;
      }
      case 'finOk': {
        var g = r.fin, ar2 = enCurso().filter(function (q) { return q.id === g.id; })[0]; if (!ar2 || g.busy || !g.modo) return true;
        var pos = posiciones(ar2.elemento).filter(function (p) { return p.lib > 0; });
        var its = pos.map(function (p) { return { diametro: p.d, marca: p.m, queda: g.modo === 'si' ? (g.vals[p.k + '|' + p.m] || 0) : 0 }; });
        var nombre = ar2.elemento, tiempo = dur(ar2.inicio);
        g.busy = true; g.err = ''; X.render();
        X.Api.accion(S.ses, 'armadoFin', { id: ar2.id, items: its }).then(function (res) {
          if (!res.ok) return fallo(g, res.error);
          g.busy = false; g.ok = '✅ Armado terminado: ' + nombre + ' · duró ' + tiempo + (res.estandar || res.figurado ? ' · sobrante: ' + (res.estandar ? res.estandar + ' a Stock estándar' : '') + (res.estandar && res.figurado ? ', ' : '') + (res.figurado ? res.figurado + ' a Stock figurado' : '') : '');
          X.toast('✅ Armado terminado'); recargar();
        });
        return true;
      }
      // ---- Salió
      case 'salTipo': r.sal.tipo = v; r.sal.err = ''; X.render(); return true;
      case 'salElem': r.sal.elem = v; r.sal.err = ''; X.render(); return true;
      case 'salStk': r.sal.stock = v; r.sal.vals = {}; X.render(); return true;
      case 'salDest': r.sal.dest = v; X.render(); return true;
      case 'salOk': {
        var s = r.sal; if (s.busy) return true;
        var calc = S.calc || X.C.calcular(S.estado), items = [], fase = '', destino = '';
        if (s.tipo === 'est') {
          posiciones(s.elem).forEach(function (p) { if (p.arm > 0) items.push({ elemento: s.elem, diametro: p.d, marca: p.m, cantidad: p.arm }); });
          fase = 'ARMADO COMPLETO';
        } else {
          destino = String(s.dest || '').trim();
          if (!destino) { s.err = 'Escribe o escoge la estructura para la que sale este acero (o toca «Sin estructura»).'; X.render(); return true; }
          listaItems(posiciones(s.stock), s.vals).forEach(function (w) { items.push({ elemento: s.stock, diametro: w.p.d, marca: w.p.m, cantidad: w.q }); });
          fase = 'STOCK';
        }
        if (!items.length) { s.err = 'No hay piezas para sacar.'; X.render(); return true; }
        for (var i = 0; i < items.length; i++) { var er = X.C.validarSalida(calc, items[i].elemento, items[i].diametro, items[i].cantidad, items[i].marca); if (er) { s.err = er; X.render(); return true; } }
        var tp = 0; items.forEach(function (w) { tp += w.cantidad; });
        var txt = '🚚 Salida guardada: ' + pz(tp) + ' · ' + (s.tipo === 'est' ? s.elem : NOM[s.stock] + ' → ' + destino);
        s.busy = true; s.err = ''; X.render();
        X.Api.salidaLote(S.ses, { grupo: 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), items: items, obs: '', fecha: X.hoyISO(), hora: X.horaAhora(), fase: fase, modo: 'POS', pct: 0, tipo: 'SALIDA', destino: destino }).then(function (res) {
          s.busy = false; if (!res.ok) { s.err = res.error; X.render(); return; }
          s.ok = txt; window.scrollTo(0, 0); X.toast(txt);
          if (X.Api.remoto) { S.estado = X.Api.conCola(S.estado); X.render(); X.enviarCola(); } else recargar();
        });
        return true;
      }
    }
    return false;
  }

  /** Campos de texto: se guardan al escribir, sin redibujar (no se pierde el cursor). */
  function input(t) {
    var k = t.getAttribute('data-r'); if (!k) return false;
    var r = R(), p = k.split('.'), val = t.value;
    if (k === 'ing.c') val = val.replace(/[^\d]/g, '');
    if (k === 'ing.k') val = val.replace(/[^\d.,]/g, '');
    r[p[0]][p[1]] = val;
    if (k === 'arm.q') { X.S.focus = 'r-arm'; X.render(); var e = document.getElementById('r-arm'); if (e) { try { e.setSelectionRange(e.value.length, e.value.length); } catch (x) { } } }
    return true;
  }
  /** Foto o PDF: se reduce la foto para que suba rápido. */
  function leerSoporte(f) {
    var r = R().ing; if (!f) return;
    var fin = function (b64, nombre) { r.file = { nombre: nombre, b64: b64 }; r.err = ''; X.render(); };
    if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) { var fr = new FileReader(); fr.onload = function () { fin(String(fr.result).split(',')[1], f.name); }; fr.readAsDataURL(f); return; }
    var img = new Image(), u = URL.createObjectURL(f);
    img.onload = function () { var m = 1600, k = Math.min(1, m / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u); fin(cv.toDataURL('image/jpeg', 0.8).split(',')[1], f.name.replace(/\.[^.]+$/, '') + '.jpg'); };
    img.onerror = function () { r.err = 'No se pudo leer la foto.'; X.render(); }; img.src = u;
  }
  function cambio(t) { // listas desplegables
    var k = t.getAttribute('data-r'); if (!k) return false;
    if (k === 'ing.file') { leerSoporte(t.files && t.files[0]); return true; }
    var p = k.split('.'); R()[p[0]][p[1]] = t.value; if (k === 'ing.d') X.render(); return true;
  }

  /** Cuatro cifras gerenciales, sencillas. */
  function kpis() {
    var calc = X.S.calc || X.C.calcular(X.S.estado), E = estructuras(), arm = 0, armKg = 0, lib = 0, libKg = 0;
    E.forEach(function (e) { arm += e.arm; armKg += e.armKg; lib += e.lib; libKg += e.libKg; });
    var r = calc.porElem['ACERO RECTO'] || {}, f = calc.porElem['ACERO FIGURADO'] || {};
    function k(ico, t, v, sub, tab) { return '<button type="button" class="kg" data-a="tab" data-v="' + tab + '"><span>' + ico + ' ' + t + '</span><b>' + v + '</b><small>' + sub + '</small></button>'; }
    return '<div class="kgs">' + k('📦', 'Stock estándar', X.n0(r.sal_p || 0), X.kg(r.sal_kg || 0) + ' kg', 'stock') + k('🧵', 'Stock figurado', X.n0(f.sal_p || 0), X.kg(f.sal_kg || 0) + ' kg', 'stock') +
      k('🔧', 'Armando ahora', enCurso().length, enCurso().length === 1 ? 'estructura' : 'estructuras', 'fin') + k('🚚', 'Armado listo para salir', X.n0(arm), X.kg(armKg) + ' kg', 'salio') + '</div>';
  }
  function reset(tab) { var r = R(); if (tab !== 'fin') { r.fin.ok = ''; } if (tab !== 'salio' && r.sal.ok) { r.sal = { tipo: '', elem: '', stock: '', vals: {}, dest: '', err: '', busy: false, ok: '' }; } }
  window.AcReg = { kpis: kpis, reset: reset, init: function (c) { X = c; }, vista: vista, click: click, input: input, cambio: cambio, enCurso: enCurso };
})();
