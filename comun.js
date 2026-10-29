(function (root) {
  'use strict';

  const UNIDADES = [
    { cod: 'M3', texto: 'Metros cúbicos (m³)', pdf: 'M3', dims: ['Largo (m)', 'Ancho (m)', 'Alto (m)'] },
    { cod: 'M2', texto: 'Metros cuadrados (m²)', pdf: 'M2', dims: ['Largo (m)', 'Ancho (m)'] },
    { cod: 'ML', texto: 'Metros lineales (m)', pdf: 'ML', dims: ['Largo (m)'] },
    { cod: 'UND', texto: 'Unidades', pdf: 'UND', dims: ['Cantidad'] },
    { cod: 'KG', texto: 'Kilos (kg)', pdf: 'KG', dims: ['Kilos'] },
    { cod: 'TON', texto: 'Toneladas', pdf: 'TON', dims: ['Toneladas'] },
    { cod: 'GL', texto: 'Global', pdf: 'GL', dims: ['Cantidad'] }
  ];

  function num(v) {
    if (v === null || v === undefined || v === '') return NaN;
    const n = Number(String(v).trim().replace(',', '.'));
    return isFinite(n) ? n : NaN;
  }

  function dimsDe(cod) {
    const u = UNIDADES.find(x => x.cod === cod);
    return u ? u.dims.length : 0;
  }

  function undPdf(cod) {
    const u = UNIDADES.find(x => x.cod === cod);
    return u ? u.pdf : String(cod || '');
  }

  // (producto de dimensiones - descuentos) x factor. NaN si falta algo.
  function cantidadActividad(a) {
    const n = dimsDe(a.unidad);
    if (!n) return NaN;
    let p = 1;
    for (let i = 1; i <= n; i++) {
      const d = num(a['d' + i]);
      if (!(d > 0)) return NaN;
      p *= d;
    }
    const desc = num(a.descuentos);
    const f = num(a.factor);
    if (isNaN(desc) || desc < 0 || !(f > 0)) return NaN;
    const t = (p - desc) * f;
    return t < 0 ? NaN : Math.round(t * 1000) / 1000;
  }

  function fmt(n) {
    if (n === '' || n === null || n === undefined) return '';
    const x = Number(n);
    if (isNaN(x)) return '';
    return String(Math.round(x * 1000) / 1000);
  }

  function horasEntre(ini, fin) {
    const m = s => { const p = String(s || '').split(':'); return Number(p[0]) * 60 + Number(p[1]); };
    const a = m(ini), b = m(fin);
    if (isNaN(a) || isNaN(b) || b <= a) return 0;
    let h = (b - a) / 60;
    if (h >= 6) h -= 1; // 1 hora de almuerzo
    return Math.round(h * 100) / 100;
  }

  function fechaLarga(f) {
    const p = String(f || '').split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : String(f || '');
  }

  const PD = { UNIDADES, num, dimsDe, undPdf, cantidadActividad, fmt, horasEntre, fechaLarga };
  if (typeof module !== 'undefined' && module.exports) module.exports = PD;
  else root.PD = PD;
})(typeof window !== 'undefined' ? window : globalThis);
