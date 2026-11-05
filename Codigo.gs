/***** PARTE DIARIO - BACKEND (reemplaza TODO el contenido de Código.gs) *****/
const HOJA = 'Registros_Diario';
const HOJA_PDF = 'Informes_PDF';
const CARPETA = 'fotos-diario';
const ID_LIBRO_USUARIOS = '10cgxpIWqVEsHW9UUp1GB51t28SZkjXEOxR80YlZDm-c';
const ID_LIBRO_REGISTROS = '14lxDN8nvJjCDbQaZzzgXGWd_W20QF4ewpGJag1sPjkM';
const TZ = 'America/Bogota';
const COLS = ['ID_PARTE','FECHA','LLAVE','USUARIO','SECCION',
  'C_COSTO','DESCRIPCION','CATEGORIA','HORA_INICIO','HORA_FIN',
  'TOTAL_HORAS','ESTADO','ACTIVIDAD_ASIGNADA','UNIDAD','LARGO',
  'ANCHO','ALTO','DESCUENTOS','FACTOR','CANTIDAD','PROCEDENCIA',
  'UBICACION','FOTO_URL','OBSERVACIONES','TIMESTAMP','LOCALIZACION','PK'];
const COLS_PDF = ['ID_PARTE','FECHA','LLAVE','USUARIO','ARCHIVO','URL_PDF','TIMESTAMP','REV'];
const DIMS = { M3: 3, M2: 2, ML: 1, UND: 1, KG: 1, TON: 1, GL: 1 };

/***** CONFIGURACIÓN (se ejecuta una vez a mano) *****/
function configuracionInicial() {
  hoja_();
  hojaPdf_();
  carpetaFotos_();
  carpetaInformes_();
  Logger.log('Listo: hojas y carpetas verificadas');
}

/***** UTILIDADES *****/
function idP_(f, l, n) { n = parseInt(n) || 1; return f + '_' + l + (n > 1 ? '_n' + n : ''); }
function nDe_(id) { const m = String(id).match(/_n(\d+)$/); return m ? Number(m[1]) : 1; }
let PDF_MEMO_ = null;
function revDe_(id) {
  const v = PDF_MEMO_ || hojaPdf_().getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) if (String(v[i][0]) === id) return Math.max(1, parseInt(v[i][7]) || 1);
  return 0;
}
function nVal_(n) { n = parseInt(n) || 1; return n < 1 ? 1 : (n > 9 ? 9 : n); }
function hoy_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function txt_(x) { return x instanceof Date ? Utilities.formatDate(x, TZ, 'yyyy-MM-dd') : String(x === undefined || x === null ? '' : x); }
function hora_(x) { return x instanceof Date ? Utilities.formatDate(x, TZ, 'HH:mm') : String(x === undefined || x === null ? '' : x); }
function vac_(x) { return (x === '' || x === null || x === undefined) ? '' : String(x); }
function t_(x, n) { const s = String(x === undefined || x === null ? '' : x).trim().substring(0, n || 200); return /^[=+\-@\t\r]/.test(s) ? "'" + s : s; }
function num_(v) {
  if (v === '' || v === null || v === undefined) return NaN;
  const x = Number(String(v).replace(',', '.'));
  return isFinite(x) ? x : NaN;
}
function horas_(ini, fin) {
  const m = s => { const p = String(s).split(':'); return Number(p[0]) * 60 + Number(p[1]); };
  const a = m(ini), b = m(fin);
  if (isNaN(a) || isNaN(b) || b <= a) return 0;
  let h = (b - a) / 60;
  if (h >= 6) h -= 1;
  return Math.round(h * 100) / 100;
}
function cantidadAct_(a) {
  const n = DIMS[a.unidad];
  if (!n) return '';
  let p = 1;
  for (let i = 1; i <= n; i++) { const d = num_(a['d' + i]); if (!(d > 0)) return ''; p *= d; }
  const desc = num_(a.descuentos), f = num_(a.factor);
  if (isNaN(desc) || desc < 0 || !(f > 0)) return '';
  const r = (p - desc) * f;
  return r < 0 ? '' : Math.round(r * 1000) / 1000;
}
function nv_(v) { const x = num_(v); return isNaN(x) ? '' : x; }
function actsS_(a) { return (Array.isArray(a) ? a : []).map(Number).filter(n => n > 0 && n <= 60).join(','); }
function acts_(s) { return String(s || '').split(',').map(Number).filter(x => x > 0); }

function buscarOCrear_(padre, nombre) {
  const it = padre.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : padre.createFolder(nombre);
}
function raiz_() {
  const ss = SpreadsheetApp.openById(ID_LIBRO_REGISTROS);
  return DriveApp.getFileById(ss.getId()).getParents().next();
}
function carpetaFotos_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('CARPETA_FOTOS_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const padre = raiz_();
  const f = padre.getFoldersByName('FOTOS_OBRAS');
  const c = buscarOCrear_(f.hasNext() ? f.next() : padre, CARPETA);
  props.setProperty('CARPETA_FOTOS_ID', c.getId());
  return c;
}
function carpetaInformes_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('CARPETA_INFORMES_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const c = buscarOCrear_(buscarOCrear_(raiz_(), 'INFORMES'), 'PARTE_DIARIO');
  props.setProperty('CARPETA_INFORMES_ID', c.getId());
  return c;
}
function hoja_() {
  const ss = SpreadsheetApp.openById(ID_LIBRO_REGISTROS);
  let sh = ss.getSheetByName(HOJA);
  if (!sh) { sh = ss.insertSheet(HOJA); sh.setFrozenRows(1); }
  const n = sh.getLastColumn();
  const enc = n ? sh.getRange(1, 1, 1, n).getValues()[0].map(String) : [];
  const faltan = COLS.filter(c => enc.indexOf(c) < 0);
  if (faltan.length) {
    sh.getRange(1, enc.length + 1, 1, faltan.length).setValues([faltan]);
    sh.getRange(1, 1, 1, enc.length + faltan.length).setFontWeight('bold');
  }
  return sh;
}
function hojaPdf_() {
  const ss = SpreadsheetApp.openById(ID_LIBRO_REGISTROS);
  let sh = ss.getSheetByName(HOJA_PDF);
  if (!sh) {
    sh = ss.insertSheet(HOJA_PDF);
    sh.getRange(1, 1, 1, COLS_PDF.length).setValues([COLS_PDF]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  if (sh.getLastColumn() < COLS_PDF.length) sh.getRange(1, COLS_PDF.length).setValue('REV').setFontWeight('bold');
  return sh;
}
function encabezados_(sh) { return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String); }

function validarLlave(llave) {
  const clave = String(llave || '').trim().toUpperCase();
  if (!clave) return null;
  const cache = CacheService.getScriptCache();
  const ck = 'u_' + clave;
  const hit = cache.get(ck);
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  if (Number(cache.get('fallos') || 0) > 300) return null;
  const hoja = SpreadsheetApp.openById(ID_LIBRO_USUARIOS).getSheetByName('Usuarios');
  const datos = hoja.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][0]).trim().toUpperCase() === clave) {
      const ur = { llave: String(datos[i][0]).trim(), nombre: datos[i][1], rol: datos[i][2] };
      try { cache.put(ck, JSON.stringify(ur), 900); } catch (e) {}
      return ur;
    }
  }
  cache.put('fallos', String(Number(cache.get('fallos') || 0) + 1), 600);
  Utilities.sleep(1500);
  return null;
}
// Entrada rápida: solo comprueba la llave (con caché) y devuelve el nombre. Los datos se cargan después, ya dentro de la app.
function validarRapido_(llave, app) {
  const u = validarLlave(llave);
  if (!u) return { ok: false, mensaje: 'Llave no válida' };
  const adm = esAdmin_(u);
  if (app === 'admin') return adm ? { ok: true, nombre: u.nombre, llave: u.llave } : { ok: false, mensaje: 'Acceso solo para administradores' };
  if (adm) return { ok: false, admin: true, mensaje: 'Las llaves de administrador no crean partes. Usa el dashboard.' };
  return { ok: true, nombre: u.nombre, llave: u.llave };
}
function esAdmin_(u) { return /ADMIN/.test(String(u && u.rol || '').toUpperCase()); }
// llave de usuario de campo (los administradores no crean partes)
function validarUsuario_(llave) { const u = validarLlave(llave); return u && !esAdmin_(u) ? u : null; }

/***** ENTRADA WEB *****/
function doGet() { return ContentService.createTextOutput('Parte diario activo'); }

function doPost(e) {
  let r;
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.accion === 'ping') r = { ok: true };
    else if (d.accion === 'validar') r = validarRapido_(d.llave, d.app);
    else if (d.accion === 'ingresar') r = ingresar(d.llave);
    else if (d.accion === 'guardar') r = guardarParte(d.llave, d.parte);
    else if (d.accion === 'pdf') r = guardarPdf(d.llave, d.fecha, d.pdf, d.hhmm, d.uid, d.n, d.rev);
    else if (d.accion === 'eliminar') r = eliminarParte(d.llave, d.fecha, d.n);
    else if (d.accion === 'lista') r = lista_(d.llave);
    else if (d.accion === 'ver') r = pdfDe_(d.llave, d.fecha, d.n);
    else if (d.accion === 'parte') r = parteN_(d.llave, d.fecha, d.n);
    else if (d.accion === 'fotos') r = fotosDe_(d.llave, d.fecha, d.n);
    else if (d.accion === 'admin') r = adminDatos_(d.llave, d.desde, d.hasta);
    else if (d.accion === 'admin_fotos') r = adminFotos_(d.llave, d.desde, d.hasta);
    else if (d.accion === 'admin_foto') r = adminFoto_(d.llave, d.id, d.foto);
    else if (d.accion === 'admin_pdf') r = adminPdf_(d.llave, d.id);
    else if (d.accion === 'admin_liberar') r = adminLiberar_(d.llave, d.sid, d.lib);
    else if (d.accion === 'tr_ingresar' || d.accion === 'tr_lista') r = trDatos_(d.llave);
    else if (d.accion === 'tr_guardar') r = trGuardar_(d.llave, d.viaje);
    else if (d.accion === 'tr_recibo') r = trRecibo_(d.llave, d.cod, d.foto);
    else if (d.accion === 'tr_eliminar') r = trEliminar_(d.llave, d.cod);
    else if (d.accion === 'tr_foto') r = trFoto_(d.llave, d.cod, d.cual);
    else if (d.accion === 'admin_tr_vol') r = adminVolqueta_(d.llave, d);
    else if (d.accion === 'admin_tr') r = adminTransportes_(d.llave, d.desde, d.hasta);
    else if (d.accion === 'tr_planilla') r = trPlanilla_(d.llave, d.fecha, d.pdf);
    else if (d.accion === 'admin_tr_foto') r = adminTrFoto_(d.llave, d.cod, d.cual, d.i);
    else if (d.accion === 'admin_tr_fotos') r = adminTrFotos_(d.llave, d.cods);
    else if (d.accion === 'admin_tr_buscar') r = adminTrBuscar_(d.llave, d.q);
    else if (d.accion === 'admin_tr_pdf') r = adminTrPdf_(d.llave, d.url);
    else if (d.accion === 'admin_tr_cierre') r = adminTrCierre_(d.llave, d.desde, d.hasta, d.usuario);
    else r = { ok: false, mensaje: 'Acción no válida' };
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    r = { ok: false, mensaje: 'Error en el servidor. Intenta de nuevo.' };
  }
  return ContentService.createTextOutput(JSON.stringify(r)).setMimeType(ContentService.MimeType.JSON);
}

/***** LECTURA *****/
function restaDias_(f, n) { let d = new Date(String(f).slice(0, 10) + 'T12:00:00Z'); if (isNaN(d.getTime())) d = new Date(hoy_() + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); }
// Lee solo el final de la hoja (lo reciente) en bloques, hasta pasar la fecha de corte + 7 días de margen.
// Devuelve { v: [encabezado, ...filas], ini: número de la primera fila leída }.
function colaHoja_(sh, colFecha, corte) {
  const nc = sh.getLastColumn(), last = sh.getLastRow();
  if (nc < 1) return { v: [[]], ini: 2 };
  const enc = sh.getRange(1, 1, 1, nc).getValues()[0];
  if (last < 2) return { v: [enc], ini: 2 };
  const lim = restaDias_(corte, 7);
  let fin = last, rows = [], ini = last + 1;
  while (fin >= 2) {
    const a = Math.max(2, fin - 1499), blk = sh.getRange(a, 1, fin - a + 1, nc).getValues();
    rows = blk.concat(rows); ini = a; fin = a - 1;
    if (blk.every(r => txt_(r[colFecha]) < lim)) break;
  }
  return { v: [enc].concat(rows), ini: ini };
}
function leerRegistros_(desde) {
  const sh = hoja_();
  let v;
  if (desde) { const n = sh.getLastColumn(), enc0 = n ? sh.getRange(1, 1, 1, n).getValues()[0].map(String) : []; v = colaHoja_(sh, Math.max(0, enc0.indexOf('FECHA')), desde).v; }
  else v = sh.getDataRange().getValues();
  const enc = v[0].map(String);
  return v.slice(1).map(r => { const o = {}; enc.forEach((c, i) => o[c] = r[i]); return o; });
}

function parteDe_(filas) {
  const p = { fecha: '', encabezado: { localizacion: '', pk: '' }, clima_sel: null, clima: [], actividades: [],
    personal: [], maquinas: [], materiales: [], fotos: [], solicitudes: [] };
  const fotos = filas.filter(r => r.SECCION === 'FOTO').map(r => ({ id: String(r.OBSERVACIONES), tipo: String(r.CATEGORIA) === 'ALBARAN' ? 'ALBARAN' : 'GENERAL',
    caption: String(r.DESCRIPCION || ''), url: String(r.FOTO_URL || ''), data: '', acts: acts_(r.ACTIVIDAD_ASIGNADA) }));
  filas.forEach(r => {
    switch (r.SECCION) {
      case 'ENCABEZADO':
        p.fecha = txt_(r.FECHA);
        p.encabezado = { localizacion: String(r.LOCALIZACION || ''), pk: String(r.PK || '') };
        p.clima_sel = r.ESTADO === 'CLIMA_SI' ? 'si' : (r.ESTADO === 'CLIMA_NO' ? 'no' : null);
        break;
      case 'CLIMA':
        p.clima.push({ tipo: String(r.DESCRIPCION), inicio: hora_(r.HORA_INICIO), fin: hora_(r.HORA_FIN), obs: String(r.OBSERVACIONES || '') });
        break;
      case 'ACTIVIDAD':
        p.actividades.push({ n: Number(r.ACTIVIDAD_ASIGNADA), descripcion: String(r.DESCRIPCION), unidad: String(r.UNIDAD),
          d1: vac_(r.LARGO), d2: vac_(r.ANCHO), d3: vac_(r.ALTO), descuentos: vac_(r.DESCUENTOS), factor: vac_(r.FACTOR), obs: String(r.OBSERVACIONES || '') });
        break;
      case 'PERSONAL':
        p.personal.push({ c_costo: String(r.C_COSTO), nombre: String(r.DESCRIPCION), cargo: String(r.CATEGORIA),
          inicio: hora_(r.HORA_INICIO) || '07:00', fin: hora_(r.HORA_FIN) || '16:00', estado: String(r.ESTADO || 'PRESENTE'), acts: acts_(r.ACTIVIDAD_ASIGNADA) });
        break;
      case 'MAQUINA':
        p.maquinas.push({ c_costo: String(r.C_COSTO), nombre: String(r.DESCRIPCION), recibo: String(r.CATEGORIA),
          inicio: hora_(r.HORA_INICIO) || '07:00', fin: hora_(r.HORA_FIN) || '16:00', estado: String(r.ESTADO || 'OPERANDO'),
          obs: String(r.OBSERVACIONES || ''), acts: acts_(r.ACTIVIDAD_ASIGNADA) });
        break;
      case 'MATERIAL':
        p.materiales.push({ c_costo: String(r.C_COSTO), nombre: String(r.DESCRIPCION), procedencia: String(r.PROCEDENCIA || ''),
          cantidad: vac_(r.CANTIDAD), unidad: String(r.UNIDAD || 'M3'), ubicacion: String(r.UBICACION || ''),
          acts: acts_(r.ACTIVIDAD_ASIGNADA), estado: String(r.ESTADO || 'USADO'), albaran: String(r.OBSERVACIONES || ''), _u: String(r.FOTO_URL || ''), fotos_ids: [] });
        break;
      case 'SOLICITUD':
        p.solicitudes.push({ tipo: String(r.DESCRIPCION), detalle: String(r.CATEGORIA), cuando: /^\d{4}-/.test(txt_(r.ESTADO)) ? 'FECHA' : 'MANANA', fecha: /^\d{4}-/.test(txt_(r.ESTADO)) ? txt_(r.ESTADO) : '', cantidad: vac_(r.CANTIDAD), unidad: String(r.UNIDAD || ''), obs: String(r.OBSERVACIONES || '') });
        break;
    }
  });
  p.actividades.sort((a, b) => a.n - b.n);
  p.materiales.forEach(m => { const us = String(m._u || '').split(' | '); m.fotos_ids = fotos.filter(f => f.url && us.indexOf(f.url) >= 0).map(f => f.id); delete m._u; });
  p.fotos = fotos;
  return p;
}

function ingresar(llave) {
  const u = validarLlave(llave);
  if (u && esAdmin_(u)) return { ok: false, admin: true, mensaje: 'Las llaves de administrador no crean partes. Usa el dashboard.' };
  if (!u) return { ok: false, mensaje: 'Llave no válida' };
  const hoy = hoy_();
  PDF_MEMO_ = hojaPdf_().getDataRange().getValues();
  const todas = leerRegistros_(restaDias_(hoy, 45));
  const mias = todas.filter(r => String(r.LLAVE).toUpperCase() === u.llave.toUpperCase());
  const datos = mias.filter(r => r.SECCION !== 'FOTO');
  const fechas = Array.from(new Set(datos.map(r => txt_(r.FECHA)))).sort();
  const esHoy = fechas.indexOf(hoy) >= 0;
  const ultima = esHoy ? hoy : fechas[fechas.length - 1];
  let parte = null;
  if (ultima) {
    const del = mias.filter(r => txt_(r.FECHA) === ultima);
    const nmax = del.reduce((m, r) => Math.max(m, nDe_(r.ID_PARTE)), 1);
    parte = parteDe_(del.filter(r => nDe_(r.ID_PARTE) === nmax));
    parte.n = nmax;
    parte.rev = revDe_(idP_(ultima, u.llave, nmax)) || 1;
  }
  const vistas = {};
  const sugerencias = [];
  datos.filter(r => r.SECCION === 'ACTIVIDAD').sort((a, b) => txt_(b.FECHA).localeCompare(txt_(a.FECHA))).forEach(r => {
    const k = String(r.DESCRIPCION).toUpperCase();
    if (!vistas[k] && sugerencias.length < 80) { vistas[k] = 1; sugerencias.push({ descripcion: String(r.DESCRIPCION), unidad: String(r.UNIDAD) }); }
  });
  const out = { ok: true, nombre: u.nombre, llave: u.llave, fecha: hoy, esHoy: esHoy, parte: parte, sugerencias: sugerencias, biblioteca: biblioteca_(u.llave, todas) };
  PDF_MEMO_ = null;
  return out;
}

/***** GUARDAR *****/
function validarParte_(p) {
  if (!p || typeof p !== 'object') return 'Datos incompletos';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.fecha || '')) return 'Fecha no válida';
  const dias = (new Date(hoy_()) - new Date(p.fecha)) / 86400000;
  if (!(dias >= 0 && dias <= 3)) return 'La fecha del parte no es válida';
  const L = x => Array.isArray(x) ? x : [];
  if (L(p.actividades).length > 60 || L(p.personal).length + L(p.maquinas).length + L(p.materiales).length > 300 ||
      L(p.fotos).length > 40 || L(p.solicitudes).length > 30 || L(p.clima).length > 10) return 'El parte tiene demasiados registros';
  const hora = /^\d{2}:\d{2}$/;
  for (const f of L(p.fotos)) if (!/^[A-Za-z0-9_-]{1,40}$/.test(String(f.id))) return 'Foto no válida';
  for (const a of L(p.actividades)) {
    if (!t_(a.descripcion)) return 'Hay una actividad sin descripción';
    if (cantidadAct_(a) === '') return 'Revisa las medidas de la actividad ' + a.n;
  }
  for (const x of L(p.personal).concat(L(p.maquinas))) {
    const off = x.estado === 'AUSENTE' || x.estado === 'NO ESTUVO';
    if (!t_(x.nombre) || !t_(x.c_costo)) return 'Faltan nombre o centro de costos';
    if (!off && (!hora.test(x.inicio) || !hora.test(x.fin))) return 'Revisa las horas de ' + x.nombre;
  }
  for (const q of L(p.solicitudes)) if (q.cuando === 'FECHA' && !/^\d{4}-\d{2}-\d{2}$/.test(String(q.fecha || ''))) return 'Falta la fecha de un pedido';
  for (const c of L(p.clima)) if (!hora.test(c.inicio) || !hora.test(c.fin)) return 'Revisa las horas del clima';
  return '';
}

function fila_(enc, o) { return enc.map(c => (o[c] === undefined || o[c] === null) ? '' : o[c]); }

function subirFoto_(f, fecha, llave) {
  const m = String(f.data).match(/^data:image\/(jpeg|png);base64,(.+)$/);
  if (!m || m[2].length > 4500000) return '';
  const nombre = fecha + '_' + llave + '_' + String(f.id).replace(/[^A-Za-z0-9_-]/g, '') + (m[1] === 'png' ? '.png' : '.jpg');
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), 'image/' + m[1], nombre);
  return carpetaFotos_().createFile(blob).getUrl();
}

function guardarParte(llave, p) {
  const u = validarUsuario_(llave);
  if (!u) return { ok: false, mensaje: 'Llave no válida' };
  const err = validarParte_(p);
  if (err) return { ok: false, mensaje: err };
  const L = x => Array.isArray(x) ? x : [];
  const n = nVal_(p.n);
  const id = idP_(p.fecha, u.llave, n);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = hoja_();
    const enc = encabezados_(sh);
    const v = sh.getDataRange().getValues();
    const iId = enc.indexOf('ID_PARTE'), iSec = enc.indexOf('SECCION'), iObs = enc.indexOf('OBSERVACIONES'), iUrl = enc.indexOf('FOTO_URL');
    const ids = {}, tag = {};
    L(p.fotos).forEach(f => { ids[String(f.id)] = 1; tag[String(f.id)] = f.tipo === 'ALBARAN' ? '' : actsS_(f.acts); });
    L(p.materiales).forEach(m => L(m.fotos_ids).forEach(i => { if (tag[String(i)] !== undefined) tag[String(i)] = actsS_(acts_(tag[String(i)]).concat(L(m.acts).map(Number))); }));
    const iAct = enc.indexOf('ACTIVIDAD_ASIGNADA');
    const existentes = {}, previas = {};
    const rangos = [];
    let fin = -1, ini = -1;
    for (let i = v.length - 1; i >= 1; i--) {
      const suyo = String(v[i][iId]) === id;
      if (suyo && v[i][iSec] === 'FOTO') previas[String(v[i][iObs])] = String(v[i][iUrl]);
      const borrar = suyo && (v[i][iSec] !== 'FOTO' || !ids[String(v[i][iObs])] || String(v[i][iAct]) !== tag[String(v[i][iObs])]);
      if (suyo && !borrar) existentes[String(v[i][iObs])] = String(v[i][iUrl]);
      if (borrar) { if (fin === -1) fin = i; ini = i; }
      else if (fin !== -1) { rangos.push([ini, fin]); fin = -1; }
    }
    if (fin !== -1) rangos.push([ini, fin]);
    if (p.fecha !== hoy_() && rangos.length) return { ok: false, codigo: 'PASADO', mensaje: 'Solo se puede editar el parte de hoy.' };
    rangos.forEach(r => sh.deleteRows(r[0] + 1, r[1] - r[0] + 1));

    const urls = {};
    const nuevasFotos = [];
    L(p.fotos).forEach(f => {
      let url = (/^https:\/\/drive\.google\.com\/[A-Za-z0-9_\/?=&.-]+$/.test(String(f.url || '')) ? f.url : '') || existentes[f.id] || previas[f.id] || '';
      if (!url && f.data) url = subirFoto_(f, p.fecha, u.llave);
      urls[f.id] = url;
      if (!existentes[f.id]) nuevasFotos.push(f);
    });

    const ts = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
    const base = { ID_PARTE: id, FECHA: p.fecha, LLAVE: u.llave, USUARIO: u.nombre, TIMESTAMP: ts };
    const filas = [];
    const add = o => filas.push(fila_(enc, Object.assign({}, base, o)));
    const e = p.encabezado || {};
    add({ SECCION: 'ENCABEZADO', LOCALIZACION: t_(e.localizacion), PK: t_(e.pk), ESTADO: p.clima_sel === 'si' ? 'CLIMA_SI' : (p.clima_sel === 'no' ? 'CLIMA_NO' : '') });
    L(p.clima).forEach(c => add({ SECCION: 'CLIMA', DESCRIPCION: t_(c.tipo), HORA_INICIO: c.inicio, HORA_FIN: c.fin, OBSERVACIONES: t_(c.obs) }));
    L(p.actividades).forEach(a => add({ SECCION: 'ACTIVIDAD', ACTIVIDAD_ASIGNADA: Number(a.n) || '', DESCRIPCION: t_(a.descripcion), UNIDAD: a.unidad,
      LARGO: nv_(a.d1), ANCHO: nv_(a.d2), ALTO: nv_(a.d3), DESCUENTOS: num_(a.descuentos), FACTOR: num_(a.factor), CANTIDAD: cantidadAct_(a), OBSERVACIONES: t_(a.obs, 300) }));
    L(p.personal).forEach(x => add({ SECCION: 'PERSONAL', C_COSTO: t_(x.c_costo), DESCRIPCION: t_(x.nombre), CATEGORIA: t_(x.cargo),
      HORA_INICIO: x.estado === 'AUSENTE' ? '' : x.inicio, HORA_FIN: x.estado === 'AUSENTE' ? '' : x.fin,
      TOTAL_HORAS: x.estado === 'AUSENTE' ? 0 : horas_(x.inicio, x.fin), ESTADO: t_(x.estado), ACTIVIDAD_ASIGNADA: actsS_(x.acts) }));
    L(p.maquinas).forEach(x => add({ SECCION: 'MAQUINA', C_COSTO: t_(x.c_costo), DESCRIPCION: t_(x.nombre), CATEGORIA: t_(x.recibo),
      HORA_INICIO: x.estado === 'NO ESTUVO' ? '' : x.inicio, HORA_FIN: x.estado === 'NO ESTUVO' ? '' : x.fin,
      TOTAL_HORAS: x.estado === 'NO ESTUVO' ? 0 : horas_(x.inicio, x.fin), ESTADO: t_(x.estado), ACTIVIDAD_ASIGNADA: actsS_(x.acts), OBSERVACIONES: t_(x.obs, 300) }));
    L(p.materiales).forEach(m => add({ SECCION: 'MATERIAL', C_COSTO: t_(m.c_costo), DESCRIPCION: t_(m.nombre), PROCEDENCIA: t_(m.procedencia),
      CANTIDAD: nv_(m.cantidad), UNIDAD: t_(m.unidad, 10), UBICACION: t_(m.ubicacion), OBSERVACIONES: t_(m.albaran, 60), ACTIVIDAD_ASIGNADA: actsS_(m.acts), ESTADO: m.estado === 'NO USADO' ? 'NO USADO' : 'USADO',
      FOTO_URL: L(m.fotos_ids).map(i => urls[i]).filter(Boolean).join(' | ') }));
    L(p.solicitudes).forEach(s => add({ SECCION: 'SOLICITUD', ESTADO: s.cuando === 'FECHA' ? t_(s.fecha, 10) : 'MANANA', DESCRIPCION: t_(s.tipo), CATEGORIA: t_(s.detalle, 300), CANTIDAD: nv_(s.cantidad), UNIDAD: t_(s.unidad, 30), OBSERVACIONES: t_(s.obs, 300) }));
    nuevasFotos.forEach(f => add({ SECCION: 'FOTO', CATEGORIA: f.tipo === 'ALBARAN' ? 'ALBARAN' : 'GENERAL', DESCRIPCION: t_(f.caption), FOTO_URL: urls[f.id], OBSERVACIONES: String(f.id), ACTIVIDAD_ASIGNADA: tag[String(f.id)] }));

    const r0 = sh.getLastRow() + 1;
    ['ID_PARTE', 'FECHA', 'HORA_INICIO', 'HORA_FIN', 'ACTIVIDAD_ASIGNADA'].forEach(c => { const j = enc.indexOf(c); if (j >= 0) sh.getRange(r0, j + 1, filas.length, 1).setNumberFormat('@'); });
    sh.getRange(r0, 1, filas.length, enc.length).setValues(filas);
    return { ok: true, guardados: filas.length, fotos: urls };
  } finally {
    lock.releaseLock();
  }
}

function parteN_(llave, fecha, n) {
  const u = validarUsuario_(llave);
  if (!u) return { ok: false, mensaje: 'Llave no válida' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return { ok: false, mensaje: 'Fecha no válida' };
  n = nVal_(n);
  const id = idP_(fecha, u.llave, n);
  const filas = leerRegistros_(fecha).filter(r => String(r.ID_PARTE) === id);
  if (!filas.length) return { ok: false, mensaje: 'Ese informe no existe' };
  const p = parteDe_(filas); p.n = n; p.rev = revDe_(id) || 1;
  return { ok: true, parte: p };
}

/***** BIBLIOTECA *****/
function biblioteca_(llave, filas) {
  const L = String(llave).toUpperCase();
  const k = (f, n) => f + '|' + n;
  const items = {};
  (filas || leerRegistros_(restaDias_(hoy_(), 45))).forEach(r => { if (String(r.LLAVE).toUpperCase() === L && r.SECCION === 'ENCABEZADO') { const f = txt_(r.FECHA), n = nDe_(r.ID_PARTE); items[k(f, n)] = { fecha: f, n: n, pdf: false }; } });
  const v = PDF_MEMO_ || hojaPdf_().getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (String(v[i][2]).toUpperCase() === L && String(v[i][5])) { const f = txt_(v[i][1]), n = nDe_(v[i][0]); if (items[k(f, n)]) { items[k(f, n)].pdf = true; items[k(f, n)].rev = Math.max(1, parseInt(v[i][7]) || 1); } }
  return Object.keys(items).map(x => items[x]).sort((a, b) => a.fecha === b.fecha ? b.n - a.n : (a.fecha < b.fecha ? 1 : -1)).slice(0, 120);
}
function lista_(llave) {
  const u = validarUsuario_(llave);
  if (!u) return { ok: false, mensaje: 'Llave no válida' };
  return { ok: true, biblioteca: biblioteca_(u.llave) };
}
function idDrive_(url) { const m = String(url).match(/[-\w]{25,}/); return m ? m[0] : ''; }
function pdfDe_(llave, fecha, n) {
  const u = validarUsuario_(llave);
  if (!u) return { ok: false, mensaje: 'Llave no válida' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return { ok: false, mensaje: 'Fecha no válida' };
  const id = idP_(fecha, u.llave, nVal_(n));
  const v = hojaPdf_().getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) {
    if (String(v[i][0]) !== id || String(v[i][2]).toUpperCase() !== u.llave.toUpperCase()) continue;
    const fid = idDrive_(v[i][5]);
    if (!fid) break;
    try { return { ok: true, nombre: String(v[i][4]), pdf: Utilities.base64Encode(DriveApp.getFileById(fid).getBlob().getBytes()) }; } catch (e) { break; }
  }
  return { ok: false, mensaje: 'El PDF de ese día aún no está disponible.' };
}
function fotosDe_(llave, fecha, n) {
  const u = validarUsuario_(llave);
  if (!u) return { ok: false, mensaje: 'Llave no válida' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return { ok: false, mensaje: 'Fecha no válida' };
  const id = idP_(fecha, u.llave, nVal_(n)), out = [];
  leerRegistros_(fecha).forEach(r => {
    if (String(r.ID_PARTE) !== id || r.SECCION !== 'FOTO') return;
    const fid = idDrive_(r.FOTO_URL);
    if (!fid) return;
    try { const b = DriveApp.getFileById(fid).getBlob(); out.push({ id: String(r.OBSERVACIONES), data: 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()) }); } catch (e) {}
  });
  return { ok: true, fotos: out };
}

/***** PDF *****/
function guardarPdf(llave, fecha, b64, hhmm, uid, nn, rr) {
  const u = validarUsuario_(llave);
  if (!u) return { ok: false, mensaje: 'Llave no válida' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '') || !b64 || String(b64).length > 30000000) return { ok: false, mensaje: 'PDF no válido' };
  const dias = (new Date(hoy_()) - new Date(fecha)) / 86400000;
  if (!(dias >= 0 && dias <= 3)) return { ok: false, mensaje: 'Fecha no válida' };
  const bytes = Utilities.base64Decode(String(b64));
  if (bytes.length > 20000000 || bytes.length < 100 || String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== '%PDF') return { ok: false, mensaje: 'PDF no válido' };
  const n = nVal_(nn);
  const rev = Math.min(99, Math.max(1, parseInt(rr) || 1));
  const id = idP_(fecha, u.llave, n);
  const hm = /^\d{4}$/.test(String(hhmm)) ? String(hhmm) : Utilities.formatDate(new Date(), TZ, 'HHmm');
  const uu = /^[a-z0-9]{4,12}$/.test(String(uid)) ? String(uid) : Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  const nombre = 'Parte_' + String(u.llave).replace(/[^\w-]/g, '') + '_' + fecha + (n > 1 ? '_n' + n : '') + (rev > 1 ? '_R' + rev : '') + '_' + hm + '_' + uu + '.pdf';
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = hojaPdf_();
    const v = sh.getDataRange().getValues();
    let fi = -1;
    for (let i = 1; i < v.length; i++) if (String(v[i][0]) === id) { fi = i + 1; break; }
    if (fi > 0 && fecha !== hoy_()) return { ok: false, codigo: 'PASADO', mensaje: 'Solo se puede editar el parte de hoy.' };
    if (fi > 0) { const viejo = idDrive_(v[fi - 1][5]); if (viejo) { try { DriveApp.getFileById(viejo).setTrashed(true); } catch (e) {} } }
    const arch = carpetaInformes_().createFile(Utilities.newBlob(bytes, 'application/pdf', nombre));
    try { arch.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    const url = arch.getUrl();
    const ts = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
    const fila = [id, fecha, u.llave, u.nombre, nombre, url, ts, rev];
    if (fi < 0) { fi = sh.getLastRow() + 1; sh.getRange(fi, 1, 1, 2).setNumberFormat('@'); }
    sh.getRange(fi, 1, 1, fila.length).setValues([fila]);
    try { biblioAppSheet_(fecha, u, url, ts, n, rev); } catch (e) {}
    return { ok: true, url: url, nombre: nombre };
  } finally {
    lock.releaseLock();
  }
}


/***** ELIMINAR (solo el parte de hoy, del propio usuario) *****/
function eliminarParte(llave, fecha, nn) {
  const u = validarUsuario_(llave);
  if (!u) return { ok: false, mensaje: 'Llave no válida' };
  if (fecha !== hoy_()) return { ok: false, codigo: 'PASADO', mensaje: 'Solo se puede eliminar el parte de hoy.' };
  const num = nVal_(nn);
  const id = idP_(fecha, u.llave, num);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    let n = 0;
    const sh = hoja_();
    const enc = encabezados_(sh), iId = enc.indexOf('ID_PARTE');
    const v = sh.getDataRange().getValues();
    for (let i = v.length - 1; i >= 1; i--) if (String(v[i][iId]) === id) { sh.deleteRow(i + 1); n++; }
    const sp = hojaPdf_();
    const w = sp.getDataRange().getValues();
    for (let i = w.length - 1; i >= 1; i--) {
      if (String(w[i][0]) !== id) continue;
      const fid = idDrive_(w[i][5]);
      if (fid) { try { DriveApp.getFileById(fid).setTrashed(true); } catch (e) {} }
      sp.deleteRow(i + 1);
    }
    const b = SpreadsheetApp.openById(ID_LIBRO_USUARIOS).getSheetByName('Biblioteca_Informes');
    if (b) {
      const cod = 'PD-' + String(fecha).replace(/-/g, '') + '-' + String(u.llave).toUpperCase() + (num > 1 ? '-' + num : '');
      const x = b.getDataRange().getValues();
      const reR = new RegExp('^' + cod + '(-R\\d+)?$');
      for (let i = x.length - 1; i >= 1; i--) if (reR.test(String(x[i][0]))) b.deleteRow(i + 1);
    }
    return { ok: true, filas: n };
  } finally {
    lock.releaseLock();
  }
}

/***** ADMINISTRADORES (dashboard) *****/
const HOJA_LIB = 'Liberaciones';
const COLS_LIB = ['SID', 'ID_PARTE', 'LLAVE', 'FECHA', 'TIPO', 'DETALLE', 'LIBERADO', 'LIBERADO_POR', 'TIMESTAMP'];
function hojaLib_() {
  const ss = SpreadsheetApp.openById(ID_LIBRO_REGISTROS);
  let sh = ss.getSheetByName(HOJA_LIB);
  if (!sh) { sh = ss.insertSheet(HOJA_LIB); sh.getRange(1, 1, 1, COLS_LIB.length).setValues([COLS_LIB]).setFontWeight('bold'); sh.setFrozenRows(1); }
  return sh;
}
function usuarios_() {
  const d = SpreadsheetApp.openById(ID_LIBRO_USUARIOS).getSheetByName('Usuarios').getDataRange().getValues();
  const enc = d[0].map(x => String(x).toUpperCase());
  const iE = enc.findIndex(x => /ESTADO/.test(x));
  return d.slice(1).filter(r => String(r[0]).trim()).map(r => ({ llave: String(r[0]).trim(), nombre: String(r[1]), rol: String(r[2]).toUpperCase(),
    activo: iE < 0 || !/INACT/.test(String(r[iE]).toUpperCase()) }));
}
function solId_(idParte, r) {
  const k = [r.DESCRIPCION, r.CATEGORIA, r.CANTIDAD, txt_(r.ESTADO)].join('|');
  const h = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, k, Utilities.Charset.UTF_8).map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('').slice(0, 8);
  return idParte + '#' + h;
}
function adminUsuario_(llave) {
  const u = validarLlave(llave);
  return u && esAdmin_(u) ? u : null;
}
function adminDatos_(llave, desde, hasta) {
  const u = adminUsuario_(llave);
  if (!u) return { ok: false, mensaje: 'Acceso solo para administradores' };
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(desde || '') || !re.test(hasta || '') || desde > hasta) return { ok: false, mensaje: 'Fechas no válidas' };
  if ((new Date(hasta) - new Date(desde)) / 86400000 > 31) return { ok: false, mensaje: 'Máximo un mes (31 días) por consulta' };
  const us = usuarios_().filter(x => !/ADMIN/.test(x.rol) && x.activo).map(x => ({ llave: x.llave, nombre: x.nombre }));
  const filas = leerRegistros_(desde).filter(r => { const f = txt_(r.FECHA); return f >= desde && f <= hasta && r.SECCION !== 'FOTO'; });
  const pdfs = {};
  const v = hojaPdf_().getDataRange().getValues();
  const revs = {};
  for (let i = 1; i < v.length; i++) if (String(v[i][5])) { pdfs[String(v[i][0])] = String(v[i][4]); revs[String(v[i][0])] = Math.max(1, parseInt(v[i][7]) || 1); }
  const lib = {};
  const lv = hojaLib_().getDataRange().getValues();
  for (let i = 1; i < lv.length; i++) lib[String(lv[i][0])] = { lib: String(lv[i][6]) === 'SI', por: String(lv[i][7]), ts: String(lv[i][8]) };
  const out = { partes: [], ACTIVIDAD: [], PERSONAL: [], MAQUINA: [], MATERIAL: [], SOLICITUD: [] };
  filas.forEach(r => {
    const id = String(r.ID_PARTE), f = txt_(r.FECHA), l = String(r.LLAVE), base = { id: id, fecha: f, llave: l, usuario: String(r.USUARIO), n: nDe_(id), rev: revs[id] || 1 };
    switch (r.SECCION) {
      case 'ENCABEZADO': out.partes.push(Object.assign({ localizacion: String(r.LOCALIZACION || ''), pk: String(r.PK || ''), pdf: pdfs[id] || '' }, base)); break;
      case 'ACTIVIDAD': out.ACTIVIDAD.push(Object.assign({ an: Number(r.ACTIVIDAD_ASIGNADA), descripcion: String(r.DESCRIPCION), unidad: String(r.UNIDAD), cantidad: vac_(r.CANTIDAD), obs: String(r.OBSERVACIONES || '') }, base)); break;
      case 'PERSONAL': out.PERSONAL.push(Object.assign({ c_costo: String(r.C_COSTO), nombre: String(r.DESCRIPCION), cargo: String(r.CATEGORIA), inicio: hora_(r.HORA_INICIO), fin: hora_(r.HORA_FIN), horas: vac_(r.TOTAL_HORAS), estado: String(r.ESTADO), acts: String(r.ACTIVIDAD_ASIGNADA || '') }, base)); break;
      case 'MAQUINA': out.MAQUINA.push(Object.assign({ c_costo: String(r.C_COSTO), nombre: String(r.DESCRIPCION), recibo: String(r.CATEGORIA), inicio: hora_(r.HORA_INICIO), fin: hora_(r.HORA_FIN), horas: vac_(r.TOTAL_HORAS), estado: String(r.ESTADO), acts: String(r.ACTIVIDAD_ASIGNADA || ''), obs: String(r.OBSERVACIONES || '') }, base)); break;
      case 'MATERIAL': out.MATERIAL.push(Object.assign({ c_costo: String(r.C_COSTO), nombre: String(r.DESCRIPCION), almacen: String(r.PROCEDENCIA || ''), albaran: String(r.OBSERVACIONES || ''), cantidad: vac_(r.CANTIDAD), unidad: String(r.UNIDAD || ''), ubicacion: String(r.UBICACION || ''), acts: String(r.ACTIVIDAD_ASIGNADA || ''), estado: String(r.ESTADO) }, base)); break;
      case 'SOLICITUD': {
        const sid = solId_(id, r), L = lib[sid] || { lib: false, por: '', ts: '' }, cu = txt_(r.ESTADO);
        out.SOLICITUD.push(Object.assign({ sid: sid, tipo: String(r.DESCRIPCION), detalle: String(r.CATEGORIA), cantidad: vac_(r.CANTIDAD), unidad: String(r.UNIDAD || ''),
          para: /^\d{4}-/.test(cu) ? cu : 'MAÑANA', obs: String(r.OBSERVACIONES || ''), liberado: L.lib, liberado_por: L.por, liberado_ts: L.ts }, base));
        break;
      }
    }
  });
  out.partes.sort((a, b) => (b.fecha + b.llave).localeCompare(a.fecha + a.llave));
  return Object.assign({ ok: true, hoy: hoy_(), nombre: u.nombre, usuarios: us }, out);
}
function adminPdf_(llave, id) {
  if (!adminUsuario_(llave)) return { ok: false, mensaje: 'Acceso solo para administradores' };
  if (!/^\d{4}-\d{2}-\d{2}_[\w-]{1,60}$/.test(String(id || ''))) return { ok: false, mensaje: 'Parte no válido' };
  const v = hojaPdf_().getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) {
    if (String(v[i][0]) !== id) continue;
    const fid = idDrive_(v[i][5]);
    if (!fid) break;
    try { return { ok: true, nombre: String(v[i][4]), pdf: Utilities.base64Encode(DriveApp.getFileById(fid).getBlob().getBytes()) }; } catch (e) { break; }
  }
  return { ok: false, mensaje: 'Ese parte no tiene PDF disponible.' };
}
function adminLiberar_(llave, sid, lib) {
  const u = adminUsuario_(llave);
  if (!u) return { ok: false, mensaje: 'Acceso solo para administradores' };
  sid = String(sid || '');
  const m = sid.match(/^(\d{4}-\d{2}-\d{2}_[\w-]{1,60})#[0-9a-f]{8}$/);
  if (!m) return { ok: false, mensaje: 'Pedido no válido' };
  const sol = leerRegistros_(m[1].slice(0, 10)).filter(r => String(r.ID_PARTE) === m[1] && r.SECCION === 'SOLICITUD').find(r => solId_(m[1], r) === sid);
  if (!sol) return { ok: false, mensaje: 'Ese pedido ya no existe (el usuario lo cambió).' };
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = hojaLib_();
    const v = sh.getDataRange().getValues();
    let fi = -1;
    for (let i = 1; i < v.length; i++) if (String(v[i][0]) === sid) { fi = i + 1; break; }
    const ts = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
    const fila = [sid, m[1], String(sol.LLAVE), txt_(sol.FECHA), t_(sol.DESCRIPCION, 40), t_(sol.CATEGORIA, 300), lib ? 'SI' : 'NO', u.llave, ts];
    if (fi < 0) fi = sh.getLastRow() + 1;
    sh.getRange(fi, 1, 1, 2).setNumberFormat('@');
    sh.getRange(fi, 1, 1, fila.length).setValues([fila]);
    return { ok: true, liberado: !!lib, por: u.llave, ts: ts };
  } finally {
    lock.releaseLock();
  }
}


/***** FOTOS PARA EL DASHBOARD (solo lectura) *****/
function adminFotos_(llave, desde, hasta) {
  if (!adminUsuario_(llave)) return { ok: false, mensaje: 'Acceso solo para administradores' };
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(desde || '') || !re.test(hasta || '') || desde > hasta) return { ok: false, mensaje: 'Fechas no válidas' };
  if ((new Date(hasta) - new Date(desde)) / 86400000 > 31) return { ok: false, mensaje: 'Máximo un mes (31 días) por consulta' };
  const filas = leerRegistros_(desde).filter(r => { const f = txt_(r.FECHA); return f >= desde && f <= hasta; });
  const deMat = {};
  filas.forEach(r => { if (r.SECCION === 'MATERIAL') String(r.FOTO_URL || '').split(' | ').forEach(u => { const k = idDrive_(u); if (k) deMat[r.ID_PARTE + '#' + k] = (deMat[r.ID_PARTE + '#' + k] || []).concat(acts_(r.ACTIVIDAD_ASIGNADA)); }); });
  const out = [];
  filas.forEach(r => {
    if (r.SECCION !== 'FOTO' || !idDrive_(r.FOTO_URL)) return;
    const id = String(r.ID_PARTE), k = id + '#' + idDrive_(r.FOTO_URL);
    const a = Array.from(new Set(acts_(r.ACTIVIDAD_ASIGNADA).concat(deMat[k] || []))).sort((x, y) => x - y);
    out.push({ id: id, foto: String(r.OBSERVACIONES), fecha: txt_(r.FECHA), llave: String(r.LLAVE), n: 0,
      tipo: String(r.CATEGORIA) === 'ALBARAN' ? 'ALBARAN' : 'GENERAL', caption: String(r.DESCRIPCION || ''), acts: a });
  });
  out.sort((x, y) => (x.id + x.foto).localeCompare(y.id + y.foto));
  const cont = {};
  out.forEach(f => { cont[f.id] = (cont[f.id] || 0) + 1; f.n = cont[f.id]; });
  return { ok: true, fotos: out };
}
function adminFoto_(llave, id, foto) {
  if (!adminUsuario_(llave)) return { ok: false, mensaje: 'Acceso solo para administradores' };
  if (!/^\d{4}-\d{2}-\d{2}_[\w-]{1,60}$/.test(String(id || '')) || !/^[\w-]{1,60}$/.test(String(foto || ''))) return { ok: false, mensaje: 'Foto no válida' };
  const rs = leerRegistros_(String(id).slice(0, 10));
  for (let i = 0; i < rs.length; i++) {
    const r = rs[i];
    if (r.SECCION !== 'FOTO' || String(r.ID_PARTE) !== id || String(r.OBSERVACIONES) !== foto) continue;
    const fid = idDrive_(r.FOTO_URL);
    if (!fid) break;
    try { const b = DriveApp.getFileById(fid).getBlob(); return { ok: true, tipo: b.getContentType(), data: Utilities.base64Encode(b.getBytes()) }; } catch (e) { break; }
  }
  return { ok: false, mensaje: 'Foto no disponible' };
}

/***** MIGRACION A LA CARPETA APP_CCSN (ejecutar una sola vez desde el editor) *****/
function migrarAAppCcsn() {
  const dest = DriveApp.getFolderById('1ERRpUYfyK4leU_4SD1PTuJtvoXq1_aRP');
  const p = PropertiesService.getScriptProperties();
  DriveApp.getFileById(ID_LIBRO_REGISTROS).moveTo(dest);
  const f = p.getProperty('CARPETA_FOTOS_ID');
  if (f) DriveApp.getFolderById(f).moveTo(buscarOCrear_(dest, 'FOTOS_OBRAS'));
  const i = p.getProperty('CARPETA_INFORMES_ID');
  if (i) DriveApp.getFolderById(i).moveTo(buscarOCrear_(dest, 'INFORMES'));
  Logger.log('OK libro=' + dest.getName() + ' fotos=' + (f || 'nueva') + ' informes=' + (i || 'nueva'));
}

/***** BIBLIOTECA DE INFORMES DE APPSHEET (libro BD_APP_CCSN) *****/
function equipoDe_(llave) {
  const d = SpreadsheetApp.openById(ID_LIBRO_USUARIOS).getSheetByName('Usuarios').getDataRange().getValues();
  const iE = d[0].map(x => String(x).toUpperCase()).indexOf('EQUIPO_DE');
  for (let i = 1; i < d.length; i++) if (String(d[i][0]).trim().toUpperCase() === String(llave).toUpperCase()) return iE < 0 ? '' : String(d[i][iE]);
  return '';
}
function biblioAppSheet_(fecha, u, url, ts, n, rev) {
  n = parseInt(n) || 1; rev = parseInt(rev) || 1;
  const sh = SpreadsheetApp.openById(ID_LIBRO_USUARIOS).getSheetByName('Biblioteca_Informes');
  if (!sh) return;
  const enc = encabezados_(sh);
  const codBase = 'PD-' + String(fecha).replace(/-/g, '') + '-' + String(u.llave).toUpperCase() + (n > 1 ? '-' + n : '');
  const cod = codBase + (rev > 1 ? '-R' + rev : '');
  const dato = { ID_DOCUMENTO: cod, FECHA_HORA: ts, NOMBRE_DOCUMENTO: 'Parte diario ' + fecha + ' - ' + u.nombre + (n > 1 ? ' (Informe ' + n + ')' : '') + (rev > 1 ? ' (Rev. ' + rev + ')' : ''), FORMATO: 'PDF', AUTOR: u.nombre,
    ARCHIVO: url, CRITERIOS_FILTRO: u.llave, EQUIPO_DE: equipoDe_(u.llave) };
  const fila = enc.map(h => dato[h] === undefined ? '' : dato[h]);
  const iId = enc.indexOf('ID_DOCUMENTO');
  const v = sh.getDataRange().getValues();
  const re = new RegExp('^' + codBase + '(-R\\d+)?$');
  let fi = -1;
  for (let i = v.length - 1; i >= 1; i--) {
    if (!re.test(String(v[i][iId]))) continue;
    if (fi < 0) fi = i + 1; else { sh.deleteRow(fi); fi = i + 1; }
  }
  if (fi < 0) { fi = sh.getLastRow() + 1; sh.getRange(fi, 1, 1, 1).setNumberFormat('@'); }
  sh.getRange(fi, 1, 1, fila.length).setValues([fila]);
}
function sincronizarBiblioteca() {
  const v = hojaPdf_().getDataRange().getValues();
  let n = 0;
  for (let i = 1; i < v.length; i++) {
    if (!String(v[i][5])) continue;
    const u = validarUsuario_(String(v[i][2]));
    if (!u) continue;
    biblioAppSheet_(txt_(v[i][1]), u, String(v[i][5]), txt_(v[i][6])); n++;
  }
  Logger.log('Biblioteca sincronizada: ' + n);
}

/***** MANTENIMIENTO: borra TODOS los PDF y sus filas (ejecutar solo a mano desde el editor) *****/
function limpiarPdfsPrueba() {
  const sh = hojaPdf_();
  const v = sh.getDataRange().getValues();
  let n = 0;
  for (let i = 1; i < v.length; i++) { const id = idDrive_(v[i][5]); if (id) { try { DriveApp.getFileById(id).setTrashed(true); n++; } catch (e) {} } }
  if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
  const b = SpreadsheetApp.openById(ID_LIBRO_USUARIOS).getSheetByName('Biblioteca_Informes');
  let m = 0;
  if (b) { const w = b.getDataRange().getValues(); for (let i = w.length - 1; i >= 1; i--) if (/^PD-/.test(String(w[i][0]))) { b.deleteRow(i + 1); m++; } }
  CacheService.getScriptCache().removeAll([]);
  Logger.log('PDF borrados: ' + n + ' | filas Biblioteca: ' + m);
}

/***** REGISTRO DE TRANSPORTES (modulo independiente: libro propio) *****/
const TR_COLS = ['COD_VALE','FECHA','TURNO','LLAVE','USUARIO','N_VALERA','VALERA_DE','PLACA','EMPRESA','TIPO_VOLQUETA','CAPACIDAD_M3','CONDUCTOR','MATERIAL','CENTRO_COSTOS','ORIGEN','DESTINO','CANT_DESPACHADA_M3','PESO_TON','KM','HORA_SALIDA','HORA_LLEGADA','OBSERVACIONES','FOTO_CARGA_URL','FOTO_RECIBO_URL','ESTADO','ALERTAS','SYNC_TARDE','TS_CREADO','TS_MODIFICADO','LAT_ORIGEN','LON_ORIGEN','PRECISION_GPS_M','UF_ORIGEN','PCT_CARGA'];
const TR_HOJAS = {
  Viajes: TR_COLS,
  Volquetas: ['PLACA','EMPRESA','TIPO','CAPACIDAD_M3','CONDUCTOR','ESTADO','VALIDADA','CREADA_POR'],
  Usuarios: ['LLAVE_ACCESO','NOMBRE','ROL'],
  Catalogos: ['TIPO','VALOR'],
  Planillas: ['FECHA','LLAVE','USUARIO','ARCHIVO','URL_PDF','TIMESTAMP'],
  Eliminados: ['COD_VALE','FECHA','LLAVE','USUARIO','TIMESTAMP'],
  Destinos: ['DESTINO','LAT','LON','RADIO_M','RECIBE','NOTAS'],
  UF: ['UF','LAT_INI','LON_INI','LAT_FIN','LON_FIN','LAT_CG','LON_CG','NOTAS']
};
// RECIBE: EXC = excavacion/descapote/arenas/limos/arcillas/tierra negra ; RCD = escombros/demolicion
const TR_SEMILLA_DESTINOS = [['DISPOAMBIENTAL','','','','EXC',''],['ARENAS Y GRAVAS VILLAMARIA','','','','RCD',''],['RECICLADOS INDUSTRIALES DE COLOMBIA','','','','RCD',''],['MINERSA','','','','RCD','POR CONFIRMAR: tambien recibe excavacion? (poner EXC,RCD)'],['VECOAGREINT','','','','RCD','']];
const TR_RE_COD = /^VT-\d{6}-[A-HJ-NP-Z2-9]{5}$/;
const TR_CATS = ['MATERIAL', 'ORIGEN', 'DESTINO', 'CENTRO_COSTOS'];

// Se ejecuta una vez a mano: crea el libro Registro_Transportes y sus hojas
function trConfiguracion() {
  const props = PropertiesService.getScriptProperties();
  let ss = null;
  const id = props.getProperty('ID_LIBRO_TR');
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('Registro_Transportes');
    const f = DriveApp.getFileById(ss.getId());
    try { raiz_().addFile(f); DriveApp.getRootFolder().removeFile(f); } catch (e) {}
    props.setProperty('ID_LIBRO_TR', ss.getId());
  }
  Object.keys(TR_HOJAS).forEach(n => trHoja_(n));
  ['Hoja 1', 'Sheet1', 'Hoja1'].forEach(n => { const s = ss.getSheetByName(n); if (s && ss.getSheets().length > 1) ss.deleteSheet(s); });
  trCarpeta_('FOTOS'); trCarpeta_('PLANILLAS');
  Logger.log('Listo: ' + ss.getUrl());
}
function trLibro_() {
  const id = PropertiesService.getScriptProperties().getProperty('ID_LIBRO_TR');
  if (!id) throw new Error('Falta ejecutar trConfiguracion');
  return SpreadsheetApp.openById(id);
}
function trHoja_(nombre) {
  const cols = TR_HOJAS[nombre];
  const ss = trLibro_();
  let sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sh.setFrozenRows(1);
    if (nombre === 'Viajes') [2, 6, 20, 21].forEach(c => sh.getRange(1, c, sh.getMaxRows(), 1).setNumberFormat('@'));
    if (nombre === 'Planillas' || nombre === 'Eliminados') sh.getRange(1, 1, sh.getMaxRows(), 2).setNumberFormat('@');
    if (nombre === 'Destinos') sh.getRange(2, 1, TR_SEMILLA_DESTINOS.length, 6).setValues(TR_SEMILLA_DESTINOS);
    if (nombre === 'UF') { const f = []; for (let i = 1; i <= 7; i++) f.push([i, '', '', '', '', '', '', '']); sh.getRange(2, 1, 7, 8).setValues(f); }
  } else if (sh.getLastColumn() < cols.length) {
    sh.getRange(1, sh.getLastColumn() + 1, 1, cols.length - sh.getLastColumn()).setValues([cols.slice(sh.getLastColumn())]).setFontWeight('bold');
  }
  return sh;
}
function trCarpeta_(sub) {
  const props = PropertiesService.getScriptProperties();
  const k = 'TR_CARPETA_' + sub;
  const id = props.getProperty(k);
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const c = buscarOCrear_(buscarOCrear_(raiz_(), 'TRANSPORTES'), sub);
  props.setProperty(k, c.getId());
  return c;
}
function trUsuario_(llave) {
  const clave = String(llave || '').trim().toUpperCase();
  if (!clave || clave.length > 40) return null;
  const cache = CacheService.getScriptCache();
  const ck = 'tru_' + clave;
  const hit = cache.get(ck);
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  if (Number(cache.get('trfallos') || 0) > 300) return null;
  const v = SpreadsheetApp.openById(ID_LIBRO_USUARIOS).getSheetByName('Usuarios').getDataRange().getValues();
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][0]).trim().toUpperCase() !== clave) continue;
    if (/ADMIN/.test(String(v[i][2]).toUpperCase())) return null;
    const u = { llave: String(v[i][0]).trim(), nombre: String(v[i][1]) };
    try { cache.put(ck, JSON.stringify(u), 300); } catch (e) {}
    return u;
  }
  cache.put('trfallos', String(Number(cache.get('trfallos') || 0) + 1), 600);
  Utilities.sleep(1500);
  return null;
}
function trDias_(fecha) { return Math.round((new Date(hoy_() + 'T00:00:00') - new Date(fecha + 'T00:00:00')) / 86400000); }
function trPlaca_(p) { return String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function trFila_(o) { return TR_COLS.map(c => (o[c] === undefined || o[c] === null) ? '' : o[c]); }
function trCoord_(x) { if (x === '' || x === null || x === undefined) return ''; const n = Number(String(x).replace(',', '.')); return isFinite(n) ? n : ''; }
function trKm_(la1, lo1, la2, lo2) {
  const R = 6371, rad = Math.PI / 180, dLa = (la2 - la1) * rad, dLo = (lo2 - lo1) * rad;
  const a = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(la1 * rad) * Math.cos(la2 * rad) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
// Sitios de disposicion (hoja Destinos). Si la hoja esta vacia se usa la lista base.
function trSitios_() {
  const cache = CacheService.getScriptCache(), hit = cache.get('trsitios');
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  const out = [];
  try {
    const v = trHoja_('Destinos').getDataRange().getValues();
    for (let i = 1; i < v.length; i++) {
      const n = String(v[i][0]).trim(); if (!n) continue;
      const t = String(v[i][4]).toUpperCase().split(/[,;\s]+/).filter(x => x === 'EXC' || x === 'RCD');
      out.push({ n: n, t: t, d: t.map(x => x === 'EXC' ? 'excavación, descapote, arenas, limos, arcillas, tierras negras' : 'RCD').join(' y '), lat: trCoord_(v[i][1]), lon: trCoord_(v[i][2]), radio: vac_(v[i][3]) });
    }
  } catch (e) {}
  if (!out.length) TR_SITIOS.forEach(x => out.push({ n: x[0], t: x[1], d: x[1].join(','), lat: '', lon: '', radio: '' }));
  try { cache.put('trsitios', JSON.stringify(out), 300); } catch (e) {}
  return out;
}
// Unidades funcionales: el centro de gravedad es el punto medio entre inicio y fin si no se escribio uno
function trUFs_() {
  const cache = CacheService.getScriptCache(), hit = cache.get('trufs');
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  const out = [];
  try {
    const v = trHoja_('UF').getDataRange().getValues();
    for (let i = 1; i < v.length; i++) {
      const uf = String(v[i][0]).trim(); if (!uf) continue;
      const a = trCoord_(v[i][1]), b = trCoord_(v[i][2]), c = trCoord_(v[i][3]), d = trCoord_(v[i][4]);
      let la = trCoord_(v[i][5]), lo = trCoord_(v[i][6]);
      if ((la === '' || lo === '') && a !== '' && b !== '' && c !== '' && d !== '') { la = (a + c) / 2; lo = (b + d) / 2; }
      out.push({ uf: uf, lat: la, lon: lo });
    }
  } catch (e) {}
  try { cache.put('trufs', JSON.stringify(out), 300); } catch (e) {}
  return out;
}
function trViaje_(r) {
  return { cod: String(r[0]), fecha: txt_(r[1]), turno: String(r[2]), usuario: String(r[4]), n_valera: String(r[5]), valera_de: String(r[6]), placa: String(r[7]), empresa: String(r[8]),
    tipo: String(r[9]), capacidad: vac_(r[10]), conductor: String(r[11]), material: String(r[12]), centro: String(r[13]), origen: String(r[14]), destino: String(r[15]),
    cant: vac_(r[16]), peso: vac_(r[17]), km: vac_(r[18]), hora_salida: hora_(r[19]), hora_llegada: hora_(r[20]), obs: String(r[21]),
    tiene_carga: !!String(r[22]), tiene_recibo: !!String(r[23]), estado: String(r[24]) || 'DESPACHADO', alertas: String(r[25]),
    lat: trCoord_(r[29]), lon: trCoord_(r[30]), prec: vac_(r[31]), uf: String(r[32] === undefined ? '' : r[32]), pct: vac_(r[33]) };
}

function trDatos_(llave) {
  const u = trUsuario_(llave);
  if (!u) return { ok: false, mensaje: 'Llave no válida' };
  const desde = Utilities.formatDate(new Date(Date.now() - 31 * 86400000), TZ, 'yyyy-MM-dd');
  const v = colaHoja_(trHoja_('Viajes'), 1, desde).v;
  const viajes = [];
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][3]).toUpperCase() !== u.llave.toUpperCase()) continue;
    const f = txt_(v[i][1]);
    if (f >= desde) viajes.push(trViaje_(v[i]));
  }
  const volquetas = [];
  const vv = trHoja_('Volquetas').getDataRange().getValues();
  for (let i = 1; i < vv.length; i++) {
    if (!String(vv[i][0]).trim() || /INACT/.test(String(vv[i][5]).toUpperCase())) continue;
    volquetas.push({ placa: trPlaca_(vv[i][0]), empresa: String(vv[i][1]), tipo: String(vv[i][2]), capacidad: vac_(vv[i][3]), conductor: String(vv[i][4]) });
  }
  const catalogos = { MATERIAL: [], ORIGEN: [], DESTINO: [], CENTRO_COSTOS: [] };
  const cv = trHoja_('Catalogos').getDataRange().getValues();
  for (let i = 1; i < cv.length; i++) { const t = String(cv[i][0]).toUpperCase(), x = String(cv[i][1]).trim(); if (catalogos[t] && x) catalogos[t].push(x); }
  const planillas = [];
  const pv = trHoja_('Planillas').getDataRange().getValues();
  for (let i = 1; i < pv.length; i++) if (String(pv[i][1]).toUpperCase() === u.llave.toUpperCase() && txt_(pv[i][0]) >= desde) planillas.push({ fecha: txt_(pv[i][0]), url: String(pv[i][4]) });
  return { ok: true, nombre: u.nombre, llave: u.llave, hoy: hoy_(), volquetas: volquetas, catalogos: catalogos, viajes: viajes, planillas: planillas, sitios: trSitios_(), ufs: trUFs_() };
}

function trSubirFoto_(data, cod, cual) {
  const m = String(data || '').match(/^data:image\/(jpeg|png);base64,(.+)$/);
  if (!m || m[2].length > 4500000) return '';
  const nombre = cod + '_' + cual + '_' + Utilities.getUuid().slice(0, 6) + (m[1] === 'png' ? '.png' : '.jpg');
  return trCarpeta_('FOTOS').createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), 'image/' + m[1], nombre)).getUrl();
}
function trUrls_(c) { return String(c || '').split(/\s+/).filter(Boolean); }
function trSubirFotos_(data, cod, cual, yaHay) {
  const arr = (Array.isArray(data) ? data : [data]).filter(Boolean), out = [];
  for (let i = 0; i < arr.length && yaHay + out.length < 10; i++) { const u = trSubirFoto_(arr[i], cod, cual); if (u) out.push(u); }
  return out;
}
function trBorrarArchivo_(url) { const id = idDrive_(url); if (id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} } }
function trCatalogo_(tipo, valor) {
  const x = String(valor || '').trim(); if (!x) return;
  const sh = trHoja_('Catalogos'), v = sh.getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (String(v[i][0]).toUpperCase() === tipo && String(v[i][1]).trim().toUpperCase() === x.toUpperCase()) return;
  sh.appendRow([tipo, x]);
}
// Primera fila de la ventana reciente. Lee solo la columna FECHA (de abajo hacia arriba) en bloques.
function trIniVentana_(sh, corte) {
  const last = sh.getLastRow(); if (last < 2) return 2;
  const lim = restaDias_(corte, 7);
  let fin = last, ini = last + 1;
  while (fin >= 2) {
    const a = Math.max(2, fin - 2999), col = sh.getRange(a, 2, fin - a + 1, 1).getValues();
    ini = a; fin = a - 1;
    if (col.every(r => txt_(r[0]) < lim)) break;
  }
  return ini;
}
function trNCols_(sh) { return Math.max(sh.getLastColumn(), TR_COLS.length); }
// Busca un vale leyendo solo 7 columnas (vale ... valera) de la ventana; la fila completa se lee una sola vez.
function trBuscar_(sh, cod) {
  const m = String(cod).match(/^VT-(\d{2})(\d{2})(\d{2})-/);
  const corte = restaDias_(m ? '20' + m[1] + '-' + m[2] + '-' + m[3] : hoy_(), 35);
  const last = sh.getLastRow();
  if (last < 2) return { fi: -1, fila: null, todo: [[]] };
  const ini = trIniVentana_(sh, corte), n = last - ini + 1, v7 = sh.getRange(ini, 1, n, 7).getValues();
  let fi = -1;
  for (let i = 0; i < n; i++) if (String(v7[i][0]) === cod) { fi = ini + i; break; }
  const todo = [[]].concat(v7);
  if (fi < 0) return { fi: -1, fila: null, todo: todo };
  return { fi: fi, fila: sh.getRange(fi, 1, 1, trNCols_(sh)).getValues()[0], todo: todo };
}
// Varios vales de una sola pasada (Excel con fotos): devuelve { cod: fila }
function trBuscarLote_(sh, cods) {
  const out = {}, last = sh.getLastRow(); if (last < 2 || !cods.length) return out;
  const fechas = cods.map(c => { const m = String(c).match(/^VT-(\d{2})(\d{2})(\d{2})-/); return m ? '20' + m[1] + '-' + m[2] + '-' + m[3] : hoy_(); }).sort();
  const ini = trIniVentana_(sh, restaDias_(fechas[0], 35)), n = last - ini + 1, A = sh.getRange(ini, 1, n, 1).getValues(), nc = trNCols_(sh);
  for (let i = 0; i < n; i++) { const c = String(A[i][0]); if (cods.indexOf(c) >= 0 && !out[c]) out[c] = sh.getRange(ini + i, 1, 1, nc).getValues()[0]; }
  return out;
}

const TR_SITIOS = [['DISPOAMBIENTAL', ['EXC']], ['ARENAS Y GRAVAS VILLAMARIA', ['RCD']], ['RECICLADOS INDUSTRIALES DE COLOMBIA', ['RCD']], ['MINERSA', ['RCD']], ['VECOAGREINT', ['RCD']]];
function trAlertaSitio_(mat, dest) {
  const t = String(mat || '').toUpperCase(), d = String(dest || '').trim().toUpperCase().replace(/Í/g, 'I');
  const tr = /ESCOMBRO|RCD|DEMOLICI/.test(t) ? 'RCD' : (/EXCAVA|DESCAPOTE|LIMO|ARCILLA|TIERRA NEGRA/.test(t) ? 'EXC' : '');
  const S = trSitios_();
  for (let i = 0; i < S.length; i++) if (S[i].n.toUpperCase().replace(/Í/g, 'I') === d) return tr && S[i].t.indexOf(tr) < 0 ? 'Material no corresponde al sitio (' + dest + ' no recibe ' + (tr === 'RCD' ? 'RCD' : 'excavación/descapote') + ')' : '';
  return tr && d ? 'Sitio de disposición NO autorizado (' + dest + ')' : '';
}
function trGuardar_(llave, d) {
  const u = trUsuario_(llave);
  if (!u) return { ok: false, mensaje: 'Llave no válida' };
  d = d || {};
  const cod = String(d.cod || '').toUpperCase();
  if (!TR_RE_COD.test(cod)) return { ok: false, mensaje: 'Código de vale no válido' };
  const fecha = String(d.fecha || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, mensaje: 'Fecha no válida' };
  const dias = trDias_(fecha);
  if (!(dias >= 0 && dias <= 3)) return { ok: false, codigo: 'PASADO', mensaje: 'La fecha del viaje ya está cerrada.' };
  const placa = trPlaca_(d.placa);
  if (!/^[A-Z0-9]{5,7}$/.test(placa)) return { ok: false, mensaje: 'La placa no es válida' };
  const turno = d.turno === 'NOCHE' ? 'NOCHE' : 'DIA';
  const cant = num_(d.cant);
  if (!(cant > 0 && cant <= 60)) return { ok: false, mensaje: 'La cantidad despachada no es válida' };
  const peso = d.peso === '' || d.peso === undefined || d.peso === null ? '' : num_(d.peso);
  if (peso !== '' && !(peso >= 0 && peso <= 100)) return { ok: false, mensaje: 'El peso no es válido' };
  const km = d.km === '' || d.km === undefined || d.km === null ? '' : num_(d.km);
  if (km !== '' && !(km >= 0 && km <= 500)) return { ok: false, mensaje: 'Los kilómetros no son válidos' };
  const cap = d.capacidad === '' || d.capacidad === undefined ? '' : num_(d.capacidad);
  const uf = String(d.uf === undefined || d.uf === null ? '' : d.uf).toUpperCase().trim();
  if (uf && !/^([1-7]|OTRO)$/.test(uf)) return { ok: false, mensaje: 'La UF no es válida' };
  const pct = d.pct === '' || d.pct === undefined || d.pct === null ? '' : num_(d.pct);
  if (pct !== '' && !(pct >= 0 && pct <= 120)) return { ok: false, mensaje: 'El porcentaje de carga no es válido' };
  const hhmm = /^\d{2}:\d{2}$/;
  const hs = String(d.hora_salida || ''), hl = String(d.hora_llegada || '');
  if ((hs && !hhmm.test(hs)) || (hl && !hhmm.test(hl))) return { ok: false, mensaje: 'Revisa las horas' };
  if (!t_(d.material) || !t_(d.origen) || !t_(d.destino) || !t_(d.conductor) || !hs) return { ok: false, mensaje: 'Faltan conductor, material, origen, destino u hora de salida' };
  if (!t_(d.n_valera) || !t_(d.centro) || !(km !== '' && km > 0)) return { ok: false, mensaje: 'Faltan el N° de valera, el centro de costos o la distancia en km' };
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = trHoja_('Viajes');
    const b = trBuscar_(sh, cod);
    const ahora = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
    let fotoCarga = b.fila ? String(b.fila[22]) : '', fotoRecibo = b.fila ? String(b.fila[23]) : '', creado = ahora;
    if (b.fila) {
      if (String(b.fila[3]).toUpperCase() !== u.llave.toUpperCase()) return { ok: false, codigo: 'DUP', mensaje: 'Código repetido' };
      if (txt_(b.fila[1]) !== fecha) return { ok: false, codigo: 'PASADO', mensaje: 'No se puede cambiar la fecha del vale.' };
      if (dias > 0 && String(d.ed || '') !== fecha) return { ok: false, codigo: 'PASADO', mensaje: 'Solo se puede editar el viaje del día.' };
      creado = String(b.fila[27]);
    }
    const alertas = [];
    const nv = t_(d.n_valera, 40), vd = d.valera_de === 'NUESTRA' ? 'NUESTRA' : (d.valera_de === 'VOLQUETERO' ? 'VOLQUETERO' : '');
    if (nv) for (let i = 1; i < b.todo.length; i++) if (String(b.todo[i][0]) !== cod && String(b.todo[i][5]).toUpperCase() === nv.toUpperCase() && String(b.todo[i][6]) === vd) { alertas.push('Valera repetida (vale ' + b.todo[i][0] + ')'); break; }
    const vol = trHoja_('Volquetas'), vv = vol.getDataRange().getValues();
    let conocida = false, reg = null;
    for (let i = 1; i < vv.length; i++) if (trPlaca_(vv[i][0]) === placa) { conocida = true; reg = vv[i]; break; }
    if (conocida) {
      const nz = x => String(x || '').toUpperCase().replace(/\s+/g, ' ').trim();
      if (nz(reg[4]) && t_(d.conductor) && nz(reg[4]) !== nz(d.conductor)) alertas.push('Conductor distinto al registrado (' + reg[4] + ')');
      if (nz(reg[1]) && t_(d.empresa) && nz(reg[1]) !== nz(d.empresa)) alertas.push('Empresa distinta a la registrada (' + reg[1] + ')');
      if (nz(reg[2]) && t_(d.tipo) && nz(reg[2]) !== nz(d.tipo)) alertas.push('Tipo distinto al registrado (' + reg[2] + ')');
      if (reg[3] !== '' && cap !== '' && !isNaN(cap) && Number(reg[3]) !== cap) alertas.push('Capacidad distinta a la registrada (' + reg[3] + ' m3)');
    }
    if (!conocida) { for (let i = 1; i < vv.length; i++) { if (trParecida_(trPlaca_(vv[i][0]), placa)) { alertas.push('Placa parecida a ' + trPlaca_(vv[i][0]) + ' (posible error)'); break; } }
      alertas.push('Placa nueva por validar'); vol.appendRow([placa, t_(d.empresa, 80), t_(d.tipo, 40), cap === '' || isNaN(cap) ? '' : cap, t_(d.conductor, 80), 'ACTIVA', 'NO', u.llave]); }
    if (cap !== '' && !isNaN(cap) && cant > cap * 1.05) alertas.push('Cantidad mayor que la capacidad');
    { const as = trAlertaSitio_(d.material, d.destino); if (as) alertas.push(as); }
    if (pct !== '' && pct > 105) alertas.push('Carga por encima del 100 % de la tolva (' + pct + ' %)');
    if (d.foto_carga) { const nuevas = trSubirFotos_(d.foto_carga, cod, 'carga', trUrls_(fotoCarga).length); if (nuevas.length) fotoCarga = trUrls_(fotoCarga).concat(nuevas).join('\n'); }
    // ubicacion GPS del origen (opcional): si el cliente no la envia se conserva la que ya habia
    let lat = b.fila ? b.fila[29] : '', lon = b.fila ? b.fila[30] : '', prec = b.fila ? b.fila[31] : '';
    if (d.lat !== undefined) {
      const la = Number(d.lat), lo = Number(d.lon), pr = Number(d.prec);
      if (d.lat !== '' && d.lat !== null && isFinite(la) && isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180) { lat = Math.round(la * 1e6) / 1e6; lon = Math.round(lo * 1e6) / 1e6; prec = isFinite(pr) && pr >= 0 ? Math.round(pr) : ''; }
      else { lat = ''; lon = ''; prec = ''; }
    }
    const o = { COD_VALE: cod, FECHA: fecha, TURNO: turno, LLAVE: u.llave, USUARIO: u.nombre, N_VALERA: nv, VALERA_DE: vd, PLACA: placa, EMPRESA: t_(d.empresa, 80), TIPO_VOLQUETA: t_(d.tipo, 40),
      CAPACIDAD_M3: cap === '' || isNaN(cap) ? '' : cap, CONDUCTOR: t_(d.conductor, 80), MATERIAL: t_(d.material, 80), CENTRO_COSTOS: t_(d.centro, 40), ORIGEN: t_(d.origen, 80), DESTINO: t_(d.destino, 80),
      CANT_DESPACHADA_M3: cant, PESO_TON: peso, KM: km, HORA_SALIDA: hs, HORA_LLEGADA: hl, OBSERVACIONES: t_(d.obs, 300), FOTO_CARGA_URL: fotoCarga, FOTO_RECIBO_URL: fotoRecibo,
      ESTADO: fotoRecibo ? 'RECIBIDO' : 'DESPACHADO', ALERTAS: alertas.join('; '), SYNC_TARDE: dias > 0 ? 'SI' : '', TS_CREADO: creado, TS_MODIFICADO: ahora, LAT_ORIGEN: lat, LON_ORIGEN: lon, PRECISION_GPS_M: prec, UF_ORIGEN: uf, PCT_CARGA: pct };
    const fi = b.fi > 0 ? b.fi : sh.getLastRow() + 1;
    sh.getRange(fi, 1, 1, TR_COLS.length).setValues([trFila_(o)]);
    TR_CATS.forEach(t => trCatalogo_(t, { MATERIAL: o.MATERIAL, ORIGEN: o.ORIGEN, DESTINO: o.DESTINO, CENTRO_COSTOS: o.CENTRO_COSTOS }[t]));
    return { ok: true, cod: cod, alertas: alertas, tiene_carga: !!fotoCarga };
  } finally {
    lock.releaseLock();
  }
}

function trRecibo_(llave, cod, foto) {
  const u = trUsuario_(llave);
  if (!u) return { ok: false, mensaje: 'Llave no válida' };
  cod = String(cod || '').toUpperCase();
  if (!TR_RE_COD.test(cod)) return { ok: false, mensaje: 'Código de vale no válido' };
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = trHoja_('Viajes');
    const b = trBuscar_(sh, cod);
    if (!b.fila || String(b.fila[3]).toUpperCase() !== u.llave.toUpperCase()) return { ok: false, mensaje: 'Vale no encontrado' };
    const dias = trDias_(txt_(b.fila[1]));
    if (dias > 1) return { ok: false, codigo: 'PASADO', mensaje: 'Ya pasó el plazo para subir el recibo.' };
    const nuevas = trSubirFotos_(foto, cod, 'recibo', trUrls_(b.fila[23]).length);
    if (!nuevas.length) return { ok: false, mensaje: 'La foto no es válida' };
    sh.getRange(b.fi, 24).setValue(trUrls_(b.fila[23]).concat(nuevas).join('\n'));
    sh.getRange(b.fi, 25).setValue('RECIBIDO');
    sh.getRange(b.fi, 29).setValue(Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'));
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function trEliminar_(llave, cod) {
  const u = trUsuario_(llave);
  if (!u) return { ok: false, mensaje: 'Llave no válida' };
  cod = String(cod || '').toUpperCase();
  if (!TR_RE_COD.test(cod)) return { ok: false, mensaje: 'Código de vale no válido' };
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = trHoja_('Viajes');
    const b = trBuscar_(sh, cod);
    if (!b.fila) return { ok: true };
    if (String(b.fila[3]).toUpperCase() !== u.llave.toUpperCase()) return { ok: false, mensaje: 'Vale no encontrado' };
    if (txt_(b.fila[1]) !== hoy_()) return { ok: false, codigo: 'PASADO', mensaje: 'Solo se puede eliminar un viaje del día.' };
    trUrls_(b.fila[22]).concat(trUrls_(b.fila[23])).forEach(u => trBorrarArchivo_(u));
    trHoja_('Eliminados').appendRow([cod, txt_(b.fila[1]), u.llave, u.nombre, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss')]);
    sh.deleteRow(b.fi);
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function trFoto_(llave, cod, cual) {
  const u = trUsuario_(llave);
  if (!u) return { ok: false, mensaje: 'Llave no válida' };
  cod = String(cod || '').toUpperCase();
  if (!TR_RE_COD.test(cod)) return { ok: false, mensaje: 'Código de vale no válido' };
  const b = trBuscar_(trHoja_('Viajes'), cod);
  if (!b.fila || String(b.fila[3]).toUpperCase() !== u.llave.toUpperCase()) return { ok: false, mensaje: 'Vale no encontrado' };
  const urls = trUrls_(b.fila[cual === 'recibo' ? 23 : 22]), datas = [];
  urls.forEach(url => { const id = idDrive_(url); if (!id) return; try { const blob = DriveApp.getFileById(id).getBlob(); datas.push('data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes())); } catch (e) {} });
  if (!datas.length) return { ok: false, mensaje: 'No hay foto' };
  return { ok: true, data: datas[0], datas: datas };
}

function biblioPlanilla_(fecha, u, url, ts) {
  const sh = SpreadsheetApp.openById(ID_LIBRO_USUARIOS).getSheetByName('Biblioteca_Informes');
  if (!sh) return;
  const enc = encabezados_(sh);
  const cod = 'PT-' + String(fecha).replace(/-/g, '') + '-' + String(u.llave).toUpperCase();
  const dato = { ID_DOCUMENTO: cod, FECHA_HORA: ts, NOMBRE_DOCUMENTO: 'Planilla de viajes de volquetas ' + fecha + ' - ' + u.nombre, FORMATO: 'PDF', AUTOR: u.nombre, ARCHIVO: url, CRITERIOS_FILTRO: u.llave, EQUIPO_DE: equipoDe_(u.llave) };
  const fila = enc.map(h => dato[h] === undefined ? '' : dato[h]);
  const iId = enc.indexOf('ID_DOCUMENTO'), v = sh.getDataRange().getValues();
  let fi = -1;
  for (let i = v.length - 1; i >= 1; i--) if (String(v[i][iId]) === cod) { if (fi < 0) fi = i + 1; else sh.deleteRow(i + 1); }
  if (fi < 0) { fi = sh.getLastRow() + 1; sh.getRange(fi, 1, 1, 1).setNumberFormat('@'); }
  sh.getRange(fi, 1, 1, fila.length).setValues([fila]);
}
function adminVolqueta_(llave, d) {
  const u = adminUsuario_(llave);
  if (!u) return { ok: false, mensaje: 'Acceso solo para administradores' };
  d = d || {};
  const placa = trPlaca_(d.placa);
  if (!/^[A-Z0-9]{5,7}$/.test(placa)) return { ok: false, mensaje: 'Placa no válida' };
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = trHoja_('Volquetas'), v = sh.getDataRange().getValues();
    let fi = -1;
    for (let i = 1; i < v.length; i++) if (trPlaca_(v[i][0]) === placa) { fi = i + 1; break; }
    if (d.cambio === 'crear') {
      if (fi > 0) return { ok: false, mensaje: 'Esa placa ya está en el listado' };
      const cap = d.capacidad === '' || d.capacidad === undefined ? '' : num_(d.capacidad);
      sh.appendRow([placa, t_(d.empresa, 80), t_(d.tipo, 40), cap === '' || isNaN(cap) ? '' : cap, t_(d.conductor, 80), 'ACTIVA', 'SI', u.llave]);
    } else {
      if (fi < 0) return { ok: false, mensaje: 'Placa no encontrada' };
      if (d.cambio === 'editar') {
        const np = d.placa_nueva ? trPlaca_(d.placa_nueva) : placa;
        if (!/^[A-Z0-9]{5,7}$/.test(np)) return { ok: false, mensaje: 'La placa nueva no es válida' };
        if (np !== placa) for (let i = 1; i < v.length; i++) if (trPlaca_(v[i][0]) === np) return { ok: false, mensaje: 'Esa placa ya está en el listado' };
        const cap = d.capacidad === '' || d.capacidad === undefined ? '' : num_(d.capacidad);
        sh.getRange(fi, 1, 1, 5).setValues([[np, t_(d.empresa, 80), t_(d.tipo, 40), cap === '' || isNaN(cap) ? '' : cap, t_(d.conductor, 80)]]);
      } else if (d.cambio === 'confirmar') sh.getRange(fi, 7).setValue('SI');
      else if (d.cambio === 'estado') sh.getRange(fi, 6).setValue(d.estado === 'INACTIVA' ? 'INACTIVA' : 'ACTIVA');
      else return { ok: false, mensaje: 'Acción no válida' };
    }
    const vv = sh.getDataRange().getValues(), volquetas = [];
    for (let i = 1; i < vv.length; i++) if (String(vv[i][0]).trim()) volquetas.push({ placa: trPlaca_(vv[i][0]), empresa: String(vv[i][1]), tipo: String(vv[i][2]), capacidad: vac_(vv[i][3]), conductor: String(vv[i][4]), estado: String(vv[i][5]), validada: String(vv[i][6]), creada_por: String(vv[i][7]) });
    return { ok: true, volquetas: volquetas };
  } finally {
    lock.releaseLock();
  }
}
function adminTransportes_(llave, desde, hasta) {
  const u = adminUsuario_(llave);
  if (!u) return { ok: false, mensaje: 'Acceso solo para administradores' };
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(desde || '') || !re.test(hasta || '') || desde > hasta) return { ok: false, mensaje: 'Fechas no válidas' };
  if ((new Date(hasta) - new Date(desde)) / 86400000 > 31) return { ok: false, mensaje: 'Máximo un mes (31 días) por consulta' };
  const v = colaHoja_(trHoja_('Viajes'), 1, desde).v, viajes = [];
  for (let i = 1; i < v.length; i++) {
    const f = txt_(v[i][1]);
    if (f < desde || f > hasta) continue;
    viajes.push(Object.assign(trViaje_(v[i]), { llave: String(v[i][3]), fotos_c: trUrls_(v[i][22]), fotos_r: trUrls_(v[i][23]) }));
  }
  viajes.sort((a, b) => (b.fecha + (b.hora_salida || '')).localeCompare(a.fecha + (a.hora_salida || '')));
  const vv = trHoja_('Volquetas').getDataRange().getValues(), volquetas = [];
  for (let i = 1; i < vv.length; i++) if (String(vv[i][0]).trim()) volquetas.push({ placa: trPlaca_(vv[i][0]), empresa: String(vv[i][1]), tipo: String(vv[i][2]), capacidad: vac_(vv[i][3]), conductor: String(vv[i][4]), estado: String(vv[i][5]), validada: String(vv[i][6]), creada_por: String(vv[i][7]) });
  const pv = trHoja_('Planillas').getDataRange().getValues(), planillas = [];
  for (let i = 1; i < pv.length; i++) { const f = txt_(pv[i][0]); if (f >= desde && f <= hasta) planillas.push({ fecha: f, llave: String(pv[i][1]), usuario: String(pv[i][2]), archivo: String(pv[i][3]), url: String(pv[i][4]) }); }
  planillas.sort((a, b) => (b.fecha + b.llave).localeCompare(a.fecha + a.llave));
  return { ok: true, hoy: hoy_(), viajes: viajes, volquetas: volquetas, planillas: planillas, sitios: trSitios_(), ufs: trUFs_() };
}
function trPlanilla_(llave, fecha, b64) {
  const u = trUsuario_(llave);
  if (!u) return { ok: false, mensaje: 'Llave no válida' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha || ''))) return { ok: false, mensaje: 'Fecha no válida' };
  if (!b64 || String(b64).length > 9000000) return { ok: false, mensaje: 'PDF no válido' };
  const bytes = Utilities.base64Decode(String(b64));
  if (bytes.length < 100 || String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== '%PDF') return { ok: false, mensaje: 'PDF no válido' };
  const nombre = 'Planilla_' + String(u.llave).replace(/[^\w-]/g, '') + '_' + fecha + '_' + Utilities.formatDate(new Date(), TZ, 'HHmm') + '.pdf';
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = trHoja_('Planillas'), v = sh.getDataRange().getValues();
    let fi = -1;
    for (let i = 1; i < v.length; i++) if (txt_(v[i][0]) === fecha && String(v[i][1]).toUpperCase() === u.llave.toUpperCase()) { fi = i + 1; break; }
    if (fi > 0) trBorrarArchivo_(String(v[fi - 1][4]));
    const url = trCarpeta_('PLANILLAS').createFile(Utilities.newBlob(bytes, 'application/pdf', nombre)).getUrl();
    const fila = [fecha, u.llave, u.nombre, nombre, url, Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss')];
    if (fi < 0) fi = sh.getLastRow() + 1;
    sh.getRange(fi, 1, 1, fila.length).setValues([fila]);
    try { biblioPlanilla_(fecha, u, url, fila[5]); } catch (e) {}
    return { ok: true, url: url };
  } finally {
    lock.releaseLock();
  }
}

/***** TRANSPORTES: herramientas del dashboard (solo administradores) *****/
function trDataFoto_(url) {
  const id = idDrive_(url); if (!id) return '';
  try { const b = DriveApp.getFileById(id).getBlob(); return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()); } catch (e) { return ''; }
}
function adminTrFoto_(llave, cod, cual, i) {
  if (!adminUsuario_(llave)) return { ok: false, mensaje: 'Acceso solo para administradores' };
  cod = String(cod || '').toUpperCase();
  if (!TR_RE_COD.test(cod)) return { ok: false, mensaje: 'Código de vale no válido' };
  const b = trBuscar_(trHoja_('Viajes'), cod);
  if (!b.fila) return { ok: false, mensaje: 'Vale no encontrado' };
  const urls = trUrls_(b.fila[cual === 'recibo' ? 23 : 22]);
  if (!urls.length) return { ok: false, mensaje: 'No hay foto' };
  const k = Math.max(0, Math.min(urls.length - 1, Number(i) || 0)), data = trDataFoto_(urls[k]);
  return data ? { ok: true, data: data, total: urls.length, i: k } : { ok: false, mensaje: 'No se pudo abrir la foto' };
}
// primera foto de carga y de recibo de varios vales (para el Excel con fotos)
function adminTrFotos_(llave, cods) {
  if (!adminUsuario_(llave)) return { ok: false, mensaje: 'Acceso solo para administradores' };
  const out = {};
  const L = (Array.isArray(cods) ? cods : []).slice(0, 6).map(c => String(c || '').toUpperCase()).filter(c => TR_RE_COD.test(c));
  const filas = trBuscarLote_(trHoja_('Viajes'), L);
  Object.keys(filas).forEach(c => { out[c] = { c: trDataFoto_(trUrls_(filas[c][22])[0]), r: trDataFoto_(trUrls_(filas[c][23])[0]) }; });
  return { ok: true, fotos: out };
}
// buscador por N° de albaran/valera, codigo de vale o placa (todo el historial)
function adminTrBuscar_(llave, q) {
  if (!adminUsuario_(llave)) return { ok: false, mensaje: 'Acceso solo para administradores' };
  q = String(q || '').trim().toUpperCase();
  if (q.length < 2) return { ok: false, mensaje: 'Escribe al menos 2 caracteres' };
  const sh = trHoja_('Viajes'), last = sh.getLastRow(), pq = trPlaca_(q);
  if (last < 2) return { ok: true, viajes: [], total: 0 };
  const v = sh.getRange(2, 1, last - 1, 8).getValues(), hits = [];   // solo vale, valera y placa
  for (let i = 0; i < v.length; i++) {
    const nv = String(v[i][5]).toUpperCase(), cod = String(v[i][0]).toUpperCase();
    if (nv.indexOf(q) >= 0 || cod.indexOf(q) >= 0 || (pq && trPlaca_(v[i][7]) === pq)) hits.push(i + 2);
  }
  const ult = hits.slice(-60), total = hits.length, out = [];
  if (ult.length) {
    const a = ult[0], b = ult[ult.length - 1], nc = trNCols_(sh);
    const blk = b - a < 1500 ? sh.getRange(a, 1, b - a + 1, nc).getValues() : null;
    ult.forEach(fi => { const r = blk ? blk[fi - a] : sh.getRange(fi, 1, 1, nc).getValues()[0]; out.push(Object.assign(trViaje_(r), { llave: String(r[3]), nc: trUrls_(r[22]).length, nr: trUrls_(r[23]).length })); });
  }
  out.sort((x, y) => (y.fecha + (y.hora_salida || '')).localeCompare(x.fecha + (x.hora_salida || '')));
  return { ok: true, viajes: out.slice(0, 40), total: total };
}
// descarga de un PDF de planilla (evita que Drive pida "solicitar acceso")
function adminTrPdf_(llave, url) {
  if (!adminUsuario_(llave)) return { ok: false, mensaje: 'Acceso solo para administradores' };
  const pv = trHoja_('Planillas').getDataRange().getValues();
  let ok = false; for (let i = 1; i < pv.length; i++) if (String(pv[i][4]) === String(url)) { ok = true; break; }
  const id = idDrive_(url);
  if (!ok || !id) return { ok: false, mensaje: 'PDF no encontrado' };
  try { const b = DriveApp.getFileById(id).getBlob(); return { ok: true, pdf: Utilities.base64Encode(b.getBytes()), nombre: b.getName() }; } catch (e) { return { ok: false, mensaje: 'No se pudo abrir el PDF' }; }
}
function trPctViaje_(v) {
  if (v.pct !== '' && v.pct !== undefined && !isNaN(Number(v.pct))) return Number(v.pct);
  const cap = Number(v.capacidad), c = Number(v.cant);
  return cap > 0 && c > 0 ? Math.round(c / cap * 100) : null;
}
function trResumen_(V, ufs, sitios) {
  const g = (obj, k) => (obj[k] = obj[k] || { n: 0, q: 0, ps: 0, pn: 0 });
  const R = { n: V.length, q: 0, placas: {}, dest: {}, uf: {}, mat: {}, vol: {}, emp: {}, ps: 0, pn: 0, ks: 0, kn: 0, qkm: 0, alertas: [], sinRec: 0, hoy: hoy_() };
  V.forEach(v => {
    const q = Number(v.cant) || 0, p = trPctViaje_(v), km = Number(v.km) || 0;
    R.q += q; R.placas[v.placa] = 1; if (p !== null) { R.ps += p; R.pn++; } if (km > 0) { R.ks += km; R.kn++; R.qkm += q * km; }
    if (v.alertas) R.alertas.push(v); if (!v.tiene_recibo && v.fecha < R.hoy) R.sinRec++;
    [[R.dest, v.destino || '—'], [R.uf, v.uf ? (v.uf === 'OTRO' ? 'Otro' : 'UF ' + v.uf) : 'Sin UF'], [R.mat, v.material || '—'], [R.vol, v.placa], [R.emp, v.empresa || '—']].forEach(a => { const o = g(a[0], a[1]); o.n++; o.q += q; if (p !== null) { o.ps += p; o.pn++; } });
  });
  return R;
}
function trTop_(obj, n) { return Object.keys(obj).map(k => ({ k: k, n: obj[k].n, q: obj[k].q, p: obj[k].pn ? obj[k].ps / obj[k].pn : null })).sort((a, b) => b.q - a.q).slice(0, n || 99); }
function htmlCierreTr_(desde, hasta, V, R, quien) {
  const e = s => String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const dd = s => s.slice(8) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
  const nf = x => (Math.round(x * 10) / 10).toString().replace('.', ',');
  const barra = (v, max, col) => { const w = max > 0 ? Math.max(2, Math.min(100, Math.round(v / max * 100))) : 1; return '<table width="100%" cellpadding="0" cellspacing="0" style="border:none"><tr><td width="' + w + '%" style="border:none;border-top:9px solid ' + col + ';padding:0;font-size:1px">&nbsp;</td><td style="border:none;padding:0">&nbsp;</td></tr></table>'; };
  const kpi = (n, t, col) => '<td style="width:16%;border:1px solid #cfd8dc;text-align:center;padding:8px 2px;border-top:4px solid ' + col + '"><div style="font-size:21px;font-weight:bold;color:' + col + '">' + n + '</div><div style="font-size:9px;color:#546e7a">' + t + '</div></td>';
  const pm = R.pn ? R.ps / R.pn : null, km = R.kn ? R.ks / R.kn : null;
  const periodo = desde === hasta ? dd(desde) : dd(desde) + ' al ' + dd(hasta);
  let h = '<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:10px;color:#263238;margin:0}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cfd8dc;padding:3px 5px;font-size:9px}th{background:#eceff1;color:#37474f;text-align:left}td.n{text-align:right}h2{font-size:12px;color:#1b5e20;border-bottom:2px solid #2e7d32;padding-bottom:3px;margin:14px 0 5px}</style></head><body>';
  h += '<table style="border:none"><tr><td style="border:none;padding:12px 16px;border-top:10px solid #1b5e20;border-bottom:2px solid #1b5e20"><div style="font-size:19px;font-weight:bold;color:#1b5e20">CIERRE DE TRANSPORTES</div><div style="font-size:11px">' + periodo + ' &middot; generado ' + e(quien) + '</div></td></tr></table>';
  h += '<table style="border:none;margin-top:8px;border-spacing:4px"><tr>' + kpi(R.n, 'VIAJES', '#1b5e20') + kpi(nf(R.q), 'M3 MOVILIZADOS', '#0277bd') + kpi(Object.keys(R.placas).length, 'VOLQUETAS', '#ef6c00') +
    kpi(pm === null ? '—' : Math.round(pm) + ' %', 'CARGA PROMEDIO', '#6a1b9a') + kpi(km === null ? '—' : nf(km), 'KM PROMEDIO', '#00838f') + kpi(R.alertas.length + ' / ' + R.sinRec, 'ALERTAS / SIN RECIBO', '#c62828') + '</tr></table>';
  const bloque = (titulo, arr, col, conPct) => {
    if (!arr.length) return '';
    const mx = Math.max.apply(null, arr.map(x => x.q).concat([1]));
    let t = '<h2>' + titulo + '</h2><table><tr><th>Nombre</th><th style="width:38%">m3</th><th>m3</th><th>Viajes</th>' + (conPct ? '<th>Carga %</th>' : '') + '</tr>';
    arr.forEach(x => { t += '<tr><td><b>' + e(x.k) + '</b></td><td>' + barra(x.q, mx, col) + '</td><td class="n"><b>' + nf(x.q) + '</b></td><td class="n">' + x.n + '</td>' + (conPct ? '<td class="n"' + (x.p !== null && x.p < 70 ? ' style="color:#c62828"' : '') + '>' + (x.p === null ? '—' : Math.round(x.p) + ' %') + '</td>' : '') + '</tr>'; });
    return t + '</table>';
  };
  h += bloque('Volumen por destino', trTop_(R.dest), '#0277bd', true) + bloque('Volumen por UF de origen', trTop_(R.uf), '#2e7d32', true) + bloque('Volumen por material', trTop_(R.mat, 12), '#ef6c00', false);
  h += bloque('Ranking de volquetas (top 12)', trTop_(R.vol, 12), '#6a1b9a', true) + bloque('Por empresa', trTop_(R.emp, 12), '#00838f', true);
  const baja = trTop_(R.vol).filter(x => x.p !== null && x.p < 70 && x.n >= 2);
  if (baja.length) h += '<h2>Carga baja (promedio menor a 70 %)</h2><table><tr><th>Placa</th><th>Viajes</th><th>Carga prom.</th></tr>' + baja.map(x => '<tr><td><b>' + e(x.k) + '</b></td><td class="n">' + x.n + '</td><td class="n" style="color:#c62828">' + Math.round(x.p) + ' %</td></tr>').join('') + '</table>';
  if (R.alertas.length) h += '<h2>Alertas del periodo</h2><table><tr><th>Fecha</th><th>Placa</th><th>Vale</th><th>Alerta</th></tr>' + R.alertas.slice(0, 25).map(v => '<tr><td>' + dd(v.fecha) + '</td><td>' + e(v.placa) + '</td><td>' + e(v.cod) + '</td><td>' + e(v.alertas) + '</td></tr>').join('') + '</table>';
  h += '<h2>Detalle de viajes</h2><table><tr><th>Fecha</th><th>Hora</th><th>Valera</th><th>Placa</th><th>Conductor</th><th>Material</th><th>UF</th><th>Origen &rarr; Destino</th><th>Carga</th><th>m3</th></tr>';
  V.slice(0, 400).forEach((v, i) => { const p = trPctViaje_(v); h += '<tr' + (i % 2 ? ' bgcolor="#f1f8f1"' : '') + '><td>' + dd(v.fecha) + '</td><td>' + e(v.hora_salida) + '</td><td>' + e(v.n_valera) + '</td><td>' + e(v.placa) + '</td><td>' + e(v.conductor) + '</td><td>' + e(v.material) + '</td><td>' + e(v.uf) + '</td><td>' + e(v.origen) + ' &rarr; ' + e(v.destino) + '</td><td class="n">' + (p === null ? '' : Math.round(p) + ' %') + '</td><td class="n">' + nf(Number(v.cant) || 0) + '</td></tr>'; });
  h += '</table>' + (V.length > 400 ? '<p>Se muestran 400 de ' + V.length + ' viajes.</p>' : '');
  return h + '</body></html>';
}
// Cierre gerencial (un dia o un rango) en PDF. Se guarda en PLANILLAS, se anota en Planillas y en la Biblioteca.
function adminTrCierre_(llave, desde, hasta, usuario) {
  const u = adminUsuario_(llave);
  if (!u) return { ok: false, mensaje: 'Acceso solo para administradores' };
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(desde || '') || !re.test(hasta || '') || desde > hasta) return { ok: false, mensaje: 'Fechas no válidas' };
  if ((new Date(hasta) - new Date(desde)) / 86400000 > 31) return { ok: false, mensaje: 'Máximo un mes (31 días) por consulta' };
  const us = String(usuario || '').toUpperCase().trim();
  const v = colaHoja_(trHoja_('Viajes'), 1, desde).v, V = [];
  for (let i = 1; i < v.length; i++) { const f = txt_(v[i][1]); if (f < desde || f > hasta) continue; if (us && String(v[i][3]).toUpperCase() !== us) continue; V.push(Object.assign(trViaje_(v[i]), { llave: String(v[i][3]) })); }
  if (!V.length) return { ok: false, mensaje: 'No hay viajes en ese periodo' };
  V.sort((a, b) => (a.fecha + (a.hora_salida || '')).localeCompare(b.fecha + (b.hora_salida || '')));
  const R = trResumen_(V, trUFs_(), trSitios_());
  const ts = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
  const nombre = 'Cierre_transportes_' + desde + (hasta !== desde ? '_a_' + hasta : '') + (us ? '_' + us.replace(/[^\w-]/g, '') : '') + '_' + Utilities.formatDate(new Date(), TZ, 'HHmm') + '.pdf';
  const pdf = Utilities.newBlob(htmlCierreTr_(desde, hasta, V, R, u.nombre + ' ' + ts), 'text/html', 'cierre.html').getAs('application/pdf').setName(nombre);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const url = trCarpeta_('PLANILLAS').createFile(pdf).getUrl();
    trHoja_('Planillas').appendRow([desde, u.llave, 'Cierre dashboard' + (us ? ' (' + us + ')' : '') + ' ' + desde + (hasta !== desde ? ' a ' + hasta : ''), nombre, url, ts]);
    try {
      const sh = SpreadsheetApp.openById(ID_LIBRO_USUARIOS).getSheetByName('Biblioteca_Informes');
      if (sh) {
        const enc = encabezados_(sh), cod = 'CT-' + desde.replace(/-/g, '') + '-' + hasta.replace(/-/g, '') + (us ? '-' + us : '');
        const dato = { ID_DOCUMENTO: cod, FECHA_HORA: ts, NOMBRE_DOCUMENTO: 'Cierre de transportes ' + desde + (hasta !== desde ? ' a ' + hasta : '') + (us ? ' - ' + us : ''), FORMATO: 'PDF', AUTOR: u.nombre, ARCHIVO: url, CRITERIOS_FILTRO: us || 'TODAS', EQUIPO_DE: '' };
        const fila = enc.map(h => dato[h] === undefined ? '' : dato[h]), iId = enc.indexOf('ID_DOCUMENTO'), w = sh.getDataRange().getValues();
        let fi = -1; for (let i = w.length - 1; i >= 1; i--) if (String(w[i][iId]) === cod) { fi = i + 1; break; }
        if (fi < 0) { fi = sh.getLastRow() + 1; sh.getRange(fi, 1, 1, 1).setNumberFormat('@'); }
        sh.getRange(fi, 1, 1, fila.length).setValues([fila]);
      }
    } catch (e) { console.error(e); }
    return { ok: true, url: url, nombre: nombre, pdf: Utilities.base64Encode(pdf.getBytes()), viajes: V.length };
  } finally {
    lock.releaseLock();
  }
}

function trParecida_(a, b) {
  if (!a || a.length !== b.length || a === b) return false;
  let dif = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) dif.push(i);
  if (dif.length === 1) return true;
  return dif.length === 2 && dif[1] === dif[0] + 1 && a[dif[0]] === b[dif[1]] && a[dif[1]] === b[dif[0]];
}

/***** INFORME SEMANAL (lunes a sabado) - SOLO PARA APPSHEET *****/
// Crea dos hojas nuevas en el libro principal de AppSheet (ID_LIBRO_USUARIOS):
//   Informe_Semanal   -> una fila por actividad / maquina / persona / material / fotos de la semana
//   Informes_Semanales-> una fila por semana con el enlace al PDF
// Solo LEE los registros del parte diario; no modifica ningun dato existente.
const HOJA_SEM = 'Informe_Semanal';
const COLS_SEM = ['ID', 'SEMANA', 'DESDE', 'HASTA', 'TIPO', 'ITEM', 'DETALLE', 'UNIDAD', 'TOTAL', 'DIAS', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'PARTES', 'USUARIOS', 'GENERADO'];
const HOJA_SEM_PDF = 'Informes_Semanales';
const COLS_SEM_PDF = ['SEMANA', 'DESDE', 'HASTA', 'PDF', 'PARTES', 'FOTOS', 'GENERADO'];
function fechaMas_(s, d) { const p = String(s).split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]) + d * 86400000).toISOString().slice(0, 10); }
function semanaDe_(fecha) {
  const p = String(fecha).split('-'), dow = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay();
  const lunes = fechaMas_(fecha, -(dow === 0 ? 6 : dow - 1));
  return { desde: lunes, hasta: fechaMas_(lunes, 5) };
}
function hojaSem_(ss, nombre, cols) {
  let sh = ss.getSheetByName(nombre);
  if (!sh) { sh = ss.insertSheet(nombre); sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold'); sh.setFrozenRows(1); }
  return sh;
}
function consolidarSemana_(sem) {
  const filas = leerRegistros_(sem.desde).filter(r => { const f = txt_(r.FECHA); return f >= sem.desde && f <= sem.hasta && r.SECCION !== 'SOLICITUD'; });
  const norm = s => String(s || '').trim().replace(/\s+/g, ' ');
  const actDe = {};
  filas.forEach(r => { if (r.SECCION === 'ACTIVIDAD') (actDe[String(r.ID_PARTE)] = actDe[String(r.ID_PARTE)] || {})[String(r.ACTIVIDAD_ASIGNADA)] = norm(r.DESCRIPCION); });
  const grupos = { ACTIVIDAD: {}, MAQUINA: {}, PERSONAL: {}, MATERIAL: {} };
  const fotoAct = {}; // una foto (la mas reciente) por actividad
  const partes = {};
  let fotos = 0;
  const acum = (tipo, item, detalle, unidad, f, valor, id, llave) => {
    const k = (item + '|' + unidad + '|' + detalle).toLowerCase();
    const g = grupos[tipo][k] = grupos[tipo][k] || { tipo: tipo, item: item, detalle: detalle, unidad: unidad, total: 0, fechas: {}, por: [0, 0, 0, 0, 0, 0], partes: {}, usuarios: {} };
    const d = Math.round((new Date(f) - new Date(sem.desde)) / 86400000);
    g.total += valor; if (d >= 0 && d < 6) g.por[d] += valor; g.fechas[f] = 1; g.partes[id] = 1; g.usuarios[llave] = 1;
  };
  filas.forEach(r => {
    const id = String(r.ID_PARTE), f = txt_(r.FECHA), llave = String(r.LLAVE), est = String(r.ESTADO || '').toUpperCase();
    if (r.SECCION === 'ENCABEZADO') { partes[id] = 1; return; }
    if (r.SECCION === 'ACTIVIDAD') acum('ACTIVIDAD', norm(r.DESCRIPCION), '', String(r.UNIDAD || ''), f, Number(r.CANTIDAD) || 0, id, llave);
    else if (r.SECCION === 'MAQUINA' && est !== 'NO ESTUVO') acum('MAQUINA', norm(r.DESCRIPCION), norm(r.C_COSTO), 'horas', f, Number(r.TOTAL_HORAS) || 0, id, llave);
    else if (r.SECCION === 'PERSONAL' && est !== 'AUSENTE') acum('PERSONAL', norm(r.DESCRIPCION), norm(r.CATEGORIA), 'horas', f, Number(r.TOTAL_HORAS) || 0, id, llave);
    else if (r.SECCION === 'MATERIAL' && est !== 'NO USADO') acum('MATERIAL', norm(r.DESCRIPCION), norm(r.C_COSTO), String(r.UNIDAD || ''), f, Number(r.CANTIDAD) || 0, id, llave);
    else if (r.SECCION === 'FOTO') {
      fotos++;
      const nums = String(r.ACTIVIDAD_ASIGNADA || '').split(',').map(x => x.trim()).filter(x => x);
      const nombres = nums.map(n => (actDe[id] || {})[n]).filter(x => x);
      if (String(r.CATEGORIA) !== 'ALBARAN' && r.FOTO_URL) nombres.forEach(nm => { const o = fotoAct[nm]; if (!o || f >= o.f) fotoAct[nm] = { act: nm, url: String(r.FOTO_URL), f: f, cap: String(r.DESCRIPCION || '') }; });
    }
  });
  const r2 = x => Math.round(x * 100) / 100;
  const lista = [];
  ['ACTIVIDAD', 'MAQUINA', 'PERSONAL', 'MATERIAL'].forEach(t => {
    Object.keys(grupos[t]).map(k => grupos[t][k]).sort((a, b) => a.item.localeCompare(b.item)).forEach((g, i) => {
      lista.push({ tipo: t, item: g.item, detalle: g.detalle, unidad: g.unidad, total: r2(g.total), dias: Object.keys(g.fechas).length, por: g.por.map(r2), partes: Object.keys(g.partes).length, usuarios: Object.keys(g.usuarios).sort().join(', ') });
    });
  });
  return { lista: lista, partes: Object.keys(partes).length, fotos: fotos, fotoAct: fotoAct };
}
function htmlSemana_(sem, c) {
  const e = s => String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const dd = s => s.slice(8) + '/' + s.slice(5, 7) + '/' + s.slice(0, 4);
  const nf = x => (Math.round(x * 10) / 10).toString().replace('.', ',');
  const L = t => c.lista.filter(x => x.tipo === t);
  const act = L('ACTIVIDAD'), maq = L('MAQUINA'), per = L('PERSONAL'), mat = L('MATERIAL');
  const suma = a => a.reduce((s, x) => s + x.total, 0);
  const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const porDia = a => dias.map((_, i) => a.reduce((s, x) => s + (x.por[i] || 0), 0));
  const barra = (v, max, color) => '<div style="width:' + (max > 0 ? Math.max(2, Math.round(v / max * 100)) : 1) + '%;border-top:9px solid ' + color + ';font-size:1px;line-height:1px;height:0">&nbsp;</div>';
  const kpi = (n, t, col) => '<td style="width:16%;border:1px solid #cfd8dc;background:#fff;text-align:center;padding:8px 2px;border-top:4px solid ' + col + '"><div style="font-size:22px;font-weight:bold;color:' + col + '">' + n + '</div><div style="font-size:9px;color:#546e7a">' + t + '</div></td>';
  let h = '<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:10px;color:#263238;margin:0}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cfd8dc;padding:4px 5px;font-size:10px}th{background:#eceff1;color:#37474f;font-size:9px;text-align:left}td.n{text-align:right}h2{font-size:12px;color:#1b5e20;border-bottom:2px solid #2e7d32;padding-bottom:3px;margin:16px 0 6px}.z{background:#f7faf7}</style></head><body>';
  h += '<table style="border:none"><tr><td style="border:none;border-top:10px solid #1b5e20;border-bottom:2px solid #1b5e20;padding:10px 4px"><div style="font-size:20px;font-weight:bold;color:#1b5e20">INFORME SEMANAL DE OBRA</div><div style="font-size:11px;color:#455a64">Semana del ' + dd(sem.desde) + ' al ' + dd(sem.hasta) + '</div></td></tr></table>';
  h += '<table style="border:none;margin-top:10px;border-spacing:4px"><tr>' +
    kpi(c.partes, 'PARTES DIARIOS', '#1b5e20') + kpi(act.length, 'ACTIVIDADES', '#0277bd') + kpi(nf(suma(maq)), 'HORAS MAQUINARIA', '#ef6c00') +
    kpi(nf(suma(per)), 'HORAS PERSONAL', '#6a1b9a') + kpi(mat.length, 'MATERIALES', '#00838f') + kpi(c.fotos, 'FOTOS', '#c62828') + '</tr></table>';
  // horas por dia (maquinaria vs personal)
  const dm = porDia(maq), dp = porDia(per), mx = Math.max.apply(null, dm.concat(dp, [1]));
  h += '<h2>Horas por d&iacute;a</h2><table><tr><th bgcolor="#eceff1" style="width:40px">D&iacute;a</th><th bgcolor="#eceff1">Maquinaria</th><th bgcolor="#eceff1">Personal</th></tr>';
  dias.forEach((d, i) => { h += '<tr><td>' + d + '</td><td>' + barra(dm[i], mx, '#ef6c00') + '<small>' + nf(dm[i]) + ' h</small></td><td>' + barra(dp[i], mx, '#6a1b9a') + '<small>' + nf(dp[i]) + ' h</small></td></tr>'; });
  h += '</table>';
  // actividades
  if (act.length) {
    h += '<h2>Actividades ejecutadas</h2><table><tr><th bgcolor="#eceff1">Actividad</th><th bgcolor="#eceff1">Und.</th><th bgcolor="#eceff1" style="text-align:right">Total</th><th bgcolor="#eceff1" style="width:70px">D&iacute;as (de 6)</th>' + dias.map(d => '<th bgcolor="#eceff1" style="text-align:right">' + d + '</th>').join('') + '</tr>';
    act.forEach((x, i) => { h += '<tr' + (i % 2 ? ' bgcolor="#f1f8f1"' : '') + '><td><b>' + e(x.item) + '</b></td><td>' + e(x.unidad) + '</td><td class="n"><b>' + nf(x.total) + '</b></td><td>' + barra(x.dias, 6, '#0277bd') + '</td>' + x.por.map(v => '<td class="n">' + (v ? nf(v) : '') + '</td>').join('') + '</tr>'; });
    h += '</table>';
  }
  // maquinaria y personal con barras de horas
  const hrs = (titulo, a, colTit, col) => {
    if (!a.length) return '';
    const m = Math.max.apply(null, a.map(x => x.total).concat([1]));
    let t = '<h2>' + titulo + '</h2><table><tr><th bgcolor="#eceff1">' + (titulo === 'Maquinaria' ? 'Equipo' : 'Nombre') + '</th><th bgcolor="#eceff1">' + colTit + '</th><th bgcolor="#eceff1" style="width:34%">Horas</th><th bgcolor="#eceff1" style="text-align:right">Total h</th><th bgcolor="#eceff1" style="text-align:right">D&iacute;as</th></tr>';
    a.slice().sort((p, q) => q.total - p.total).forEach((x, i) => { t += '<tr' + (i % 2 ? ' bgcolor="#f1f8f1"' : '') + '><td><b>' + e(x.item) + '</b></td><td>' + e(x.detalle) + '</td><td>' + barra(x.total, m, col) + '</td><td class="n"><b>' + nf(x.total) + '</b></td><td class="n">' + x.dias + '</td></tr>'; });
    return t + '</table>';
  };
  h += hrs('Maquinaria', maq, 'C. costo', '#ef6c00') + hrs('Personal', per, 'Cargo', '#6a1b9a');
  if (mat.length) {
    h += '<h2>Materiales</h2><table><tr><th bgcolor="#eceff1">Material</th><th bgcolor="#eceff1">C. costo</th><th bgcolor="#eceff1">Und.</th><th bgcolor="#eceff1" style="text-align:right">Total</th><th bgcolor="#eceff1" style="text-align:right">D&iacute;as</th></tr>';
    mat.forEach((x, i) => { h += '<tr' + (i % 2 ? ' bgcolor="#f1f8f1"' : '') + '><td><b>' + e(x.item) + '</b></td><td>' + e(x.detalle) + '</td><td>' + e(x.unidad) + '</td><td class="n"><b>' + nf(x.total) + '</b></td><td class="n">' + x.dias + '</td></tr>'; });
    h += '</table>';
  }
  // fotos: minimo una por actividad (la mas reciente de la semana), de 2 en 2
  const conFoto = act.filter(x => c.fotoAct && c.fotoAct[x.item]);
  if (conFoto.length) {
    h += '<h2>Registro fotogr&aacute;fico por actividad</h2><table style="border:none">';
    for (let i = 0; i < conFoto.length; i += 2) {
      h += '<tr>';
      [conFoto[i], conFoto[i + 1]].forEach(x => {
        if (!x) { h += '<td style="border:none"></td>'; return; }
        const o = c.fotoAct[x.item];
        let img = '';
        try {
          const id = idDrive_(o.url);
          if (id) { const b = DriveApp.getFileById(id).getBlob(); if (b.getBytes().length < 3000000) img = '<img src="data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()) + '" style="width:100%;max-height:230px">'; }
        } catch (er) {}
        h += '<td style="border:1px solid #cfd8dc;width:50%;vertical-align:top;padding:5px">' + (img || '<div style="color:#999">(foto no disponible)</div>') + '<div style="margin-top:3px;padding:3px"><b>' + e(x.item) + '</b><br>' + dd(o.f) + (o.cap ? ' &middot; ' + e(o.cap) : '') + '</div></td>';
      });
      h += '</tr>';
    }
    h += '</table>';
  }
  return h + '</body></html>';
}
function informeSemanal(ref) {
  const f = /^\d{4}-\d{2}-\d{2}$/.test(String(ref || '')) ? String(ref) : hoy_();
  const sem = semanaDe_(f);
  const lock = LockService.getScriptLock();
  lock.waitLock(60000);
  try {
    const c = consolidarSemana_(sem);
    const ts = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss');
    const ss = SpreadsheetApp.openById(ID_LIBRO_USUARIOS);
    // 1) tabla consolidada: se reemplazan solo las filas de ESTA semana
    const sh = hojaSem_(ss, HOJA_SEM, COLS_SEM);
    const v = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, COLS_SEM.length).getValues() : [];
    const resto = v.filter(r => txt_(r[1]) !== sem.desde && String(r[0]) !== '');
    const nuevas = c.lista.map((x, i) => [sem.desde + '-' + x.tipo + '-' + ('000' + (i + 1)).slice(-3), sem.desde, sem.desde, sem.hasta, x.tipo, x.item, x.detalle, x.unidad, x.total, x.dias].concat(x.por, [x.partes, x.usuarios, ts]));
    const todas = resto.concat(nuevas);
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, COLS_SEM.length).clearContent();
    if (todas.length) { sh.getRange(2, 2, todas.length, 3).setNumberFormat('@'); sh.getRange(2, 1, todas.length, COLS_SEM.length).setValues(todas); }
    // 2) PDF de la semana (se reemplaza si ya existia)
    const nombre = 'Informe_semanal_' + sem.desde + '_a_' + sem.hasta + '.pdf';
    const carpeta = buscarOCrear_(carpetaInformes_(), 'SEMANALES');
    const viejos = carpeta.getFilesByName ? carpeta.getFilesByName(nombre) : null;
    while (viejos && viejos.hasNext()) { try { viejos.next().setTrashed(true); } catch (e) {} }
    const pdf = Utilities.newBlob(htmlSemana_(sem, c), 'text/html', 'informe.html').getAs('application/pdf').setName(nombre);
    const arch = carpeta.createFile(pdf);
    try { arch.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
    const sp = hojaSem_(ss, HOJA_SEM_PDF, COLS_SEM_PDF);
    const w = sp.getLastRow() > 1 ? sp.getRange(2, 1, sp.getLastRow() - 1, COLS_SEM_PDF.length).getValues() : [];
    let fi = -1; w.forEach((r, i) => { if (txt_(r[0]) === sem.desde) fi = i + 2; });
    if (fi < 0) { fi = sp.getLastRow() + 1; sp.getRange(fi, 1, 1, 3).setNumberFormat('@'); }
    sp.getRange(fi, 1, 1, COLS_SEM_PDF.length).setValues([[sem.desde, sem.desde, sem.hasta, arch.getUrl(), c.partes, c.fotos, ts]]);
    try { biblioSemanal_(sem, arch.getUrl(), ts); } catch (e) { console.error(e); }
    return { ok: true, semana: sem, filas: nuevas.length, partes: c.partes, fotos: c.fotos, pdf: arch.getUrl() };
  } finally {
    lock.releaseLock();
  }
}
// publica el PDF semanal en la Biblioteca de AppSheet (una fila por semana; si se regenera, se actualiza)
function biblioSemanal_(sem, url, ts) {
  const sh = SpreadsheetApp.openById(ID_LIBRO_USUARIOS).getSheetByName('Biblioteca_Informes');
  if (!sh) return;
  const enc = encabezados_(sh);
  const dm = f => f.slice(8, 10) + '/' + f.slice(5, 7) + '/' + f.slice(0, 4);
  const cod = 'IS-' + sem.desde.replace(/-/g, '');
  const dato = { ID_DOCUMENTO: cod, FECHA_HORA: ts, NOMBRE_DOCUMENTO: 'Informe semanal ' + dm(sem.desde) + ' al ' + dm(sem.hasta), FORMATO: 'PDF', AUTOR: 'Sistema', ARCHIVO: url, CRITERIOS_FILTRO: '', EQUIPO_DE: '' };
  const fila = enc.map(h => dato[h] === undefined ? '' : dato[h]);
  const iId = enc.indexOf('ID_DOCUMENTO'), v = sh.getDataRange().getValues();
  let fi = -1;
  for (let i = v.length - 1; i >= 1; i--) if (String(v[i][iId]) === cod) { if (fi < 0) fi = i + 1; else sh.deleteRow(i + 1); }
  if (fi < 0) { fi = sh.getLastRow() + 1; sh.getRange(fi, 1, 1, 1).setNumberFormat('@'); }
  sh.getRange(fi, 1, 1, fila.length).setValues([fila]);
}
// repaso del lunes: vuelve a generar la semana anterior por si algun parte llego tarde (sin conexion)
function informeSemanalAnterior() { informeSemanal(fechaMas_(hoy_(), -2)); }
// EJECUTAR UNA SOLA VEZ a mano desde el editor: programa el informe cada sabado 8 p. m. y el repaso del lunes 6 a. m.
function informeSemanalInstalar() {
  ScriptApp.getProjectTriggers().forEach(t => { const h = t.getHandlerFunction(); if (h === 'informeSemanal' || h === 'informeSemanalAnterior') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('informeSemanal').timeBased().onWeekDay(ScriptApp.WeekDay.SATURDAY).atHour(20).create();
  ScriptApp.newTrigger('informeSemanalAnterior').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(6).create();
}
