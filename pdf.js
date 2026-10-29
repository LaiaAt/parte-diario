(function (root) {
  'use strict';
  const LOGO = 'data:image/jpeg;base64,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', LOGO_R = 0.7778;
  const PD = (typeof module !== 'undefined' && module.exports) ? require('./comun.js') : root.PD;

  const ESTADO_MAQ = { 'OPERANDO': '', 'VARADA': 'VARADA', 'OPERO Y SE VARO': 'OPERO Y SE VARO', 'NO ESTUVO': 'NO ESTUVO' };

  // parte: estructura del formulario. ctx: { encargado, residente, control }
  function generarParteDoc(parte, ctx, jsPDF) {
    ctx = ctx || {};
    const doc = new jsPDF({ unit: 'mm', format: 'letter' });
    const W = 215.9, H = 279.4, M = 10, AN = W - 2 * M;
    const acts = parte.actividades || [];
    const K = Math.max(4, acts.length);
    const wA = Math.min(6, 66 / K); // las columnas de actividades se ajustan si hay muchas
    const negro = [0, 0, 0];

    function rect(x, y, w, h) { doc.setDrawColor(0); doc.setLineWidth(0.3); doc.rect(x, y, w, h); }
    function txt(t, x, y, o) { doc.text(String(t), x, y, o || {}); }

    // ---------- Encabezado ----------
    function encabezado() {
      rect(M, 8, AN, 20);
      doc.line(M + 38, 8, M + 38, 28);
      doc.line(W - M - 46, 8, W - M - 46, 28);
      doc.line(W - M - 46, 14, W - M, 14);
      doc.line(W - M - 46, 21, W - M, 21);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      try { doc.addImage(LOGO, 'JPEG', M + 7.4, 9, 23.2, 18); } catch (e) {
        txt('Consorcio Constructor', M + 19, 16.5, { align: 'center' });
        txt('Sabana Norte', M + 19, 20.5, { align: 'center' }); }
      doc.setFontSize(11);
      const cx = M + 38 + (AN - 38 - 46) / 2;
      txt('CONTROL DIARIO DE MEDICION', cx, 16.5, { align: 'center' });
      txt('Y SEGUIMIENTO DE OBRAS', cx, 22, { align: 'center' });
      doc.setFontSize(6.5);
      txt('CO-CO-1CO406-GES-PL-005', W - M - 23, 12, { align: 'center' });
      txt('Rev.0', W - M - 23, 18.5, { align: 'center' });
      txt('Fecha Rev: 2/03/2023', W - M - 23, 25, { align: 'center' });
    }

    function datosDia() {
      const y = 30;
      rect(M, y, AN, 14);
      doc.line(M + 105, y, M + 105, y + 14);
      doc.line(M, y + 7, W - M, y + 7);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold'); txt('FECHA:', M + 2, y + 5);
      doc.setFont('helvetica', 'normal'); txt(PD.fechaLarga(parte.fecha), M + 18, y + 5);
      if (ctx.llave) { doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); txt('CODIGO:', M + 40, y + 5); doc.setFont('helvetica', 'normal'); txt(PD.codigoParte(parte.fecha, ctx.llave, parte.n, parte.rev), M + 54, y + 5, { maxWidth: 50 }); doc.setFontSize(8.5); }
      doc.setFont('helvetica', 'bold'); txt('LOCALIZACION:', M + 107, y + 5);
      doc.setFont('helvetica', 'normal'); txt(parte.encabezado.localizacion || '', M + 135, y + 5, { maxWidth: AN - 137 });
      const llovio = parte.clima_sel === 'si';
      doc.setFont('helvetica', 'bold'); txt('LLUVIAS:', M + 2, y + 12);
      doc.setFont('helvetica', 'normal');
      txt('SI', M + 20, y + 12); rect(M + 25, y + 8.8, 3.6, 3.6);
      txt('NO', M + 32, y + 12); rect(M + 37.5, y + 8.8, 3.6, 3.6);
      doc.setFont('helvetica', 'bold');
      txt('X', llovio ? M + 25.9 : M + 38.4, y + 12);
      doc.setFont('helvetica', 'normal');
      const tiempo = (parte.clima || []).map(c => (c.tipo ? c.tipo + ' ' : '') + c.inicio + '-' + c.fin).join('; ');
      doc.setFontSize(7);
      txt('Tiempo: ' + tiempo, M + 44, y + 12, { maxWidth: 59 });
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold'); txt('PK.:', M + 107, y + 12);
      doc.setFont('helvetica', 'normal'); txt(parte.encabezado.pk || '', M + 135, y + 12, { maxWidth: AN - 137 });
      return y + 14;
    }

    function barra(titulo, y) {
      doc.setFillColor(0, 0, 0);
      doc.rect(M, y, AN, 5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      txt(titulo, W / 2, y + 3.6, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      return y + 5;
    }

    const estiloBase = {
      fontSize: 7.5, cellPadding: 1.1, lineColor: negro, lineWidth: 0.2,
      textColor: negro, valign: 'middle', overflow: 'linebreak'
    };
    const estiloCab = { fillColor: [255, 255, 255], textColor: negro, fontStyle: 'bold', halign: 'center', fontSize: 7 };

    function espacio(y, necesario) {
      if (y + necesario > H - 14) { doc.addPage(); return 12; }
      return y;
    }

    function tabla(y, head, body, colStyles) {
      doc.autoTable({
        startY: y, head: head, body: body, theme: 'grid',
        styles: estiloBase, headStyles: estiloCab, columnStyles: colStyles,
        margin: { left: M, right: M, top: 12, bottom: 14 }
      });
      return doc.lastAutoTable.finalY;
    }

    function relleno(body, min, ncols) {
      const b = body.slice();
      while (b.length < min) b.push(new Array(ncols).fill(''));
      return b;
    }

    function marcas(a) {
      const r = [];
      for (let i = 1; i <= K; i++) r.push((a && a.indexOf(i) >= 0) ? 'X' : '');
      return r;
    }

    function estiloActs(inicio) {
      const s = {};
      for (let i = 0; i < K; i++) s[inicio + i] = { cellWidth: wA, halign: 'center', cellPadding: K > 10 ? 0.3 : 1.1, fontSize: K > 10 ? 6 : 7.5 };
      return s;
    }

    // ---------- Página 1 ----------
    encabezado();
    let y = datosDia();
    y = barra('UP - DESGLOSE DE ACTIVIDADES', y);

    const bodyAct = acts.map(a => {
      const n = PD.dimsDe(a.unidad);
      const dims = [];
      for (let i = 1; i <= n; i++) dims.push(PD.fmt(a['d' + i]));
      let o = dims.join(' x ');
      if (PD.num(a.descuentos) > 0) o += ' | Desc: ' + PD.fmt(a.descuentos);
      if (PD.num(a.factor) !== 1) o += ' | Factor: ' + PD.fmt(a.factor);
      if (a.obs) o += (o ? ' | ' : '') + a.obs;
      return [String(a.n), a.descripcion, PD.fmt(PD.cantidadActividad(a)), PD.undPdf(a.unidad), o];
    });
    y = tabla(y, [['', 'ACTIVIDAD', 'CANT.', 'UND', 'OBSERVACIONES']],
      relleno(bodyAct, 4, 5),
      { 0: { cellWidth: 7, halign: 'center', fontStyle: 'bold' }, 2: { cellWidth: 17, halign: 'right' }, 3: { cellWidth: 12, halign: 'center' }, 4: { cellWidth: 60 } });

    // Mano de obra
    y = espacio(y, 30);
    y = barra('REPORTE DIARIO MANO DE OBRA CCSN', y);
    const presentes = (parte.personal || []).filter(p => p.estado !== 'AUSENTE');
    const ausentes = (parte.personal || []).filter(p => p.estado === 'AUSENTE').map(p => p.nombre);
    const nA = K;
    const headMO = [
      [{ content: 'C COSTE', rowSpan: 2 }, { content: 'PERSONAL', rowSpan: 2 }, { content: 'CATEGORIA', rowSpan: 2 },
        { content: 'HORAS', colSpan: 3 }, { content: 'TRABAJO REALIZADO', colSpan: nA }, { content: 'OBSERVACIONES', rowSpan: 2 }],
      ['INICIO', 'FINAL', 'TOTAL'].concat(Array.from({ length: nA }, (_, i) => String(i + 1)))
    ];
    const bodyMO = presentes.map(p => [p.c_costo, p.nombre, p.cargo, p.inicio, p.fin, PD.fmt(PD.horasEntre(p.inicio, p.fin))].concat(marcas(p.acts)).concat(['']));
    y = tabla(y, headMO, relleno(bodyMO, 8, 7 + nA),
      Object.assign({ 0: { cellWidth: 13 }, 2: { cellWidth: 20 }, 3: { cellWidth: 11, halign: 'center' }, 4: { cellWidth: 11, halign: 'center' }, 5: { cellWidth: 10, halign: 'center' } }, estiloActs(6), { [6 + nA]: { cellWidth: 26 } }));
    if (ausentes.length) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(7);
      txt('Ausentes: ' + ausentes.join(', '), M, y + 3.5, { maxWidth: AN });
      y += 5;
    }

    // Maquinaria
    y = espacio(y, 30);
    y = barra('MAQUINARIA', y);
    const maqs = (parte.maquinas || []).filter(m => m.estado !== 'NO ESTUVO');
    const headMQ = [
      [{ content: 'C COSTE', rowSpan: 2 }, { content: 'NOMBRE', rowSpan: 2 }, { content: 'No RECIBO', rowSpan: 2 },
        { content: 'HORAS', colSpan: 3 }, { content: 'TRABAJO REALIZADO', colSpan: nA }, { content: 'ESTADO / OBSERVACIONES', rowSpan: 2 }],
      ['INICIO', 'FINAL', 'TOTAL'].concat(Array.from({ length: nA }, (_, i) => String(i + 1)))
    ];
    const bodyMQ = maqs.map(m => {
      const est = ESTADO_MAQ[m.estado] || '';
      const o = [est, m.obs].filter(Boolean).join(' - ');
      return [m.c_costo, m.nombre, m.recibo, m.inicio, m.fin, PD.fmt(PD.horasEntre(m.inicio, m.fin))].concat(marcas(m.acts)).concat([o]);
    });
    y = tabla(y, headMQ, relleno(bodyMQ, 3, 7 + nA),
      Object.assign({ 0: { cellWidth: 13 }, 2: { cellWidth: 15 }, 3: { cellWidth: 11, halign: 'center' }, 4: { cellWidth: 11, halign: 'center' }, 5: { cellWidth: 10, halign: 'center' } }, estiloActs(6), { [6 + nA]: { cellWidth: 30 } }));

    // Materiales
    y = espacio(y, 30);
    y = barra('MATERIALES', y);
    const mats = (parte.materiales || []).filter(m => m.estado !== 'NO USADO');
    const headMT = [
      [{ content: 'C COSTE', rowSpan: 2 }, { content: 'NOMBRE', rowSpan: 2 }, { content: 'PROCEDENCIA', rowSpan: 2 },
        { content: 'CANT.', rowSpan: 2 }, { content: 'UBICACION', rowSpan: 2 }, { content: 'TRABAJO REALIZADO', colSpan: nA }, { content: 'UND. MEDIDA', rowSpan: 2 }],
      Array.from({ length: nA }, (_, i) => String(i + 1))
    ];
    const bodyMT = mats.map(m => [m.c_costo, m.nombre, (m.procedencia || '') + (m.albaran ? ' / Alb. ' + m.albaran : ''), PD.fmt(m.cantidad), m.ubicacion].concat(marcas(m.acts)).concat([PD.undPdf(m.unidad)]));
    y = tabla(y, headMT, relleno(bodyMT, 4, 6 + nA),
      Object.assign({ 0: { cellWidth: 13 }, 2: { cellWidth: 25 }, 3: { cellWidth: 14, halign: 'right' }, 4: { cellWidth: 25 } }, estiloActs(5), { [5 + nA]: { cellWidth: 17, halign: 'center' } }));

    // Firmas
    y = espacio(y + 5, 30);
    const fw = AN / 3;
    for (let i = 0; i < 3; i++) rect(M + i * fw, y, fw, 24);
    doc.setFontSize(6.5);
    const roles = [['ENCARGADO DE OBRA', ctx.encargado || ''], ['INGENIERO RESIDENTE AUXILIAR', ctx.residente || ''], ['CONTROL DE GESTION', ctx.control || '']];
    roles.forEach((r, i) => {
      doc.setFont('helvetica', 'bold'); txt(r[0], M + i * fw + 2, y + 20.5);
      doc.setFont('helvetica', 'normal'); txt(r[1], M + i * fw + 2, y + 23, { maxWidth: fw - 4 });
    });
    doc.setFont('helvetica', 'italic'); doc.setFontSize(6);
    txt('Firma', M + 2, y + 4);
    y += 26;

    // ---------- Solicitudes ----------
    const sol = (parte.solicitudes || []).filter(s => s.detalle);
    if (sol.length) {
      y = espacio(y + 4, 40);
      y = barra('SOLICITUDES PARA EL DIA SIGUIENTE', y);
      y = tabla(y, [['TIPO', 'QUE SE NECESITA', 'CANT.', 'UND', 'PARA', 'OBSERVACIONES']],
        sol.map(s => [s.tipo, s.detalle, PD.fmt(s.cantidad) || s.cantidad || '', s.unidad || '', s.cuando === 'FECHA' ? PD.fechaLarga(s.fecha) : 'MANANA', s.obs || '']),
        { 0: { cellWidth: 26 }, 2: { cellWidth: 14, halign: 'right' }, 3: { cellWidth: 14, halign: 'center' }, 4: { cellWidth: 22, halign: 'center' }, 5: { cellWidth: 40 } });
    }

    // ---------- Fotos ----------
    const fotos = (parte.fotos || []).filter(f => f.data);
    if (fotos.length) {
      const actsFoto = f => {
        const m = f.tipo === 'ALBARAN' ? (parte.materiales || []).find(x => (x.fotos_ids || []).indexOf(f.id) >= 0) : null;
        const a = (m ? m.acts : f.acts) || [];
        return a.length ? 'Act. ' + a.join(', ') : '';
      };
      const nombreMat = id => { const m = (parte.materiales || []).find(x => (x.fotos_ids || []).indexOf(id) >= 0); return m ? m.nombre : ''; };
      const cw = (AN - 6) / 2, ch = 72, cap = 8, filas = 3;
      let i = 0;
      while (i < fotos.length) {
        doc.addPage();
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        txt('REGISTRO FOTOGRAFICO  -  ' + PD.fechaLarga(parte.fecha) + '  -  ' + (parte.encabezado.localizacion || ''), M, 12);
        for (let k = 0; k < 6 && i < fotos.length; k++, i++) {
          const f = fotos[i];
          const x = M + (k % 2) * (cw + 6);
          const yy = 17 + Math.floor(k / 2) * (ch + cap + 6);
          rect(x, yy, cw, ch + cap);
          const ar = (f.w && f.h) ? f.w / f.h : 4 / 3;
          let pw = cw - 2, ph = pw / ar;
          if (ph > ch - 2) { ph = ch - 2; pw = ph * ar; }
          doc.addImage(f.data, 'JPEG', x + (cw - pw) / 2, yy + 1 + ((ch - 2) - ph) / 2, pw, ph);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
          let c = f.caption || '';
          if (f.tipo === 'ALBARAN') c = 'Albaran: ' + (nombreMat(f.id) || '') + (c ? ' - ' + c : '');
          const ac = actsFoto(f);
          if (ac) c = ac + (c ? '  |  ' + c : '');
          txt(c, x + 2, yy + ch + 4.5, { maxWidth: cw - 4 });
        }
      }
    }

    // ---------- Pie ----------
    const n = doc.getNumberOfPages();
    for (let p = 1; p <= n; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      doc.setTextColor(90, 90, 90);
      txt('Hoja ' + p + ' de ' + n, W - M, H - 6, { align: 'right' });
      txt('Parte diario ' + PD.fechaLarga(parte.fecha) + (ctx.llave ? ' - ' + PD.codigoParte(parte.fecha, ctx.llave, parte.n, parte.rev) : '') + (ctx.encargado ? ' - ' + ctx.encargado : ''), M, H - 6);
      doc.setTextColor(0, 0, 0);
    }
    return doc;
  }

  PD.generarParteDoc = generarParteDoc;
  if (typeof module !== 'undefined' && module.exports) module.exports = PD;
  else root.PD = PD;
})(typeof window !== 'undefined' ? window : globalThis);
