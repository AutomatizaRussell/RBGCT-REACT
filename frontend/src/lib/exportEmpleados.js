import * as XLSX from 'xlsx';

function rolLabel(id) {
  if (id === 1) return 'Administrador';
  if (id === 2) return 'Editor';
  if (id === 3) return 'Usuario';
  return id != null ? String(id) : '';
}

function toCell(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** Una fila plana con encabezados en español para hoja de cálculo */
export function empleadoToExportRow(emp) {
  return {
    // Identidad
    'ID empleado':       emp.id_empleado,
    'Nombre completo':   emp.nombre_completo || '',
    'Primer nombre':     toCell(emp.primer_nombre),
    'Segundo nombre':    toCell(emp.segundo_nombre),
    'Primer apellido':   toCell(emp.primer_apellido),
    'Segundo apellido':  toCell(emp.segundo_apellido),
    'Apodo':             toCell(emp.apodo),
    'Tipo documento':    toCell(emp.tipo_documento),
    'Número documento':  toCell(emp.numero_documento),
    // Personal
    'Fecha nacimiento':  toCell(emp.fecha_nacimiento),
    'Ciudad nacimiento': toCell(emp.ciudad_nacimiento),
    'Sexo':              toCell(emp.sexo),
    'Tipo sangre':       toCell(emp.tipo_sangre),
    'Estado civil':      toCell(emp.estado_civil),
    'Estrato':           toCell(emp.estrato_socioeconomico),
    'Tiene hijos':       emp.tiene_hijos === true ? 'Sí' : emp.tiene_hijos === false ? 'No' : '',
    'Número hijos':      emp.numero_hijos != null ? String(emp.numero_hijos) : '',
    // Contacto
    'Correo corporativo':   toCell(emp.correo_corporativo),
    'Correo personal':      toCell(emp.correo_personal),
    'Teléfono':             toCell(emp.telefono),
    'País residencia':      toCell(emp.pais_residencia),
    'Departamento':         toCell(emp.departamento_residencia),
    'Municipio':            toCell(emp.municipio_residencia),
    'Dirección':            toCell(emp.direccion),
    'Detalles residencia':  toCell(emp.detalles_residencia),
    // Emergencia
    'Contacto emergencia':  toCell(emp.nombre_contacto_emergencia),
    'Teléfono emergencia':  toCell(emp.telefono_emergencia),
    'Parentesco emergencia':toCell(emp.parentesco_emergencia),
    // Laboral
    'Área':          toCell(emp.nombre_area),
    'Cargo':         toCell(emp.nombre_cargo),
    'Fecha ingreso': toCell(emp.fecha_ingreso),
    'Fecha retiro':  toCell(emp.fecha_retiro),
    'Estado':        toCell(emp.estado),
    // Acceso
    'Rol':                   rolLabel(emp.id_permisos),
    'Permitir edición datos': emp.permitir_edicion_datos === true ? 'Sí' : emp.permitir_edicion_datos === false ? 'No' : '',
    // Auditoría
    'Creado':      toCell(emp.created_at),
    'Actualizado': toCell(emp.updated_at),
  };
}

function escapeCsvField(val) {
  const s = toCell(val);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportEmpleadosCSV(empleados, filenameBase = 'empleados') {
  if (!empleados?.length) return false;
  const rows = empleados.map(empleadoToExportRow);
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCsvField(row[h])).join(',')),
  ];
  const csv = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenameBase}_${fechaSufijo()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}

export function exportEmpleadosXLSX(empleados, filenameBase = 'empleados') {
  if (!empleados?.length) return false;
  const rows = empleados.map(empleadoToExportRow);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Empleados');
  XLSX.writeFile(wb, `${filenameBase}_${fechaSufijo()}.xlsx`);
  return true;
}

function fechaSufijo() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}