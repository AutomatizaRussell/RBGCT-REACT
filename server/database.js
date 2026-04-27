import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base de datos SQLite REAL en archivo
const dbPath = path.join(__dirname, '..', 'data', 'rbgct.db');
const db = new Database(dbPath);

// Habilitar WAL mode para mejor rendimiento
db.pragma('journal_mode = WAL');

// Crear tablas si no existen
function initDatabase() {
  // Tabla de áreas
  db.exec(`
    CREATE TABLE IF NOT EXISTS datos_area (
      id_area INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_area TEXT NOT NULL,
      descripcion TEXT,
      estado TEXT DEFAULT 'ACTIVO'
    )
  `);

  // Tabla de cargos
  db.exec(`
    CREATE TABLE IF NOT EXISTS datos_cargo (
      id_cargo INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_cargo TEXT NOT NULL,
      descripcion TEXT,
      estado TEXT DEFAULT 'ACTIVO'
    )
  `);

  // Tabla de empleados (esquema completo)
  db.exec(`
    CREATE TABLE IF NOT EXISTS datos_empleado (
      id_empleado INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo_documento TEXT,
      documento TEXT,
      primer_nombre TEXT NOT NULL,
      segundo_nombre TEXT,
      primer_apellido TEXT NOT NULL,
      segundo_apellido TEXT,
      fecha_nacimiento DATE,
      direccion TEXT,
      telefono TEXT,
      correo_corporativo TEXT UNIQUE,
      correo_personal TEXT,
      fecha_ingreso DATE,
      fecha_retiro DATE,
      estado TEXT DEFAULT 'ACTIVA',
      area_id INTEGER,
      cargo_id INTEGER,
      id_permisos INTEGER DEFAULT 3,
      auth_id TEXT,
      foto_url TEXT,
      eps TEXT,
      pension TEXT,
      cesantias TEXT,
      caja_compensacion TEXT,
      contacto_emergencia_nombre TEXT,
      contacto_emergencia_telefono TEXT,
      FOREIGN KEY (area_id) REFERENCES datos_area(id_area),
      FOREIGN KEY (cargo_id) REFERENCES datos_cargo(id_cargo)
    )
  `);

  // Tabla de superadmins
  db.exec(`
    CREATE TABLE IF NOT EXISTS super_admins (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      nombre TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de tareas del calendario
  db.exec(`
    CREATE TABLE IF NOT EXISTS tareas_calendario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      id_area INTEGER NOT NULL,
      id_empleado INTEGER,
      prioridad TEXT DEFAULT 'media',
      fecha_vencimiento DATE NOT NULL,
      asignado_a TEXT,
      estado TEXT DEFAULT 'pendiente',
      creado_por TEXT,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (id_empleado) REFERENCES datos_empleado(id_empleado) ON DELETE SET NULL
    )
  `);

  // Trigger para actualizar fecha_actualizacion
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_tareas_updated_at 
    AFTER UPDATE ON tareas_calendario
    BEGIN
      UPDATE tareas_calendario SET fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);

  console.log('✅ Base de datos SQLite inicializada en:', dbPath);
}

// Insertar datos de ejemplo si las tablas están vacías
function insertSampleData() {
  const areas = db.prepare('SELECT COUNT(*) as count FROM datos_area').get();
  if (areas.count === 0) {
    const insertArea = db.prepare('INSERT INTO datos_area (nombre_area, descripcion) VALUES (?, ?)');
    [
      ['Revisoría Fiscal', 'Revisión fiscal y auditoría'],
      ['Contabilidad', 'Servicios contables'],
      ['BPO', 'Business Process Outsourcing'],
      ['Legal', 'Servicios legales'],
      ['Impuestos', 'Asesoría tributaria'],
      ['Administración', 'Gestión administrativa'],
      ['Financiera', 'Servicios financieros']
    ].forEach(area => insertArea.run(area));
  }

  const cargos = db.prepare('SELECT COUNT(*) as count FROM datos_cargo').get();
  if (cargos.count === 0) {
    const insertCargo = db.prepare('INSERT INTO datos_cargo (nombre_cargo, descripcion) VALUES (?, ?)');
    [
      ['Revisor Fiscal', 'Revisor fiscal titular'],
      ['Contador', 'Contador general'],
      ['Analista BPO', 'Analista de procesos'],
      ['Abogado', 'Abogado corporativo'],
      ['Asesor Tributario', 'Asesor en impuestos'],
      ['Administrador', 'Administrador general'],
      ['Analista Financiero', 'Analista financiero'],
      ['Gerente', 'Gerente de área'],
      ['Director', 'Director de departamento']
    ].forEach(cargo => insertCargo.run(cargo));
  }

  const empleados = db.prepare('SELECT COUNT(*) as count FROM datos_empleado').get();
  if (empleados.count === 0) {
    const insertEmpleado = db.prepare(`
      INSERT INTO datos_empleado (
        tipo_documento, documento, primer_nombre, segundo_nombre, 
        primer_apellido, segundo_apellido, correo_corporativo, fecha_ingreso,
        estado, area_id, cargo_id, id_permisos, telefono, direccion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    [
      ['CC', '12345678', 'Juan', 'Carlos', 'Pérez', 'Gómez', 'juan.perez@russellbedford.com.co', '2024-01-15', 'ACTIVA', 1, 1, 1, '3001234567', 'Calle 123 # 45-67'],
      ['CC', '87654321', 'María', 'Elena', 'Rodríguez', 'Torres', 'maria.rodriguez@russellbedford.com.co', '2024-02-01', 'ACTIVA', 2, 2, 2, '3009876543', 'Carrera 45 # 67-89'],
      ['CC', '45678912', 'Pedro', 'Antonio', 'García', 'López', 'pedro.garcia@russellbedford.com.co', '2024-03-10', 'ACTIVA', 3, 3, 3, '3004567890', 'Avenida 67 # 89-10']
    ].forEach(emp => insertEmpleado.run(emp));
  }

  const superadmins = db.prepare('SELECT COUNT(*) as count FROM super_admins').get();
  if (superadmins.count === 0) {
    const insertSuperAdmin = db.prepare('INSERT INTO super_admins (id, email, nombre) VALUES (?, ?, ?)');
    insertSuperAdmin.run(['1233c9d3-b99f-475b-a754-e61c42e313b5', 'test-admin@rbcol.co', 'Administrador Principal']);
  }

  const tareas = db.prepare('SELECT COUNT(*) as count FROM tareas_calendario').get();
  if (tareas.count === 0) {
    const insertTarea = db.prepare(`
      INSERT INTO tareas_calendario 
      (titulo, descripcion, id_area, id_empleado, prioridad, fecha_vencimiento, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    [
      ['Revisión de estados financieros Q1', 'Revisar estados financieros', 1, 1, 'alta', '2026-04-20', 'pendiente'],
      ['Cierre mensual de nómina', 'Procesar nómina', 2, 2, 'alta', '2026-04-25', 'en_proceso'],
      ['Auditoría interna BPO', 'Auditoría de calidad', 3, 3, 'media', '2026-04-15', 'pendiente']
    ].forEach(tarea => insertTarea.run(tarea));
  }

  console.log('✅ Datos de ejemplo insertados');
}

// Inicializar
initDatabase();
insertSampleData();

export default db;
