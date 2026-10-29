(function (root) {
  'use strict';
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
      txt('Consorcio Constructor', M + 19, 16.5, { align: 'center' });
      txt('Sabana Norte', M + 19, 20.5, { align: 'center' });
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
      if (ctx.llave) { doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); txt('CODIGO:', M + 40, y + 5); doc.setFont('helvetica', 'normal'); txt(PD.codigoParte(parte.fecha, ctx.llave), M + 54, y + 5, { maxWidth: 50 }); doc.setFontSize(8.5); }
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
      txt('Parte diario ' + PD.fechaLarga(parte.fecha) + (ctx.llave ? ' - ' + PD.codigoParte(parte.fecha, ctx.llave) : '') + (ctx.encargado ? ' - ' + ctx.encargado : ''), M, H - 6);
      doc.setTextColor(0, 0, 0);
    }
    return doc;
  }

  PD.generarParteDoc = generarParteDoc;
  if (typeof module !== 'undefined' && module.exports) module.exports = PD;
  else root.PD = PD;
})(typeof window !== 'undefined' ? window : globalThis);
