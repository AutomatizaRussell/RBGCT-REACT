/**
 * Datos mock para DevPreview.
 *
 * Intención:
 * - Permitir renderizar componentes visuales sin login, backend ni base de datos.
 * - Simular estructuras típicas que la app recibe desde Django.
 *
 * Restricciones:
 * - No usar datos reales.
 * - No importar esto desde lógica productiva.
 */

export const usuarioMock = {
  id_empleado: 1,
  primer_nombre: 'Daniel',
  segundo_nombre: 'Felipe',
  primer_apellido: 'Lopera',
  segundo_apellido: 'Estrada',
  correo_corporativo: 'demo@empresa.com',
  estado: 'ACTIVA',
  id_permisos: 2,
  area_id: 1,
  cargo_id: 1,
  primer_login: false,
  datos_completados: true,
  permitir_edicion_datos: true,
  acceso_formularios_sqf: true,
}

export const superAdminMock = {
  id: '1',
  email: 'admin.demo@empresa.com',
  nombre: 'Admin',
  apellido: 'Demo',
  role: 'superadmin',
  estado: 'ACTIVA',
}

export const empleadosMock = [
  {
    id_empleado: 1,
    primer_nombre: 'Ana',
    segundo_nombre: '',
    primer_apellido: 'Gómez',
    segundo_apellido: 'Ríos',
    correo_corporativo: 'ana.gomez@empresa.com',
    estado: 'ACTIVA',
    id_permisos: 2,
    area_id: 1,
    cargo_id: 1,
    datos_completados: true,
  },
  {
    id_empleado: 2,
    primer_nombre: 'Carlos',
    segundo_nombre: 'Andrés',
    primer_apellido: 'Ruiz',
    segundo_apellido: 'Mejía',
    correo_corporativo: 'carlos.ruiz@empresa.com',
    estado: 'ACTIVA',
    id_permisos: 3,
    area_id: 2,
    cargo_id: 4,
    datos_completados: false,
  },
  {
    id_empleado: 3,
    primer_nombre: 'María',
    segundo_nombre: '',
    primer_apellido: 'Pérez',
    segundo_apellido: 'López',
    correo_corporativo: 'maria.perez@empresa.com',
    estado: 'INACTIVA',
    id_permisos: 4,
    area_id: 3,
    cargo_id: 5,
    datos_completados: true,
  },
]

export const tareasMock = [
  {
    id: 1,
    titulo: 'Actualizar datos personales',
    descripcion: 'Completar información pendiente del perfil.',
    estado: 'Pendiente',
    prioridad: 'Alta',
    fecha: '2026-06-05',
  },
  {
    id: 2,
    titulo: 'Revisar documentación contractual',
    descripcion: 'Validar soportes cargados por el usuario.',
    estado: 'En proceso',
    prioridad: 'Media',
    fecha: '2026-06-08',
  },
  {
    id: 3,
    titulo: 'Confirmar capacitación',
    descripcion: 'Marcar curso obligatorio como completado.',
    estado: 'Completada',
    prioridad: 'Baja',
    fecha: '2026-06-10',
  },
]

export const clientesMock = [
  {
    id: 1,
    nombre: 'Cliente Demo S.A.S.',
    nit: '900123456',
    estado: 'Activo',
    ciudad: 'Medellín',
    responsable: 'Ana Gómez',
  },
  {
    id: 2,
    nombre: 'Empresa Prueba Ltda.',
    nit: '800987654',
    estado: 'Pendiente',
    ciudad: 'Bogotá',
    responsable: 'Carlos Ruiz',
  },
]

export const contratosMock = [
  {
    id: 1,
    cliente: 'Cliente Demo S.A.S.',
    tipo: 'Prestación de servicios',
    estado: 'Vigente',
    fecha_inicio: '2026-01-01',
    fecha_fin: '2026-12-31',
  },
  {
    id: 2,
    cliente: 'Empresa Prueba Ltda.',
    tipo: 'Soporte mensual',
    estado: 'Por renovar',
    fecha_inicio: '2025-07-01',
    fecha_fin: '2026-06-30',
  },
]

export const cursosMock = [
  {
    id: 1,
    titulo: 'Inducción corporativa',
    estado: 'Publicado',
    progreso: 78,
  },
  {
    id: 2,
    titulo: 'Seguridad y salud en el trabajo',
    estado: 'Borrador',
    progreso: 35,
  },
]

