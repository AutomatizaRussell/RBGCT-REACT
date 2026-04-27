// Base de datos REAL via API REST - Russell Bedford GCT
// Re-exportamos desde api.js para mantener compatibilidad

export {
  getAllTareas,
  getTareasByRol,
  getTareaById,
  getTareasByEmpleado,
  createTarea,
  updateTarea,
  updateTareaEstado,
  deleteTarea,
  getAllEmpleados,
  getEmpleadoById,
  getEmpleadoByEmail,
  createEmpleado,
  updateEmpleado,
  cambiarEstadoEmpleado,
  getAllCursos,
  createCurso,
  updateCurso,
  deleteCurso,
  getContenidosByCurso,
  createCursoContenido,
  updateCursoContenido,
  deleteCursoContenido,
  getAllReglamento,
  createReglamentoItem,
  updateReglamentoItem,
  deleteReglamentoItem,
  moverReglamentoItem,
  getAllAreas,
  createArea,
  deleteArea,
  getAllCargos,
  createCargo,
  deleteCargo,
  getSuperAdminByEmail,
  login,
  crearUsuarioSuperAdmin,
  completarDatosEmpleado,
  habilitarEdicionDatos,
  habilitarEdicionMasivaSuperAdmin,
  healthCheck,
  getActividadReciente,
  registrarIntentoRecuperacion,
  getAlertasRecuperacion,
  atenderAlerta,
  eliminarAlerta,
  actualizarPasswordEmpleado,
  pingActividad
} from './api.js';

// Función de inicialización (no-op para compatibilidad)
export const initDatabase = async () => {
  console.log('✅ Usando API REST con SQLite real en backend');
  return true;
};

// ============================================
// CÓDIGO VIEJO - BASE DE DATOS EN MEMORIA
// ============================================
/*
const DB = {
  // Áreas de la empresa
  // id_area: 1=Revisoría Fiscal, 2=Contabilidad, 3=BPO, 4=Legal, 5=Impuestos, 6=Administración, 7=Financiera
  areas: [],

  // Cargos de la empresa
  cargos: [],
  // Empleados de la empresa (datos completos del esquema datos_empleado)
  // id_permisos: 1=superadmin/admin, 2=editor, 3=usuario
  // estado: ACTIVA/INACTIVA
  empleados: [
    {
      id_empleado: 1,
      tipo_documento: 'CC',
      documento: '12345678',
      primer_nombre: 'Juan',
      segundo_nombre: 'Carlos',
      primer_apellido: 'Pérez',
      segundo_apellido: 'Gómez',
      fecha_nacimiento: '1990-05-15',
      direccion: 'Calle 123 # 45-67',
      telefono: '3001234567',
      correo_corporativo: 'juan.perez@russellbedford.com.co',
      correo_personal: 'juanp@gmail.com',
      fecha_ingreso: '2024-01-15',
      fecha_retiro: null,
      estado: 'ACTIVA',
      area_id: 1,
      cargo_id: 1,
      id_permisos: 1,  // Admin
      auth_id: null,
      foto_url: null,
      eps: 'Sura',
      pension: 'Porvenir',
      cesantias: 'Protección',
      caja_compensacion: 'Compensar',
      contacto_emergencia_nombre: 'María Pérez',
      contacto_emergencia_telefono: '3009876543'
    },
    {
      id_empleado: 2,
      tipo_documento: 'CC',
      documento: '87654321',
      primer_nombre: 'María',
      segundo_nombre: 'Elena',
      primer_apellido: 'Rodríguez',
      segundo_apellido: 'Torres',
      fecha_nacimiento: '1985-08-20',
      direccion: 'Carrera 45 # 67-89',
      telefono: '3009876543',
      correo_corporativo: 'maria.rodriguez@russellbedford.com.co',
      correo_personal: 'maria.r@gmail.com',
      fecha_ingreso: '2024-02-01',
      fecha_retiro: null,
      estado: 'ACTIVA',
      area_id: 2,
      cargo_id: 2,
      id_permisos: 2,  // Editor
      auth_id: null,
      foto_url: null,
      eps: 'Nueva EPS',
      pension: 'Colfondos',
      cesantias: 'FNA',
      caja_compensacion: 'Colsubsidio',
      contacto_emergencia_nombre: 'Pedro Rodríguez',
      contacto_emergencia_telefono: '3001234567'
    },
    {
      id_empleado: 3,
      tipo_documento: 'CC',
      documento: '45678912',
      primer_nombre: 'Pedro',
      segundo_nombre: 'Antonio',
      primer_apellido: 'García',
      segundo_apellido: 'López',
      fecha_nacimiento: '1992-03-10',
      direccion: 'Avenida 67 # 89-10',
      telefono: '3004567890',
      correo_corporativo: 'pedro.garcia@russellbedford.com.co',
      correo_personal: 'pedro.g@gmail.com',
      fecha_ingreso: '2024-03-10',
      fecha_retiro: null,
      estado: 'ACTIVA',
      area_id: 3,
      cargo_id: 3,
      id_permisos: 3,  // Usuario
      auth_id: null,
      foto_url: null,
      eps: 'Sanitas',
      pension: 'Old Mutual',
      cesantias: 'Colfondos',
      caja_compensacion: 'Cafam',
      contacto_emergencia_nombre: 'Ana García',
      contacto_emergencia_telefono: '3007891234'
    }
  ],
  superadmins: [
    { 
      id: '1233c9d3-b99f-475b-a754-e61c42e313b5', 
      email: 'test-admin@rbcol.co', 
      nombre: 'Administrador Principal',
      created_at: new Date().toISOString()
    }
  ],
  // Tareas del calendario (estructura completa según migración)
  // id_area: 1=Revisoría Fiscal, 2=Contabilidad, 3=BPO, 4=Legal, 5=Impuestos, 6=Administración, 7=Financiera
  // prioridad: alta, media, baja
  // estado: pendiente, en_proceso, completada
  // id_empleado: NULL = tarea general del área
  tareas: [
    {
      id: 1,
      titulo: 'Revisión de estados financieros Q1',
      descripcion: 'Revisar y aprobar estados financieros del primer trimestre',
      id_area: 1,
      id_empleado: 1,
      prioridad: 'alta',
      fecha_vencimiento: '2026-04-20',
      asignado_a: 'juan.perez@russellbedford.com.co',
      estado: 'pendiente',
      creado_por: '1233c9d3-b99f-475b-a754-e61c42e313b5',
      fecha_creacion: '2026-04-01T10:00:00Z',
      fecha_actualizacion: '2026-04-01T10:00:00Z'
    },
    {
      id: 2,
      titulo: 'Cierre mensual de nómina',
      descripcion: 'Procesar cierre de nómina correspondiente al mes',
      id_area: 2,
      id_empleado: 2,
      prioridad: 'alta',
      fecha_vencimiento: '2026-04-25',
      asignado_a: 'maria.rodriguez@russellbedford.com.co',
      estado: 'en_proceso',
      creado_por: '1233c9d3-b99f-475b-a754-e61c42e313b5',
      fecha_creacion: '2026-04-05T14:30:00Z',
      fecha_actualizacion: '2026-04-10T09:15:00Z'
    },
    {
      id: 3,
      titulo: 'Auditoría interna de procesos BPO',
      descripcion: 'Realizar auditoría de calidad en procesos outsourcing',
      id_area: 3,
      id_empleado: 3,
      prioridad: 'media',
      fecha_vencimiento: '2026-04-15',
      asignado_a: 'pedro.garcia@russellbedford.com.co',
      estado: 'pendiente',
      creado_por: '1233c9d3-b99f-475b-a754-e61c42e313b5',
      fecha_creacion: '2026-04-03T11:00:00Z',
      fecha_actualizacion: '2026-04-03T11:00:00Z'
    }
  ]
};

// ============================================
// FUNCIONES DE CONSULTA
// ============================================

// Funciones de consulta
export const query = (table) => DB[table] || [];

export const getSuperAdminByEmail = (email) => {
  return DB.superadmins.find(s => s.email === email) || null;
};

export const getEmpleadoByEmail = (email) => {
  const emp = DB.empleados.find(e => e.correo_corporativo === email);
  if (!emp) return null;
  
  // Verificar que esté activo
  if (emp.estado !== 'ACTIVA' && emp.estado !== 'ACTIVO') {
    console.error('Empleado no está activo:', emp.estado);
    return null;
  }
  
  // Agregar nombre de área y cargo
  const area = DB.areas.find(a => a.id_area === emp.area_id);
  const cargo = DB.cargos.find(c => c.id_cargo === emp.cargo_id);
  
  return {
    ...emp,
    nombre_area: area?.nombre_area,
    nombre_cargo: cargo?.nombre_cargo
  };
};

export const getEmpleadoById = (id) => {
  const emp = DB.empleados.find(e => e.id_empleado === id);
  if (!emp) return null;
  
  // Verificar que esté activo
  if (emp.estado !== 'ACTIVA' && emp.estado !== 'ACTIVO') {
    console.error('Empleado no está activo:', emp.estado);
    return null;
  }
  
  const area = DB.areas.find(a => a.id_area === emp.area_id);
  const cargo = DB.cargos.find(c => c.id_cargo === emp.cargo_id);
  
  return {
    ...emp,
    nombre_area: area?.nombre_area,
    nombre_cargo: cargo?.nombre_cargo
  };
};

export const getTareasByEmpleado = (idEmpleado) => {
  return DB.tareas.filter(t => t.id_empleado === idEmpleado);
};

export const getAllTareas = () => {
  return DB.tareas.map(t => {
    const emp = DB.empleados.find(e => e.id_empleado === t.id_empleado);
    const area = DB.areas.find(a => a.id_area === t.id_area);
    return {
      ...t,
      primer_nombre: emp?.primer_nombre,
      primer_apellido: emp?.primer_apellido,
      nombre_area: area?.nombre_area
    };
  });
};

export const updateTareaEstado = (id, estado) => {
  const tarea = DB.tareas.find(t => t.id === id);
  if (tarea) {
    tarea.estado = estado;
    return true;
  }
  return false;
};

export const getAllEmpleados = () => {
  return DB.empleados
    .filter(emp => emp.estado === 'ACTIVA' || emp.estado === 'ACTIVO')
    .map(emp => {
      const area = DB.areas.find(a => a.id_area === emp.area_id);
      const cargo = DB.cargos.find(c => c.id_cargo === emp.cargo_id);
      return {
        ...emp,
        nombre_area: area?.nombre_area,
        nombre_cargo: cargo?.nombre_cargo
      };
    });
};

export const getAllAreas = () => DB.areas;

export const updateEmpleado = (id, data) => {
  const idx = DB.empleados.findIndex(e => e.id_empleado === id);
  if (idx >= 0) {
    DB.empleados[idx] = { ...DB.empleados[idx], ...data };
    return true;
  }
  return false;
};

export const createTarea = (tarea) => {
  const newId = Math.max(...DB.tareas.map(t => t.id), 0) + 1;
  const now = new Date().toISOString();
  const newTarea = {
    id: newId,
    estado: 'pendiente',
    fecha_creacion: now,
    fecha_actualizacion: now,
    ...tarea
  };
  DB.tareas.push(newTarea);
  return newId;
};

// ============================================
// FUNCIONES CRUD PARA LLENAR DESDE LA UI
// ============================================

// Crear área
export const createArea = (data) => {
  const newId = DB.areas.length > 0 ? Math.max(...DB.areas.map(a => a.id_area)) + 1 : 1;
  const newArea = { id_area: newId, ...data };
  DB.areas.push(newArea);
  return newId;
};

// Crear cargo
export const createCargo = (data) => {
  const newId = DB.cargos.length > 0 ? Math.max(...DB.cargos.map(c => c.id_cargo)) + 1 : 1;
  const newCargo = { id_cargo: newId, ...data };
  DB.cargos.push(newCargo);
  return newId;
};

// Crear empleado
export const createEmpleado = (data) => {
  const newId = DB.empleados.length > 0 ? Math.max(...DB.empleados.map(e => e.id_empleado)) + 1 : 1;
  const newEmpleado = { 
    id_empleado: newId, 
    estado: 'ACTIVA',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    ...data 
  };
  DB.empleados.push(newEmpleado);
  return newId;
};

// Eliminar tarea
export const deleteTarea = (id) => {
  const idx = DB.tareas.findIndex(t => t.id === id);
  if (idx >= 0) {
    DB.tareas.splice(idx, 1);
    return true;
  }
  return false;
};

// Eliminar empleado (cambiar estado a INACTIVA)
export const deleteEmpleado = (id) => {
  return updateEmpleado(id, { estado: 'INACTIVA', fecha_retiro: new Date().toISOString().split('T')[0] });
};

// No necesita inicialización
export const initDatabase2 = async () => {
  console.log('✅ Base de datos en memoria lista');
  return DB;
};

export default DB;
*/
