(function (root) {
  'use strict';
  const VERDE = [21, 115, 52], VERDE_CLARO = [228, 242, 230], ROJO = [176, 0, 0], GRIS = [150, 150, 150];
  const fmt = f => { const p = String(f || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(f || ''); };
  const num = v => { const x = Number(String(v === undefined || v === null ? '' : v).replace(',', '.')); return isFinite(x) && String(v).trim() !== '' ? x : NaN; };
  function lugarTr(v, lado) {
    const uf = v.uf && v.uf !== 'OTRO' ? 'UF ' + v.uf : '', rec = v.mov === 'RECIBE';
    const t = lado === 'o' ? String(v.origen || '') : String(v.destino || '');
    const conUF = (lado === 'o') !== rec; // en ENTREGA la UF es el origen; en RECIBE es el destino
    return conUF && uf ? (t ? uf + ' · ' + t : uf) : t;
  }
  const volv = v => (num(v.vol_albaran) > 0 ? v.vol_albaran : v.cant); // en obra solo se muestra el volumen del albarán
  const f2 = v => { const x = num(v); return isNaN(x) ? '' : String(Math.round(x * 100) / 100); };

  // logo: { data: 'data:image/png;base64,...', w: px, h: px } o null
  function ponerLogo(doc, logo, x, y, maxW, maxH) {
    if (!logo || !logo.data) return false;
    try {
      const r = logo.w / logo.h;
      let w = maxW, h = w / r;
      if (h > maxH) { h = maxH; w = h * r; }
      doc.addImage(logo.data, logo.data.indexOf('image/png') > 0 ? 'PNG' : 'JPEG', x + (maxW - w) / 2, y + (maxH - h) / 2, w, h);
      return true;
    } catch (e) { return false; }
  }

  // ---------- VALE: Transporte y recibo de materiales ----------
  function generarVale(v, ctx, jsPDF, logo) {
    ctx = ctx || {};
    const doc = new jsPDF({ unit: 'mm', format: [140, 216], orientation: 'landscape' });
    const M = 8, X1 = 208, W = X1 - M, XM = 108;
    const L = (x1, y1, x2, y2) => doc.line(x1, y1, x2, y2);
    doc.setDrawColor.apply(doc, VERDE); doc.setLineWidth(0.5);
    function celda(x, y, w, h, relleno) { if (relleno) { doc.setFillColor.apply(doc, VERDE_CLARO); doc.rect(x, y, w, h, 'FD'); } else doc.rect(x, y, w, h); }
    function etiqueta(t, x, y, w, h, centro) {
      doc.setTextColor.apply(doc, VERDE); doc.setFont('helvetica', 'bold'); doc.setFontSize(centro ? 11 : 8.5);
      if (centro) doc.text(t, x + w / 2, y + h / 2 + 1.6, { align: 'center' }); else doc.text(t, x + 2, y + 4.5);
    }
    function valor(t, x, y, w, size, off) {
      doc.setTextColor(20, 32, 43); doc.setFont('helvetica', 'normal'); doc.setFontSize(size || 11);
      doc.text(String(t || ''), x + 2, y, { maxWidth: w - 4 });
    }
    // encabezado
    ponerLogo(doc, logo, M, 4, 38, 22);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
    const cod = v.n_valera ? 'Valera N° ' + v.n_valera + (v.valera_de === 'NUESTRA' ? ' (nuestra)' : v.valera_de === 'VOLQUETERO' ? ' (volquetero)' : '') : '';
    doc.text('Código: ' + cod, X1, 11, { align: 'right' });
    doc.setTextColor.apply(doc, VERDE); doc.setFontSize(17);
    doc.text('TRANSPORTE Y RECIBO DE MATERIALES', X1, 22, { align: 'right' });
    doc.setFillColor.apply(doc, VERDE); doc.rect(M, 27.5, W, 1.2, 'F');
    doc.setDrawColor.apply(doc, VERDE); doc.setLineWidth(0.5);
    // fila 1
    let y = 32;
    celda(M, y, 32, 15, true); etiqueta('VALE Nº', M, y, 32, 15, true);
    celda(M + 32, y, XM - M - 32, 15, false);
    doc.setFont('courier', 'bold'); doc.setFontSize(17); doc.setTextColor.apply(doc, ROJO);
    doc.text(String(v.cod || ''), M + 32 + (XM - M - 32) / 2, y + 10, { align: 'center' });
    celda(XM, y, 40, 15, true); etiqueta('FECHA', XM, y, 40, 15, true);
    const cw = (X1 - XM - 40) / 3, p = String(v.fecha || '').split('-');
    ['DÍA', 'MES', 'AÑO'].forEach((t, i) => {
      const x = XM + 40 + i * cw;
      celda(x, y, cw, 7.5, true); etiqueta(t, x, y, cw, 7.5, true);
      celda(x, y + 7.5, cw, 7.5, false);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(20, 32, 43);
      doc.text(p.length === 3 ? [p[2], p[1], p[0]][i] : '', x + cw / 2, y + 13, { align: 'center' });
    });
    doc.setFontSize(8);
    // fila 2: tipo de material | cantidad despachada
    y += 15;
    const H = 13.5;
    celda(M, y, XM - M, H, false); etiqueta('TIPO DE MATERIAL:', M, y, 0, 0); valor(v.material, M, y + 10.5, XM - M, 12);
    celda(XM, y, X1 - XM, H, false); etiqueta('CANTIDAD DESPACHADA (m3):', XM, y, 0, 0); valor(f2(volv(v)), XM, y + 10.5, X1 - XM, 12);
    y += H;
    celda(M, y, XM - M, H, false); etiqueta('ORIGEN:', M, y, 0, 0); valor(lugarTr(v, 'o'), M, y + 10.5, XM - M, 11);
    celda(XM, y, X1 - XM, H, false); etiqueta('DESTINO:', XM, y, 0, 0); valor(lugarTr(v, 'd'), XM, y + 10.5, X1 - XM, 11);
    y += H;
    celda(M, y, XM - M, H, false); etiqueta('HORA DE ENTRADA:', M, y, 0, 0); valor(v.hora_llegada, M, y + 10.5, XM - M, 12);
    celda(XM, y, X1 - XM, H * 2, false); etiqueta('PLACA VEHÍCULO:', XM, y, 0, 0);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(20, 32, 43); doc.text(String(v.placa || ''), XM + 3, y + 15);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(70, 70, 70);
    const sub = [v.empresa, v.tipo].filter(Boolean).join(' · ');
    if (sub) doc.text(sub, XM + 3, y + 21, { maxWidth: X1 - XM - 6 });
    if (v.conductor) doc.text('Conductor: ' + v.conductor, XM + 3, y + 25, { maxWidth: X1 - XM - 6 });
    y += H;
    const mitad = (XM - M) / 2;
    celda(M, y, mitad, H, false); etiqueta('HORA DE SALIDA:', M, y, 0, 0); valor(v.hora_salida, M, y + 10.5, mitad, 12);
    celda(M + mitad, y, mitad, H, false); etiqueta('CANTIDAD RECIBIDA (m3):', M + mitad, y, 0, 0); valor(f2(v.cant_recibida !== undefined && v.cant_recibida !== '' ? v.cant_recibida : volv(v)), M + mitad, y + 10.5, mitad, 12);
    y += H;
    // firmas
    const w3 = W / 3, hf = 17;
    for (let i = 0; i < 3; i++) celda(M + i * w3, y, w3, hf, true);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(70, 70, 70);
    if (ctx.nombre) doc.text(String(ctx.nombre), M + 2, y + hf - 2, { maxWidth: w3 - 4 });
    if (v.conductor) doc.text(String(v.conductor), M + w3 + 2, y + hf - 2, { maxWidth: w3 - 4 });
    y += hf;
    ['DESPACHADOR', 'TRANSPORTADOR', 'INSP. RECIBIDOR'].forEach((t, i) => { celda(M + i * w3, y, w3, 8, false); etiqueta(t, M + i * w3, y, w3, 8, true); });
    doc.setFontSize(6.5); doc.setTextColor.apply(doc, GRIS);
    doc.text('Original · Copia volquetero · Copia punto de disposición', M, 134);
    return doc;
  }

  // ---------- PLANILLA: Parte diario viajes de volquetas ----------
  const FILAS = 15;
  const COLS = [['No', 8], ['Número remisión\no consecutivo', 36], ['Placa\nVehículo', 22], ['Tipo de\nMaterial', 29], ['Centro de\ncostos', 20], ['Peso\n(Ton)', 14], ['Vol. albarán\n(m3)', 19], ['Vol. confirm.\n(m3)', 19], ['Origen', 28], ['Destino', 28], ['Kilómetros\nrecorridos', 17], ['Hora de\nLlegada', 18.4]];

  // Una sola planilla por día: todos los viajes en una tabla continua (se parte en hojas de FILAS filas).
  function grupos(viajes) {
    const v = viajes.slice().sort((a, b) => String(a.hora_salida || '99').localeCompare(String(b.hora_salida || '99')) || String(a.cod).localeCompare(String(b.cod)));
    if (!v.length) return [];
    const noche = v.filter(x => x.turno === 'NOCHE').length;
    const emp = Array.from(new Set(v.map(x => String(x.empresa || '').trim()).filter(Boolean)));
    return [{ turno: noche === 0 ? 'DIA' : (noche === v.length ? 'NOCHE' : 'AMBOS'), empresa: emp.length > 3 ? 'VARIAS EMPRESAS' : emp.join(' / '), v: v }];
  }
  // resumen por turno (Día / Noche)
  function porTurno(viajes) {
    return ['DIA', 'NOCHE'].map(t => ({ turno: t, v: viajes.filter(x => (x.turno === 'NOCHE' ? 'NOCHE' : 'DIA') === t) })).filter(g => g.v.length);
  }

  function generarPlanilla(fecha, viajes, ctx, jsPDF, logo) {
    ctx = ctx || {};
    const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'landscape' });
    const W = 279.4, M = 10, AN = W - 2 * M;
    doc.setDrawColor(0); doc.setLineWidth(0.3);
    const tx = (t, x, y, o) => doc.text(String(t), x, y, o || {});
    const gs = grupos(viajes);
    if (!gs.length) gs.push({ turno: 'DIA', empresa: '', v: [] });
    let primera = true;
    gs.forEach(g => {
      const paginas = Math.max(1, Math.ceil(g.v.length / FILAS));
      for (let pg = 0; pg < paginas; pg++) {
        if (!primera) doc.addPage(); primera = false;
        const filas = g.v.slice(pg * FILAS, (pg + 1) * FILAS);
        // encabezado
        doc.rect(M, 8, AN, 22); doc.line(M + 38, 8, M + 38, 30); doc.line(W - M - 50, 8, W - M - 50, 30);
        doc.line(W - M - 50, 15, W - M, 15); doc.line(W - M - 50, 22, W - M, 22);
        ponerLogo(doc, logo, M + 1, 9, 36, 20);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(0);
        tx('PARTE DIARIO VIAJES DE VOLQUETAS', M + 38 + (AN - 88) / 2, 21, { align: 'center' });
        doc.setFontSize(7);
        tx('CO-CO-1CO406-CNT-PL-015', W - M - 25, 13, { align: 'center' }); tx('Rev.0', W - M - 25, 19.5, { align: 'center' }); tx('Fecha Rev: 16/10/2026', W - M - 25, 26.5, { align: 'center' });
        // empresa / fecha / turno
        doc.rect(M, 32, AN, 10); doc.line(M + 150, 32, M + 150, 42); doc.line(M + 195, 32, M + 195, 42);
        doc.setFontSize(8.5); tx('EMPRESA / CONTRATISTA:', M + 2, 38); doc.setFont('helvetica', 'normal'); tx(g.empresa, M + 45, 38, { maxWidth: 103 });
        doc.setFont('helvetica', 'bold'); tx('FECHA:', M + 152, 38); doc.setFont('helvetica', 'normal'); tx(fmt(fecha), M + 166, 38);
        doc.setFont('helvetica', 'bold'); tx('TURNO:', M + 197, 36); tx('DÍA', M + 197, 40.5); tx('NOCHE', M + 220, 40.5);
        doc.rect(M + 207, 37.7, 3.6, 3.6); doc.rect(M + 235, 37.7, 3.6, 3.6);
        if (g.turno !== 'NOCHE') tx('X', M + 207.9, 40.7); if (g.turno !== 'DIA') tx('X', M + 235.9, 40.7);
        // cabecera de tabla
        let y = 44; const hh = 10;
        let x = M;
        doc.setFillColor(215, 224, 232); doc.setFontSize(7.5);
        COLS.forEach(c => { doc.setFillColor(215, 224, 232); doc.rect(x, y, c[1], hh, 'FD'); doc.setFont('helvetica', 'bold'); doc.setTextColor(0); tx(c[0], x + c[1] / 2, y + 4, { align: 'center' }); x += c[1]; });
        y += hh;
        const rh = 7.2;
        let vol = 0, volC = 0, viajesN = 0;
        for (let i = 0; i < FILAS; i++) {
          const r = filas[i]; x = M;
          const celdas = r ? [String(pg * FILAS + i + 1), null, r.placa, r.material, r.centro, f2(r.peso), f2(volv(r)), f2(r.cant), lugarTr(r, 'o'), lugarTr(r, 'd'), f2(r.km), r.hora_llegada].map(c => c === undefined || c === null ? '' : c) : [String(pg * FILAS + i + 1), '', '', '', '', '', '', '', '', '', '', ''];
          if (r) { const c = num(volv(r)); if (!isNaN(c)) vol += c; const cc = num(r.cant); if (!isNaN(cc)) volC += cc; viajesN++; }
          COLS.forEach((c, j) => {
            doc.rect(x, y, c[1], rh);
            doc.setTextColor(0);
            if (j === 1 && r) {
              doc.setFont('helvetica', 'normal');
              if (r.n_valera) { doc.setFontSize(8.5); tx(r.n_valera, x + 1.5, y + 3.6, { maxWidth: c[1] - 3 }); doc.setFontSize(5.8); doc.setTextColor(90); tx(r.cod, x + 1.5, y + 6.9, { maxWidth: c[1] - 3 }); }
              else { doc.setFontSize(7.5); tx(r.cod, x + 1.5, y + 4.8, { maxWidth: c[1] - 3 }); }
            } else {
              doc.setFont('helvetica', 'normal'); doc.setFontSize(j === 0 ? 7 : 8);
              tx(celdas[j], j === 0 ? x + c[1] / 2 : x + 1.5, y + 5, j === 0 ? { align: 'center' } : { maxWidth: c[1] - 3 });
            }
            x += c[1];
          });
          y += rh;
        }
        // pie
        y += 3;
        doc.setTextColor(0); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
        doc.rect(M, y, 130, 20); tx('ESTADO DEL TIEMPO:', M + 2, y + 5);
        doc.rect(M + 130, y, AN - 130, 20); tx('RESUMEN Y OBSERVACIONES', M + 132, y + 5);
        const obs = g.v.map(r => r.obs).filter(Boolean).join(' | ');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); tx(obs, M + 132, y + 9, { maxWidth: AN - 134 });
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        tx('VOL. ALBARÁN HOJA: ' + (Math.round(vol * 100) / 100) + ' m3  ·  VOL. CONFIRMADO HOJA: ' + (Math.round(volC * 100) / 100) + ' m3', M + 2, y + 11); tx('VIAJES DE LA HOJA: ' + viajesN, M + 2, y + 17);
        if (pg === paginas - 1) { const tv0 = g.v.reduce((a, r) => a + (isNaN(num(volv(r))) ? 0 : num(volv(r))), 0); const tc0 = g.v.reduce((a, r) => a + (isNaN(num(r.cant)) ? 0 : num(r.cant)), 0); tx('TOTAL DEL DÍA: ' + g.v.length + ' viajes · alb. ' + (Math.round(tv0 * 100) / 100) + ' m3 · conf. ' + (Math.round(tc0 * 100) / 100) + ' m3', M + 40, y + 17); }
        y += 22;
        doc.rect(M, y, AN / 2, 17); doc.rect(M + AN / 2, y, AN / 2, 17);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        tx('NOMBRE OPERARIO:', M + 2, y + 5); tx('FIRMA OPERARIO', M + 2, y + 15);
        tx('NOMBRE SUPERVISOR: ' + (ctx.nombre || ''), M + AN / 2 + 2, y + 5); tx('FIRMA SUPERVISOR', M + AN / 2 + 2, y + 15);
        doc.setFontSize(6.5); doc.setTextColor(GRIS[0]); tx('Hoja ' + (pg + 1) + ' de ' + paginas, W - M, 211, { align: 'right' });
      }
    });
    return doc;
  }

  const PDT = { generarVale, generarPlanilla, grupos, porTurno };
  if (typeof module !== 'undefined' && module.exports) module.exports = PDT; else root.PDT = PDT;
})(typeof window !== 'undefined' ? window : globalThis);
