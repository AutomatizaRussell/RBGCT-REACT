import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Utilidades ────────────────────────────────────────────────────────────────

function fechaSufijo() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}
function tc(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return String(v);
}
function formatCOP(n) {
  if (!n && n !== 0) return '';
  return `$${Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}
function fmtD(s) { return s ? String(s).substring(0, 10) : ''; }

// ── Paletas ───────────────────────────────────────────────────────────────────

const ESTADO_INFO = [
  { key: 'activo',     label: 'Activo',     rgb: [16, 185, 129] },
  { key: 'prospecto',  label: 'Prospecto',  rgb: [59, 130, 246] },
  { key: 'inactivo',   label: 'Inactivo',   rgb: [148, 163, 184] },
  { key: 'suspendido', label: 'Suspendido', rgb: [245, 158, 11] },
  { key: 'retirado',   label: 'Retirado',   rgb: [239, 68, 68] },
];
const RIESGO_INFO = [
  { key: 'bajo',    label: 'Bajo',    rgb: [16, 185, 129] },
  { key: 'medio',   label: 'Medio',   rgb: [245, 158, 11] },
  { key: 'alto',    label: 'Alto',    rgb: [249, 115, 22] },
  { key: 'critico', label: 'Crítico', rgb: [239, 68, 68] },
];
const TIPO_INFO = [
  { key: 'microempresa',      label: 'Microempresa', rgb: [99, 102, 241] },
  { key: 'pyme',              label: 'PYME',         rgb: [59, 130, 246] },
  { key: 'grande',            label: 'Grande',       rgb: [6, 182, 212] },
  { key: 'grupo_empresarial', label: 'Grupo Emp.',   rgb: [139, 92, 246] },
];
const AREA_PAL = [
  [59,130,246],[139,92,246],[16,185,129],[245,158,11],
  [239,68,68],[6,182,212],[236,72,153],[99,102,241],
];

// ── Helpers PDF ───────────────────────────────────────────────────────────────

function drawHeader(doc, title, sub, pageW) {
  doc.setFillColor(0, 30, 51);
  doc.rect(0, 0, pageW, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, 12, 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(sub, 12, 13);
}

function drawFooter(doc, num, total, pageW, pageH) {
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Página ${num} de ${total}`, pageW - 12, pageH - 5, { align: 'right' });
}

function drawSec(doc, x, y, label) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  const upperLabel = label.toUpperCase();
  doc.text(upperLabel, x, y);
  const tw = doc.getTextWidth(upperLabel);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(x + tw + 3, y - 0.5, x + 277 - x, y - 0.5);
  doc.setTextColor(30, 41, 59);
}

function drawKpi(doc, x, y, w, h, label, value, sub, rgb) {
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  doc.setDrawColor(...rgb);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, h, 2, 2, 'S');
  // top accent
  doc.setFillColor(...rgb);
  doc.rect(x, y, w, 2.5, 'F');
  // value
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...rgb);
  doc.text(String(value), x + w / 2, y + 15, { align: 'center' });
  // label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(label, x + w / 2, y + 21, { align: 'center', maxWidth: w - 4 });
  // sub
  if (sub) {
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text(sub, x + w / 2, y + 26, { align: 'center', maxWidth: w - 4 });
  }
}

// Dibuja barras horizontales. Retorna la Y final ocupada.
function drawBars(doc, x, y, w, items) {
  if (!items?.length) return y + 10;
  const maxVal = Math.max(...items.map(i => i.value ?? i.total ?? 0), 1);
  const LABEL_W = 40;
  const VAL_W   = 18;
  const BAR_W   = w - LABEL_W - VAL_W - 4;
  const ROW_H   = Math.min(12, Math.max(8, 80 / items.length));

  items.forEach((item, idx) => {
    const ry  = y + idx * ROW_H;
    const val = item.value ?? item.total ?? 0;

    // label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(String(item.label).substring(0, 20), x + 1, ry + ROW_H / 2 + 2.3);

    // bg bar
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x + LABEL_W, ry + 1.5, BAR_W, ROW_H - 3, 1, 1, 'F');

    // fill bar
    const bw = Math.max(val > 0 ? 2 : 0, (val / maxVal) * BAR_W);
    const rgb = item.rgb || AREA_PAL[idx % AREA_PAL.length];
    doc.setFillColor(...rgb);
    doc.roundedRect(x + LABEL_W, ry + 1.5, bw, ROW_H - 3, 1, 1, 'F');

    // value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    doc.text(String(item.displayVal || val), x + LABEL_W + BAR_W + 2, ry + ROW_H / 2 + 2.3);
  });

  return y + items.length * ROW_H + 2;
}

// Caja con título y barras adentro
function drawChartBox(doc, x, y, w, h, title, items) {
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(title, x + 4, y + 6);

  if (!items?.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Sin datos', x + w / 2, y + h / 2 + 2, { align: 'center' });
    return;
  }

  const innerX = x + 4;
  const innerY = y + 10;
  const innerW = w - 8;
  const LABEL_W = 34;
  const VAL_W   = 12;
  const BAR_W   = innerW - LABEL_W - VAL_W;
  const ROW_H   = Math.min(11, Math.max(7, (h - 14) / items.length));
  const maxVal  = Math.max(...items.map(i => i.value), 1);

  items.forEach((item, idx) => {
    const ry  = innerY + idx * ROW_H;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(String(item.label).substring(0, 16), innerX, ry + ROW_H / 2 + 2.2);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(innerX + LABEL_W, ry + 1.5, BAR_W, ROW_H - 3, 1, 1, 'F');

    const bw = Math.max(item.value > 0 ? 1.5 : 0, (item.value / maxVal) * BAR_W);
    doc.setFillColor(...(item.rgb || [59, 130, 246]));
    doc.roundedRect(innerX + LABEL_W, ry + 1.5, bw, ROW_H - 3, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(51, 65, 85);
    doc.text(String(item.value), innerX + LABEL_W + BAR_W + 2, ry + ROW_H / 2 + 2.2);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXCEL EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export function exportClientesListaExcel(empresas, fname = 'clientes_lista') {
  if (!empresas?.length) return false;
  const rows = empresas.map(em => ({
    'Razón Social':      tc(em.razon_social),
    'NIT':               tc(em.nit),
    'Tipo':              tc(em.tipo_empresa_display || em.tipo_empresa),
    'Estado':            tc(em.estado_display || em.estado),
    'Nivel Riesgo':      tc(em.nivel_riesgo_display || em.nivel_riesgo),
    'Ciudad':            tc(em.ciudad),
    'Departamento':      tc(em.departamento),
    'Email':             tc(em.email_principal),
    'Teléfono':          tc(em.telefono),
    'Fecha Inicio':      fmtD(em.fecha_inicio_relacion),
    'Contacto Principal':em.contacto_principal ? `${em.contacto_principal.nombre} (${em.contacto_principal.cargo})` : '',
    'Áreas activas':     em.areas_count != null ? String(em.areas_count) : '',
    'Creado':            fmtD(em.created_at),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [32,18,18,14,14,16,16,28,14,14,30,12,14].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  XLSX.writeFile(wb, `${fname}_${fechaSufijo()}.xlsx`);
  return true;
}

export function exportClienteExcel(empresa, fname) {
  if (!empresa) return false;
  const base = fname || `cliente_${empresa.nit || empresa.id}`;
  const wb = XLSX.utils.book_new();

  // Hoja 1: Info general
  const info = [
    ['Campo', 'Valor'],
    ['Razón Social',       tc(empresa.razon_social)],
    ['NIT',                `${tc(empresa.nit)}${empresa.digito_verificacion ? '-'+empresa.digito_verificacion : ''}`],
    ['Tipo empresa',       tc(empresa.tipo_empresa_display)],
    ['Tamaño empresa',     tc(empresa.tamano_empresa)],
    ['Estado',             tc(empresa.estado_display)],
    ['Nivel riesgo',       tc(empresa.nivel_riesgo_display)],
    ['Régimen tributario', tc(empresa.regimen_tributario_display)],
    ['Actividad económica',tc(empresa.actividad_economica)],
    ['Descripción actividad', tc(empresa.descripcion_actividad)],
    ['Ciudad',             tc(empresa.ciudad)],
    ['Departamento',       tc(empresa.departamento)],
    ['Dirección',          tc(empresa.direccion)],
    ['Teléfono',           tc(empresa.telefono)],
    ['Email principal',    tc(empresa.email_principal)],
    ['Website',            tc(empresa.website)],
    ['Cámara de comercio', tc(empresa.camara_comercio_numero)],
    ['Empresa matriz',     tc(empresa.empresa_matriz_nombre)],
    ['Fecha inicio relación', fmtD(empresa.fecha_inicio_relacion)],
    ['Observaciones',      tc(empresa.observaciones)],
    ['Creado',             fmtD(empresa.created_at)],
    ['Actualizado',        fmtD(empresa.updated_at)],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(info);
  wsInfo['!cols'] = [{ wch: 24 }, { wch: 42 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Info General');

  // Hoja 2: Contactos
  const contactos = (empresa.contactos || []).map(c => ({
    'Nombre':    tc(c.nombre),
    'Cargo':     tc(c.cargo_display || c.cargo),
    'Email':     tc(c.email),
    'Teléfono':  tc(c.telefono),
    'Principal': c.es_principal ? 'Sí' : 'No',
    'Activo':    c.activo ? 'Sí' : 'No',
    'Notas':     tc(c.notas),
  }));
  if (contactos.length) {
    const wsC = XLSX.utils.json_to_sheet(contactos);
    wsC['!cols'] = [24,20,28,14,10,8,30].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsC, 'Contactos');
  }

  // Hoja 3: Servicios
  const servicios = (empresa.servicios || []).map(s => ({
    'Área':           tc(s.area_nombre),
    'Descripción':    tc(s.descripcion),
    'Estado':         tc(s.estado_display || s.estado),
    'Periodicidad':   tc(s.periodicidad_display || s.periodicidad),
    'Valor Mensual':  s.valor_mensual != null ? String(s.valor_mensual) : '',
    'Fecha Inicio':   fmtD(s.fecha_inicio),
    'Fecha Fin':      fmtD(s.fecha_fin),
    'Notas':          tc(s.notas),
  }));
  if (servicios.length) {
    const wsS = XLSX.utils.json_to_sheet(servicios);
    wsS['!cols'] = [18,32,12,14,16,12,12,30].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsS, 'Servicios');
  }

  // Hoja 4: Equipo
  const equipo = (empresa.equipo || []).map(a => ({
    'Empleado':   tc(a.empleado_nombre),
    'Cargo':      tc(a.empleado_cargo),
    'Área':       tc(a.area_nombre),
    'Rol':        tc(a.rol_display || a.rol),
    'Activo':     a.activo ? 'Sí' : 'No',
    'Fecha Inicio': fmtD(a.fecha_inicio),
    'Fecha Fin':    fmtD(a.fecha_fin),
    'Notas':      tc(a.notas),
  }));
  if (equipo.length) {
    const wsE = XLSX.utils.json_to_sheet(equipo);
    wsE['!cols'] = [24,20,18,22,8,12,12,30].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, wsE, 'Equipo');
  }

  XLSX.writeFile(wb, `${base}_${fechaSufijo()}.xlsx`);
  return true;
}

export function exportDashboardExcel(stats, contextLabel = '', fname = 'clientes_dashboard') {
  if (!stats) return false;
  const wb = XLSX.utils.book_new();
  const now = new Date().toLocaleString('es-CO');

  // Hoja 1: Resumen
  const riesgoAlto = (stats.por_riesgo?.alto || 0) + (stats.por_riesgo?.critico || 0);
  const resumen = [
    ['Reporte', contextLabel || 'Vista Global'],
    ['Generado', now],
    [],
    ['Métrica', 'Valor'],
    ['Total clientes en alcance',    stats.total || 0],
    ['Facturación mensual estimada', stats.ingresos_total || 0],
    ['Clientes riesgo alto/crítico', riesgoAlto],
    ['Colaboradores con clientes',   (stats.top_equipo || []).length],
    ['Clientes sin área asignada',   stats.sin_area_count || 0],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen');

  // Hoja 2: Por Estado
  const porEstado = ESTADO_INFO.map(e => ({ Estado: e.label, Total: stats.por_estado?.[e.key] || 0 }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porEstado), 'Por Estado');

  // Hoja 3: Por Riesgo
  const porRiesgo = RIESGO_INFO.map(r => ({ Riesgo: r.label, Total: stats.por_riesgo?.[r.key] || 0 }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porRiesgo), 'Por Riesgo');

  // Hoja 4: Por Tipo
  const porTipo = TIPO_INFO.map(t => ({ Tipo: t.label, Total: stats.por_tipo?.[t.key] || 0 }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porTipo), 'Por Tipo');

  // Hoja 5: Por Área
  const porArea = (stats.por_area || []).map(a => ({
    'Área':               a.area__nombre_area || '(Sin nombre)',
    'Clientes':           a.total || 0,
    'Facturación mensual':stats.facturacion_area?.find(f => f.area__nombre_area === a.area__nombre_area)?.total || 0,
  }));
  if (porArea.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porArea), 'Por Área');

  // Hoja 6: Equipo
  const equipo = (stats.top_equipo || []).map(e => ({
    'Empleado': tc(e.nombre), 'Cargo': tc(e.cargo), 'Clientes asignados': e.clientes || 0,
  }));
  if (equipo.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(equipo), 'Equipo');

  // Hoja 7: Actividad Reciente
  const actividad = (stats.actividad_reciente || []).map(a => ({
    'Fecha':    fmtD(a.fecha), 'Tipo': tc(a.tipo), 'Descripción': tc(a.descripcion),
    'Cliente':  tc(a.empresa_nombre), 'Empleado': tc(a.empleado_nombre),
  }));
  if (actividad.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(actividad), 'Actividad');

  // Hoja 8: Nuevos por Mes
  const porMes = (stats.por_mes || []).map(m => ({ Mes: m.mes, Total: m.total }));
  if (porMes.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porMes), 'Nuevos por Mes');

  XLSX.writeFile(wb, `${fname}_${fechaSufijo()}.xlsx`);
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export function exportClientesListaPDF(empresas, fname = 'clientes_lista') {
  if (!empresas?.length) return false;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const now = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

  drawHeader(doc, 'Directorio de Clientes', `${now}  ·  ${empresas.length} cliente(s)`, pageW);

  autoTable(doc, {
    startY: 21,
    margin: { left: 10, right: 10 },
    columns: [
      { header: 'Razón Social',  dataKey: 'razon_social' },
      { header: 'NIT',           dataKey: 'nit' },
      { header: 'Tipo',          dataKey: 'tipo_empresa_display' },
      { header: 'Estado',        dataKey: 'estado_display' },
      { header: 'Riesgo',        dataKey: 'nivel_riesgo_display' },
      { header: 'Ciudad',        dataKey: 'ciudad' },
      { header: 'Email',         dataKey: 'email_principal' },
      { header: 'Teléfono',      dataKey: 'telefono' },
      { header: 'Inicio Rel.',   dataKey: 'fecha_inicio_relacion' },
      { header: 'Áreas',         dataKey: 'areas_count' },
    ],
    body: empresas.map(em => ({
      ...em,
      fecha_inicio_relacion: fmtD(em.fecha_inicio_relacion),
      areas_count: em.areas_count != null ? String(em.areas_count) : '0',
    })),
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 30, 51], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    // Color rows by estado
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.dataKey === 'estado_display') {
        const est = data.row.raw?.estado;
        const colors = { activo:[209,250,229], prospecto:[219,234,254], inactivo:[241,245,249], suspendido:[254,243,199], retirado:[254,226,226] };
        if (colors[est]) data.cell.styles.fillColor = colors[est];
      }
    },
    columnStyles: {
      0: { cellWidth: 52 }, 1: { cellWidth: 22 }, 2: { cellWidth: 20 },
      3: { cellWidth: 20 }, 4: { cellWidth: 16 }, 5: { cellWidth: 22 },
      6: { cellWidth: 40 }, 7: { cellWidth: 22 }, 8: { cellWidth: 20 }, 9: { cellWidth: 'auto' },
    },
    didDrawPage: (data) => drawFooter(doc, data.pageNumber, doc.internal.getNumberOfPages(), pageW, pageH),
  });

  doc.save(`${fname}_${fechaSufijo()}.pdf`);
  return true;
}

export function exportClientePDF(empresa, fname) {
  if (!empresa) return false;
  const base = fname || `cliente_${empresa.nit || empresa.id}`;
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const now  = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

  // ── Página 1: Info general + Contactos ──────────────────────────────────────

  // Header
  doc.setFillColor(0, 30, 51);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(empresa.razon_social || '', 12, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`NIT: ${empresa.nit || ''}${empresa.digito_verificacion ? '-'+empresa.digito_verificacion : ''}`, 12, 17);
  doc.setFontSize(7);
  const badges = [empresa.estado_display, empresa.nivel_riesgo_display, empresa.tipo_empresa_display].filter(Boolean);
  doc.text(badges.join('  ·  '), 12, 23);
  doc.setFontSize(7);
  doc.text(now, pageW - 12, 23, { align: 'right' });

  // Info grid (2 columnas)
  let y = 32;
  drawSec(doc, 12, y, 'Información General');
  y += 4;

  const leftInfo = [
    ['Tipo empresa',     empresa.tipo_empresa_display],
    ['Tamaño',           empresa.tamano_empresa],
    ['Régimen trib.',    empresa.regimen_tributario_display],
    ['Actividad (CIIU)', empresa.actividad_economica],
    ['Descripción',      empresa.descripcion_actividad],
    ['Empresa matriz',   empresa.empresa_matriz_nombre],
    ['Cámara comercio',  empresa.camara_comercio_numero],
    ['Inicio relación',  fmtD(empresa.fecha_inicio_relacion)],
  ].filter(([, v]) => v);

  const rightInfo = [
    ['Ciudad',        empresa.ciudad],
    ['Departamento',  empresa.departamento],
    ['Dirección',     empresa.direccion],
    ['Teléfono',      empresa.telefono],
    ['Email',         empresa.email_principal],
    ['Website',       empresa.website],
    ['Observaciones', empresa.observaciones],
  ].filter(([, v]) => v);

  const infoRows = Math.max(leftInfo.length, rightInfo.length);
  const ROW = 6.5;
  for (let i = 0; i < infoRows; i++) {
    const isEven = i % 2 === 0;
    if (isEven) { doc.setFillColor(248, 250, 252); doc.rect(12, y, 90, ROW, 'F'); doc.rect(106, y, 90, ROW, 'F'); }
    if (leftInfo[i]) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(100, 116, 139);
      doc.text(leftInfo[i][0], 14, y + ROW - 1.8);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 41, 59);
      doc.text(String(leftInfo[i][1] || '').substring(0, 35), 44, y + ROW - 1.8);
    }
    if (rightInfo[i]) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(100, 116, 139);
      doc.text(rightInfo[i][0], 108, y + ROW - 1.8);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 41, 59);
      doc.text(String(rightInfo[i][1] || '').substring(0, 38), 132, y + ROW - 1.8);
    }
    y += ROW;
  }
  y += 5;

  // Contactos
  const contactos = empresa.contactos || [];
  if (contactos.length) {
    drawSec(doc, 12, y, `Contactos (${contactos.length})`);
    y += 3;
    autoTable(doc, {
      startY: y,
      margin: { left: 12, right: 12 },
      columns: [
        { header: 'Nombre',    dataKey: 'nombre' },
        { header: 'Cargo',     dataKey: 'cargo_display' },
        { header: 'Email',     dataKey: 'email' },
        { header: 'Teléfono',  dataKey: 'telefono' },
        { header: 'Principal', dataKey: 'es_principal' },
      ],
      body: contactos.map(c => ({ ...c, es_principal: c.es_principal ? '★' : '', cargo_display: c.cargo_display || c.cargo })),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [0, 30, 51], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 28 }, 2: { cellWidth: 50 }, 3: { cellWidth: 24 }, 4: { cellWidth: 'auto' } },
      didDrawPage: data => drawFooter(doc, data.pageNumber, doc.internal.getNumberOfPages(), pageW, pageH),
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // ── Página 2: Servicios + Equipo ─────────────────────────────────────────────
  doc.addPage();
  doc.setFillColor(0, 30, 51);
  doc.rect(0, 0, pageW, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`${empresa.razon_social} — Servicios y Equipo`, 12, 8);

  y = 17;
  const servicios = empresa.servicios || [];
  if (servicios.length) {
    drawSec(doc, 12, y, `Servicios Contratados (${servicios.length})`);
    y += 3;
    autoTable(doc, {
      startY: y,
      margin: { left: 12, right: 12 },
      columns: [
        { header: 'Área',        dataKey: 'area_nombre' },
        { header: 'Descripción', dataKey: 'descripcion' },
        { header: 'Estado',      dataKey: 'estado_display' },
        { header: 'Periodicidad',dataKey: 'periodicidad_display' },
        { header: 'Valor Mens.', dataKey: 'valor_mensual' },
        { header: 'Inicio',      dataKey: 'fecha_inicio' },
        { header: 'Fin',         dataKey: 'fecha_fin' },
      ],
      body: servicios.map(s => ({
        ...s,
        valor_mensual: formatCOP(s.valor_mensual),
        fecha_inicio: fmtD(s.fecha_inicio),
        fecha_fin: fmtD(s.fecha_fin),
        estado_display: s.estado_display || s.estado,
        periodicidad_display: s.periodicidad_display || s.periodicidad,
      })),
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [0, 30, 51], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 0:{cellWidth:22}, 1:{cellWidth:55}, 2:{cellWidth:16}, 3:{cellWidth:20}, 4:{cellWidth:22}, 5:{cellWidth:18}, 6:{cellWidth:'auto'} },
      didDrawPage: data => drawFooter(doc, data.pageNumber, doc.internal.getNumberOfPages(), pageW, pageH),
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  const equipo = empresa.equipo || [];
  if (equipo.length) {
    drawSec(doc, 12, y, `Equipo Asignado (${equipo.length} activos)`);
    y += 3;
    autoTable(doc, {
      startY: y,
      margin: { left: 12, right: 12 },
      columns: [
        { header: 'Empleado',    dataKey: 'empleado_nombre' },
        { header: 'Cargo',       dataKey: 'empleado_cargo' },
        { header: 'Área',        dataKey: 'area_nombre' },
        { header: 'Rol',         dataKey: 'rol_display' },
        { header: 'Desde',       dataKey: 'fecha_inicio' },
      ],
      body: equipo.map(a => ({ ...a, fecha_inicio: fmtD(a.fecha_inicio), rol_display: a.rol_display || a.rol })),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [0, 90, 60], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 250, 247] },
      columnStyles: { 0:{cellWidth:40}, 1:{cellWidth:30}, 2:{cellWidth:22}, 3:{cellWidth:30}, 4:{cellWidth:'auto'} },
      didDrawPage: data => drawFooter(doc, data.pageNumber, doc.internal.getNumberOfPages(), pageW, pageH),
    });
  }

  // Footers finales
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    drawFooter(doc, p, total, pageW, pageH);
  }

  doc.save(`${base}_${fechaSufijo()}.pdf`);
  return true;
}

export function exportDashboardPDF(stats, contextLabel = '', fname = 'clientes_dashboard') {
  if (!stats) return false;
  const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();  // 297
  const pageH = doc.internal.pageSize.getHeight(); // 210
  const MW = 10; // margin left/right
  const UW = pageW - 2 * MW; // 277mm usable width
  const now = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  const riesgoAlto = (stats.por_riesgo?.alto || 0) + (stats.por_riesgo?.critico || 0);

  // ── Página 1: KPIs + Distribución + Clientes por Área ────────────────────────

  drawHeader(doc, `Dashboard de Clientes${contextLabel ? ' — ' + contextLabel : ''}`, `Generado: ${now}`, pageW);

  let y = 22;

  // KPIs
  drawSec(doc, MW, y, 'Indicadores Clave');
  y += 3;
  const kpiW = (UW - 9) / 4;
  const kpiData = [
    { label: 'Clientes en alcance',    value: stats.total || 0,              sub: `${stats.por_estado?.activo||0} activos`,        rgb: [59,130,246] },
    { label: 'Facturación mensual',    value: formatCOP(stats.ingresos_total), sub: 'servicios activos',                            rgb: [16,185,129] },
    { label: 'Riesgo Alto / Crítico',  value: riesgoAlto,                     sub: 'clientes en vigilancia',                       rgb: riesgoAlto > 0 ? [239,68,68] : [16,185,129] },
    { label: 'Colaboradores activos',  value: (stats.top_equipo||[]).length,  sub: 'con clientes asignados',                       rgb: [139,92,246] },
  ];
  kpiData.forEach((k, i) => drawKpi(doc, MW + i*(kpiW+3), y, kpiW, 28, k.label, k.value, k.sub, k.rgb));
  y += 32;

  // 3 Gráficas de distribución
  drawSec(doc, MW, y, 'Distribución');
  y += 3;
  const cw  = (UW - 6) / 3;
  const ch  = 62;
  const estadoItems = ESTADO_INFO.map(e => ({ label: e.label, value: stats.por_estado?.[e.key] || 0, rgb: e.rgb }));
  const riesgoItems = RIESGO_INFO.map(r => ({ label: r.label, value: stats.por_riesgo?.[r.key] || 0, rgb: r.rgb }));
  const tipoItems   = TIPO_INFO.map(t => ({ label: t.label, value: stats.por_tipo?.[t.key]  || 0, rgb: t.rgb }));
  drawChartBox(doc, MW,             y, cw, ch, 'Estado de Clientes',    estadoItems);
  drawChartBox(doc, MW + cw + 3,    y, cw, ch, 'Nivel de Riesgo',       riesgoItems);
  drawChartBox(doc, MW + (cw+3)*2,  y, cw, ch, 'Tipo de Empresa',       tipoItems);
  y += ch + 6;

  // Clientes por Área
  const areaItems = (stats.por_area || []).map((a, i) => ({
    label: a.area__nombre_area || '(Sin nombre)',
    value: a.total || 0,
    rgb: AREA_PAL[i % AREA_PAL.length],
  }));
  if (areaItems.length) {
    drawSec(doc, MW, y, 'Clientes por Área');
    y += 3;
    const areaBoxH = Math.min(Math.max(areaItems.length * 11 + 12, 40), 60);
    drawChartBox(doc, MW, y, UW, areaBoxH, '', areaItems);
    y += areaBoxH + 4;
  }

  // ── Página 2: Facturación + Equipo + Actividad ────────────────────────────────
  doc.addPage();
  drawHeader(doc, `Dashboard de Clientes — Facturación y Equipo`, `Generado: ${now}`, pageW);
  y = 22;

  // Facturación por área
  const facItems = (stats.facturacion_area || [])
    .filter(a => a.total > 0)
    .map((a, i) => ({
      label: a.area__nombre_area || '(Sin nombre)',
      value: a.total || 0,
      displayVal: formatCOP(a.total),
      rgb: AREA_PAL[i % AREA_PAL.length],
    }));
  if (facItems.length) {
    drawSec(doc, MW, y, 'Facturación Mensual por Área (COP)');
    y += 3;
    const facH = Math.min(Math.max(facItems.length * 11 + 12, 40), 70);
    drawChartBox(doc, MW, y, UW, facH, '', facItems);
    y += facH + 6;
  }

  // Nuevos clientes por mes (línea de texto simple)
  const mesItems = (stats.por_mes || []).map(m => ({ label: m.mes, value: m.total, rgb: [59,130,246] }));
  if (mesItems.length) {
    drawSec(doc, MW, y, 'Nuevos Clientes por Mes');
    y += 3;
    const mesH = Math.min(Math.max(mesItems.length * 9 + 12, 30), 55);
    drawChartBox(doc, MW, y, UW, mesH, '', mesItems);
    y += mesH + 6;
  }

  // Equipo + Actividad side by side
  const halfW = (UW - 4) / 2;
  const topEquipo   = stats.top_equipo   || [];
  const actividad   = stats.actividad_reciente || [];

  if (topEquipo.length || actividad.length) {
    drawSec(doc, MW, y, 'Equipo más Activo');
    y += 3;

    if (topEquipo.length) {
      autoTable(doc, {
        startY: y,
        margin: { left: MW },
        tableWidth: halfW,
        columns: [
          { header: 'Colaborador', dataKey: 'nombre' },
          { header: 'Cargo',       dataKey: 'cargo' },
          { header: 'Clientes',    dataKey: 'clientes' },
        ],
        body: topEquipo,
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [0, 30, 51], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 40 }, 2: { cellWidth: 'auto' } },
        didDrawPage: data => drawFooter(doc, data.pageNumber, doc.internal.getNumberOfPages(), pageW, pageH),
      });
    }

    if (actividad.length) {
      autoTable(doc, {
        startY: y,
        margin: { left: MW + halfW + 4 },
        tableWidth: halfW,
        columns: [
          { header: 'Fecha',    dataKey: 'fecha' },
          { header: 'Cliente',  dataKey: 'empresa_nombre' },
          { header: 'Tipo',     dataKey: 'tipo' },
          { header: 'Descripción', dataKey: 'descripcion' },
        ],
        body: actividad.map(a => ({ ...a, fecha: fmtD(a.fecha) })),
        styles: { fontSize: 6.5, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: { 0:{cellWidth:18}, 1:{cellWidth:36}, 2:{cellWidth:16}, 3:{cellWidth:'auto'} },
        didDrawPage: data => drawFooter(doc, data.pageNumber, doc.internal.getNumberOfPages(), pageW, pageH),
      });
    }
  }

  // Footers finales
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p); drawFooter(doc, p, total, pageW, pageH);
  }

  doc.save(`${fname}_${fechaSufijo()}.pdf`);
  return true;
}
