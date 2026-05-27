import * as XLSX from 'xlsx';

// 1. Agregamos los mapas de datos reales
const AREAS_MAP = {
  1: 'Revisoría Fiscal y Auditoría',
  2: 'Contabilidad',
  3: 'BPO',
  4: 'Legal',
  5: 'Impuestos',
  6: 'Administración',
  7: 'Financiera'
};

const CARGOS_MAP = {
  1: 'Socio',
  2: 'Gerente 1',
  3: 'Gerente 2',
  4: 'Gerente 3',
  5: 'Senior 1',
  6: 'Senior 2',
  7: 'Senior 3',
  8: 'Líder/Semi-Senior 1',
  9: 'Líder/Semi-Senior 2',
  10: 'Líder/Semi-Senior 3',
  11: 'Analista/Asistente 1',
  12: 'Analista/Asistente 2',
  13: 'Analista/Asistente 3',
  14: 'Analista/Asistente 4'
};

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
  // 2. Interceptamos y traducimos usando el mapa si el nombre viene vacío desde el backend
  const areaFinal = emp.nombre_area || AREAS_MAP[emp.area_id] || AREAS_MAP[emp.area] || '';
  const cargoFinal = emp.nombre_cargo || CARGOS_MAP[emp.cargo_id] || CARGOS_MAP[emp.cargo] || '';

  return {
    'ID empleado': emp.id_empleado,
    'Nombre completo': emp.nombre_completo || '',
    'Primer nombre': toCell(emp.primer_nombre),
    'Segundo nombre': toCell(emp.segundo_nombre),
    'Primer apellido': toCell(emp.primer_apellido),
    'Segundo apellido': toCell(emp.segundo_apellido),
    'Apodo': toCell(emp.apodo),
    'Tipo documento': toCell(emp.tipo_documento),
    'Número documento': toCell(emp.numero_documento),
    'Fecha nacimiento': toCell(emp.fecha_nacimiento),
    'Sexo': toCell(emp.sexo),
    'Tipo sangre': toCell(emp.tipo_sangre),
    'Correo corporativo': toCell(emp.correo_corporativo),
    'Correo personal': toCell(emp.correo_personal),
    'Teléfono': toCell(emp.telefono),
    'Dirección': toCell(emp.direccion),
    'Contacto emergencia': toCell(emp.nombre_contacto_emergencia),
    'Teléfono emergencia': toCell(emp.telefono_emergencia),
    'Parentesco emergencia': toCell(emp.parentesco_emergencia),
    
    // 3. Usamos nuestras variables traducidas
    'Área': toCell(areaFinal),
    'Cargo': toCell(cargoFinal),
    
    // (Opcional) Si ya no quieres que salgan las columnas con los números sueltos, 
    // puedes comentar o borrar estas dos líneas de abajo:
    'ID área': emp.area_id ?? '',
    'ID cargo': emp.cargo_id ?? '',

    'Fecha ingreso': toCell(emp.fecha_ingreso),
    'Fecha retiro': toCell(emp.fecha_retiro),
    'Estado': toCell(emp.estado),
    'Rol': rolLabel(emp.id_permisos),
    'Permitir edición datos': emp.permitir_edicion_datos === true ? 'Sí' : emp.permitir_edicion_datos === false ? 'No' : '',
    'Creado': toCell(emp.created_at),
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