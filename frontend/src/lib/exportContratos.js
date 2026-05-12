import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function fechaSufijo() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

function tc(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  return String(v);
}

const TIPO_MAP = {
  termino_fijo: 'Término Fijo',
  termino_indefinido: 'Término Indefinido',
  obra_labor: 'Obra o Labor',
  prestacion_servicios: 'Prestación de Servicios',
  aprendizaje: 'Aprendizaje',
};
const SALARIO_MAP   = { ordinario: 'Ordinario', integral: 'Integral' };
const PAGO_MAP      = { mensual: 'Mensual', quincenal: 'Quincenal', semanal: 'Semanal' };
const JORNADA_MAP   = { completa: 'Jornada Completa', medio_tiempo: 'Medio Tiempo', flexible: 'Flexible', por_horas: 'Por Horas' };
const MODALIDAD_MAP = { presencial: 'Presencial', remoto: 'Remoto', hibrido: 'Híbrido' };
const MOTIVO_MAP    = {
  renuncia: 'Renuncia', despido_justa_causa: 'Despido J.C.',
  despido_sin_causa: 'Despido S.C.', mutuo_acuerdo: 'Mutuo Acuerdo',
  vencimiento: 'Vencimiento', obra_terminada: 'Obra Terminada',
};

// afiliaciones: map { empleadoId: afiliacion | null }  (opcional)
function buildRows(filtrados, contratos, afiliaciones = {}) {
  return filtrados.map(emp => {
    const c = contratos[emp.id_empleado] || null;
    const ss = afiliaciones[emp.id_empleado] || null;
    return {
      // — Identificación
      'Empleado':              tc(emp.nombre_completo),
      'Cargo':                 tc(emp.nombre_cargo),
      'Área':                  tc(emp.nombre_area),
      // — Contrato
      'Estado contrato':       c ? tc(c.estado) : 'Sin contrato',
      'Tipo contrato':         c ? tc(TIPO_MAP[c.tipo_contrato] || c.tipo_contrato) : '',
      'Fecha inicio':          tc(c?.fecha_inicio),
      'Fecha fin':             tc(c?.fecha_fin),
      'Fecha firma':           tc(c?.fecha_firma),
      'Salario':               c?.salario != null ? String(c.salario) : '',
      'Tipo salario':          c ? tc(SALARIO_MAP[c.tipo_salario] || c.tipo_salario) : '',
      'Aux. transporte':       c?.auxilio_transporte != null ? (c.auxilio_transporte ? 'Sí' : 'No') : '',
      'Forma pago':            c ? tc(PAGO_MAP[c.forma_pago] || c.forma_pago) : '',
      'Jornada':               c ? tc(JORNADA_MAP[c.jornada] || c.jornada) : '',
      'Modalidad':             c ? tc(MODALIDAD_MAP[c.modalidad] || c.modalidad) : '',
      'Lugar trabajo':         tc(c?.lugar_trabajo),
      'Período prueba (días)': c?.periodo_prueba_dias != null ? String(c.periodo_prueba_dias) : '',
      'Motivo terminación':    c ? tc(MOTIVO_MAP[c.motivo_terminacion] || c.motivo_terminacion) : '',
      'Fecha terminación':     tc(c?.fecha_terminacion),
      'Observaciones contrato':tc(c?.observaciones),
      // — Seguridad Social
      'EPS':                   tc(ss?.nombre_eps),
      'N° afiliación EPS':     tc(ss?.numero_afiliacion_eps),
      'Fecha afiliación EPS':  tc(ss?.fecha_afiliacion_eps),
      'AFP / Pensión':         tc(ss?.nombre_afp),
      'N° afiliación AFP':     tc(ss?.numero_afiliacion_afp),
      'Fecha afiliación AFP':  tc(ss?.fecha_afiliacion_afp),
      'ARL':                   tc(ss?.nombre_arl),
      'Nivel riesgo ARL':      tc(ss?.nivel_riesgo_arl),
      'N° póliza ARL':         tc(ss?.numero_poliza_arl),
      'Fecha afiliación ARL':  tc(ss?.fecha_afiliacion_arl),
      'Caja compensación':     tc(ss?.nombre_caja),
      'N° afiliación caja':    tc(ss?.numero_afiliacion_caja),
      'Fecha afiliación caja': tc(ss?.fecha_afiliacion_caja),
    };
  });
}

export function exportContratosExcel(filtrados, contratos, afiliaciones = {}, filenameBase = 'contratos') {
  if (!filtrados?.length) return false;
  const rows = buildRows(filtrados, contratos, afiliaciones);
  const ws = XLSX.utils.json_to_sheet(rows);

  const widths = [
    28, 22, 18,          // empleado, cargo, área
    14, 20, 12, 12, 12,  // estado, tipo, inicio, fin, firma
    14, 14, 14, 12, 16, 12, 20, 16, 18, 16, 30,  // salario…observaciones
    18, 20, 18,          // EPS
    18, 20, 18,          // AFP
    18, 14, 16, 18,      // ARL
    20, 20, 18,          // Caja
  ];
  ws['!cols'] = widths.map(w => ({ wch: w }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Contratos');
  XLSX.writeFile(wb, `${filenameBase}_${fechaSufijo()}.xlsx`);
  return true;
}

export function exportContratosPDF(filtrados, contratos, afiliaciones = {}, filenameBase = 'contratos') {
  if (!filtrados?.length) return false;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const now = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

  const rows = buildRows(filtrados, contratos, afiliaciones);

  const drawPageHeader = (title, subtitle) => {
    doc.setFillColor(0, 30, 51);
    doc.rect(0, 0, pageW, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 7);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, 13);
  };

  const drawPageFooter = (pageNum, total) => {
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Página ${pageNum} de ${total}`, pageW - 14, pageH - 6, { align: 'right' });
  };

  // ── Tabla 1: Contrato ──────────────────────────────────────────────────────
  drawPageHeader('Contrato Laboral', `Generado: ${now}  ·  ${filtrados.length} empleado(s)`);

  // Landscape A4 = 297mm. Con margin left/right=10 → ancho útil = 277mm
  autoTable(doc, {
    startY: 21,
    margin: { left: 10, right: 10 },
    columns: [
      { header: 'Empleado',     dataKey: 'Empleado' },
      { header: 'Cargo',        dataKey: 'Cargo' },
      { header: 'Área',         dataKey: 'Área' },
      { header: 'Estado',       dataKey: 'Estado contrato' },
      { header: 'Tipo',         dataKey: 'Tipo contrato' },
      { header: 'Inicio',       dataKey: 'Fecha inicio' },
      { header: 'Fin',          dataKey: 'Fecha fin' },
      { header: 'Salario',      dataKey: 'Salario' },
      { header: 'Tipo sal.',    dataKey: 'Tipo salario' },
      { header: 'Modalidad',    dataKey: 'Modalidad' },
      { header: 'Jornada',      dataKey: 'Jornada' },
      { header: 'Aux.Transp.',  dataKey: 'Aux. transporte' },
      { header: 'Lugar trab.',  dataKey: 'Lugar trabajo' },
      { header: 'Observaciones',dataKey: 'Observaciones contrato' },
    ],
    body: rows,
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 30, 51], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    // suma explícita: 28+22+16+16+24+17+17+16+12+15+18+13+21 = 235 → auto toma ~42mm
    columnStyles: {
      0: { cellWidth: 28 }, 1: { cellWidth: 22 }, 2: { cellWidth: 16 },
      3: { cellWidth: 16 }, 4: { cellWidth: 24 }, 5: { cellWidth: 17 },
      6: { cellWidth: 17 }, 7: { cellWidth: 16 }, 8: { cellWidth: 12 },
      9: { cellWidth: 15 }, 10: { cellWidth: 18 }, 11: { cellWidth: 13 },
      12: { cellWidth: 21 }, 13: { cellWidth: 'auto' },
    },
    didDrawPage: (data) => {
      const total = doc.internal.getNumberOfPages();
      drawPageFooter(data.pageNumber, total);
    },
  });

  // ── Tabla 2: Seguridad Social (nueva página) ───────────────────────────────
  // 14 columnas · suma explícita: 28+19+17+16+19+17+16+18+12+15+16+19+17+16 = 249mm < 277mm ✓
  doc.addPage();
  drawPageHeader('Seguridad Social', `Generado: ${now}  ·  ${filtrados.length} empleado(s)`);

  autoTable(doc, {
    startY: 21,
    margin: { left: 10, right: 10 },
    columns: [
      { header: 'Empleado',      dataKey: 'Empleado' },
      { header: 'EPS',           dataKey: 'EPS' },
      { header: 'N° EPS',        dataKey: 'N° afiliación EPS' },
      { header: 'F. afil. EPS',  dataKey: 'Fecha afiliación EPS' },
      { header: 'AFP',           dataKey: 'AFP / Pensión' },
      { header: 'N° AFP',        dataKey: 'N° afiliación AFP' },
      { header: 'F. afil. AFP',  dataKey: 'Fecha afiliación AFP' },
      { header: 'ARL',           dataKey: 'ARL' },
      { header: 'Nivel riesgo',  dataKey: 'Nivel riesgo ARL' },
      { header: 'N° póliza',     dataKey: 'N° póliza ARL' },
      { header: 'F. afil. ARL',  dataKey: 'Fecha afiliación ARL' },
      { header: 'Caja comp.',    dataKey: 'Caja compensación' },
      { header: 'N° caja',       dataKey: 'N° afiliación caja' },
      { header: 'F. afil. caja', dataKey: 'Fecha afiliación caja' },
    ],
    body: rows,
    styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 90, 60], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    alternateRowStyles: { fillColor: [245, 250, 247] },
    columnStyles: {
      0:  { cellWidth: 28 },
      1:  { cellWidth: 19 }, 2:  { cellWidth: 17 }, 3:  { cellWidth: 16 },
      4:  { cellWidth: 19 }, 5:  { cellWidth: 17 }, 6:  { cellWidth: 16 },
      7:  { cellWidth: 18 }, 8:  { cellWidth: 12 }, 9:  { cellWidth: 15 }, 10: { cellWidth: 16 },
      11: { cellWidth: 19 }, 12: { cellWidth: 17 }, 13: { cellWidth: 16 },
    },
    didDrawPage: (data) => {
      const total = doc.internal.getNumberOfPages();
      drawPageFooter(data.pageNumber, total);
    },
  });

  doc.save(`${filenameBase}_${fechaSufijo()}.pdf`);
  return true;
}
