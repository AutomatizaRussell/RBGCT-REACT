import initSqlJs from 'sql.js/dist/sql-wasm.js';

// Nombre de la base de datos en IndexedDB
const DB_NAME = 'gct_database';
const STORE_NAME = 'sqlite_db';

// Variable global para HMR
if (!globalThis.__gct_db) {
  globalThis.__gct_db = null;
  globalThis.__gct_sql = null;
  globalThis.__gct_initialized = false;
}

let db = globalThis.__gct_db;
let SQL = globalThis.__gct_sql;

// ============================================
// PERSISTENCIA INDEXEDDB
// ============================================

// Guardar base de datos en IndexedDB
const saveToIndexedDB = async () => {
  if (!db) return;
  
  try {
    const data = db.export();
    const blob = new Blob([data], { type: 'application/x-sqlite3' });
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };
      
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const reader = new FileReader();
        reader.onload = () => {
          store.put(reader.result, 'database');
          console.log('💾 Base de datos guardada en IndexedDB');
          resolve();
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
      };
    });
  } catch (err) {
    console.error('Error guardando en IndexedDB:', err);
  }
};

// Cargar base de datos desde IndexedDB
const loadFromIndexedDB = async () => {
  try {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };
      
      request.onsuccess = () => {
        const database = request.result;
        
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          resolve(null);
          return;
        }
        
        const transaction = database.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get('database');
        
        getRequest.onsuccess = () => {
          if (getRequest.result) {
            resolve(getRequest.result);
          } else {
            resolve(null);
          }
        };
        
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  } catch (err) {
    console.error('Error cargando de IndexedDB:', err);
    return null;
  }
};

// ============================================
// INICIALIZACIÓN
// ============================================

// Inicializar base de datos SQLite
export const initDatabase = async () => {
  if (globalThis.__gct_initialized && db) {
    console.log('📦 Usando instancia SQLite existente');
    return db;
  }
  
  SQL = await initSqlJs({
    locateFile: file => `/sql-wasm.wasm`
  });
  
  // Intentar cargar desde IndexedDB
  const savedData = await loadFromIndexedDB();
  
  if (savedData) {
    // Cargar base de datos existente
    const uint8Array = new Uint8Array(savedData);
    db = new SQL.Database(uint8Array);
    console.log('📂 Base de datos cargada desde IndexedDB');
  } else {
    // Crear nueva base de datos
    db = new SQL.Database();
    
    // Crear tablas
    createTables();
    
    // Insertar datos de ejemplo
    insertSampleData();
    
    // Guardar inicial
    await saveToIndexedDB();
    
    console.log('✅ Nueva base de datos SQLite creada');
  }
  
  // Guardar en global
  globalThis.__gct_db = db;
  globalThis.__gct_sql = SQL;
  globalThis.__gct_initialized = true;
  
  return db;
};

// Auto-guardado después de cada operación
const autoSave = async () => {
  await saveToIndexedDB();
};

// Crear tablas
const createTables = () => {
  const db = globalThis.__gct_db;
  
  // Tabla de áreas
  db.run(`
    CREATE TABLE IF NOT EXISTS datos_area (
      id_area INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_area TEXT NOT NULL,
      descripcion TEXT,
      estado TEXT DEFAULT 'ACTIVO'
    )
  `);

  // Tabla de cargos
  db.run(`
    CREATE TABLE IF NOT EXISTS datos_cargo (
      id_cargo INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre_cargo TEXT NOT NULL,
      descripcion TEXT,
      estado TEXT DEFAULT 'ACTIVO'
    )
  `);

  // Tabla de empleados
  db.run(`
    CREATE TABLE IF NOT EXISTS datos_empleado (
      id_empleado INTEGER PRIMARY KEY AUTOINCREMENT,
      primer_nombre TEXT NOT NULL,
      segundo_nombre TEXT,
      primer_apellido TEXT NOT NULL,
      segundo_apellido TEXT,
      correo_corporativo TEXT UNIQUE,
      telefono TEXT,
      direccion TEXT,
      fecha_ingreso DATE,
      estado TEXT DEFAULT 'ACTIVA',
      area_id INTEGER,
      cargo_id INTEGER,
      id_permisos INTEGER DEFAULT 3,
      auth_id TEXT,
      FOREIGN KEY (area_id) REFERENCES datos_area(id_area),
      FOREIGN KEY (cargo_id) REFERENCES datos_cargo(id_cargo)
    )
  `);

  // Tabla de tareas del calendario
  db.run(`
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

  // Tabla de superadmins
  db.run(`
    CREATE TABLE IF NOT EXISTS super_admins (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      nombre TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Trigger para actualizar fecha_actualizacion
  db.run(`
    CREATE TRIGGER IF NOT EXISTS update_tareas_updated_at 
    AFTER UPDATE ON tareas_calendario
    BEGIN
      UPDATE tareas_calendario SET fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `);
};

// Insertar datos de ejemplo
const insertSampleData = () => {
  const db = globalThis.__gct_db;
  
  console.log('📝 Insertando datos de ejemplo...');
  
  // Áreas
  const areas = [
    ['Revisoría Fiscal', 'Revisión fiscal y auditoría'],
    ['Contabilidad', 'Servicios contables'],
    ['BPO', 'Business Process Outsourcing'],
    ['Legal', 'Servicios legales'],
    ['Impuestos', 'Asesoría tributaria'],
    ['Administración', 'Gestión administrativa'],
    ['Financiera', 'Servicios financieros']
  ];
  
  areas.forEach(area => {
    db.run('INSERT OR IGNORE INTO datos_area (nombre_area, descripcion) VALUES (?, ?)', area);
  });

  // Cargos
  const cargos = [
    ['Revisor Fiscal', 'Revisor fiscal titular'],
    ['Contador', 'Contador general'],
    ['Analista BPO', 'Analista de procesos'],
    ['Abogado', 'Abogado corporativo'],
    ['Asesor Tributario', 'Asesor en impuestos'],
    ['Administrador', 'Administrador general'],
    ['Analista Financiero', 'Analista financiero'],
    ['Gerente', 'Gerente de área'],
    ['Director', 'Director de departamento']
  ];
  
  cargos.forEach(cargo => {
    db.run('INSERT OR IGNORE INTO datos_cargo (nombre_cargo, descripcion) VALUES (?, ?)', cargo);
  });

  // Empleados de ejemplo
  const empleados = [
    ['Juan', 'Carlos', 'Pérez', 'Gómez', 'juan.perez@russellbedford.com.co', '2024-01-15', 'ACTIVA', 1, 1, 1, 'ba1cd7e7-d5f6-4490-ba98-476d934ab576'],
    ['María', 'Elena', 'Rodríguez', 'Torres', 'maria.rodriguez@russellbedford.com.co', '2024-02-01', 'ACTIVA', 2, 2, 2, null],
    ['Pedro', 'Antonio', 'García', 'López', 'pedro.garcia@russellbedford.com.co', '2024-03-10', 'ACTIVA', 3, 3, 3, null],
    ['Ana', 'Lucía', 'Martínez', 'Sosa', 'ana.martinez@russellbedford.com.co', '2024-01-20', 'ACTIVA', 4, 4, 3, null],
    ['Carlos', 'Alberto', 'Sánchez', 'Ruiz', 'carlos.sanchez@russellbedford.com.co', '2024-02-15', 'ACTIVA', 5, 5, 3, null]
  ];
  
  empleados.forEach(emp => {
    db.run(`
      INSERT OR IGNORE INTO datos_empleado 
      (primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo_corporativo, 
       fecha_ingreso, estado, area_id, cargo_id, id_permisos, auth_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, emp);
  });

  // Superadmin de ejemplo
  console.log('👤 Insertando superadmin...');
  db.run(`
    INSERT OR IGNORE INTO super_admins (id, email, nombre) 
    VALUES ('1233c9d3-b99f-475b-a754-e61c42e313b5', 'test-admin@rbcol.co', 'Administrador Principal')
  `);
  
  // Verificar que se insertó
  const superadminCheck = query('SELECT * FROM super_admins');
  console.log('✅ Superadmins en BD:', superadminCheck);

  // Tareas de ejemplo
  const hoy = new Date();
  const fecha1 = new Date(hoy);
  fecha1.setDate(hoy.getDate() + 5);
  const fecha2 = new Date(hoy);
  fecha2.setDate(hoy.getDate() + 10);
  const fecha3 = new Date(hoy);
  fecha3.setDate(hoy.getDate() - 2);

  const tareas = [
    ['Revisión de estados financieros Q1', 'Revisar y aprobar estados financieros del primer trimestre', 1, 1, 'alta', fecha1.toISOString().split('T')[0], 'pendiente'],
    ['Cierre mensual de nómina', 'Procesar cierre de nómina correspondiente al mes', 2, 2, 'alta', fecha2.toISOString().split('T')[0], 'en_proceso'],
    ['Auditoría interna de procesos BPO', 'Realizar auditoría de calidad en procesos outsourcing', 3, 3, 'media', fecha3.toISOString().split('T')[0], 'pendiente'],
    ['Actualización de políticas legales', 'Revisar y actualizar políticas de cumplimiento legal', 4, 4, 'baja', fecha1.toISOString().split('T')[0], 'completada'],
    ['Declaración de renta corporativa', 'Preparar y presentar declaración de renta', 5, 5, 'alta', fecha2.toISOString().split('T')[0], 'pendiente']
  ];
  
  tareas.forEach(tarea => {
    db.run(`
      INSERT OR IGNORE INTO tareas_calendario 
      (titulo, descripcion, id_area, id_empleado, prioridad, fecha_vencimiento, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, tarea);
  });
};

// Funciones de consulta
export const query = (sql, params = []) => {
  const db = globalThis.__gct_db;
  if (!db) throw new Error('Database not initialized');
  
  const stmt = db.prepare(sql);
  const results = [];
  
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  
  stmt.free();
  return results;
};

// Función de ejecución (INSERT, UPDATE, DELETE)
export const execute = (sql, params = []) => {
  const db = globalThis.__gct_db;
  if (!db) throw new Error('Database not initialized');
  
  db.run(sql, params);
  
  // Obtener el último ID insertado
  const result = query('SELECT last_insert_rowid() as id');
  return result[0]?.id;
};

// Obtener empleado por ID
export const getEmpleadoById = (id) => {
  const results = query(`
    SELECT e.*, a.nombre_area, c.nombre_cargo 
    FROM datos_empleado e
    LEFT JOIN datos_area a ON e.area_id = a.id_area
    LEFT JOIN datos_cargo c ON e.cargo_id = c.id_cargo
    WHERE e.id_empleado = ?
  `, [id]);
  
  return results[0] || null;
};

// Obtener empleado por auth_id
export const getEmpleadoByAuthId = (authId) => {
  const results = query(`
    SELECT e.*, a.nombre_area, c.nombre_cargo 
    FROM datos_empleado e
    LEFT JOIN datos_area a ON e.area_id = a.id_area
    LEFT JOIN datos_cargo c ON e.cargo_id = c.id_cargo
    WHERE e.auth_id = ?
  `, [authId]);
  
  return results[0] || null;
};

// Obtener empleado por email
export const getEmpleadoByEmail = (email) => {
  const results = query(`
    SELECT e.*, a.nombre_area, c.nombre_cargo 
    FROM datos_empleado e
    LEFT JOIN datos_area a ON e.area_id = a.id_area
    LEFT JOIN datos_cargo c ON e.cargo_id = c.id_cargo
    WHERE e.correo_corporativo = ?
  `, [email]);
  
  return results[0] || null;
};

// Verificar superadmin por ID
export const isSuperAdmin = (id) => {
  const results = query('SELECT * FROM super_admins WHERE id = ?', [id]);
  return results.length > 0 ? results[0] : null;
};

// Verificar superadmin por email
export const getSuperAdminByEmail = (email) => {
  console.log('🔍 Buscando superadmin por email:', email);
  console.log('📊 Estado de db:', db ? 'Inicializada' : 'No inicializada');
  
  try {
    const results = query('SELECT * FROM super_admins WHERE email = ?', [email]);
    console.log('📋 Resultados superadmin:', results);
    return results.length > 0 ? results[0] : null;
  } catch (err) {
    console.error('❌ Error consultando superadmin:', err);
    return null;
  }
};

// Obtener todas las tareas
export const getAllTareas = () => {
  return query(`
    SELECT t.*, e.primer_nombre, e.primer_apellido, a.nombre_area
    FROM tareas_calendario t
    LEFT JOIN datos_empleado e ON t.id_empleado = e.id_empleado
    LEFT JOIN datos_area a ON t.id_area = a.id_area
    ORDER BY t.fecha_vencimiento ASC
  `);
};

// Obtener tareas por empleado
export const getTareasByEmpleado = (idEmpleado) => {
  return query(`
    SELECT t.*, a.nombre_area
    FROM tareas_calendario t
    LEFT JOIN datos_area a ON t.id_area = a.id_area
    WHERE t.id_empleado = ?
    ORDER BY t.fecha_vencimiento ASC
  `, [idEmpleado]);
};

// Obtener todas las áreas
export const getAllAreas = () => {
  return query('SELECT * FROM datos_area WHERE estado = "ACTIVO" ORDER BY nombre_area');
};

// Obtener todos los empleados
export const getAllEmpleados = () => {
  return query(`
    SELECT e.*, a.nombre_area, c.nombre_cargo 
    FROM datos_empleado e
    LEFT JOIN datos_area a ON e.area_id = a.id_area
    LEFT JOIN datos_cargo c ON e.cargo_id = c.id_cargo
    WHERE e.estado = "ACTIVA"
    ORDER BY e.primer_apellido, e.primer_nombre
  `);
};

// Obtener todos los cargos
export const getAllCargos = () => {
  return query('SELECT * FROM datos_cargo WHERE estado = "ACTIVO" ORDER BY nombre_cargo');
};

// ============================================
// EXPORTAR/IMPORTAR ARCHIVO SQLITE
// ============================================

// Exportar base de datos como archivo .db para descargar
export const exportDatabase = () => {
  const db = globalThis.__gct_db;
  if (!db) throw new Error('Database not initialized');
  
  const data = db.export();
  const blob = new Blob([data], { type: 'application/x-sqlite3' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `rbgct_backup_${new Date().toISOString().split('T')[0]}.db`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('📥 Base de datos exportada');
};

// Importar base de datos desde archivo .db
export const importDatabase = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Crear nueva base de datos con los datos importados
        const SQL = globalThis.__gct_sql;
        const newDb = new SQL.Database(uint8Array);
        
        // Reemplazar la base de datos actual
        globalThis.__gct_db = newDb;
        db = newDb;
        
        // Guardar en IndexedDB
        await saveToIndexedDB();
        
        console.log('📤 Base de datos importada correctamente');
        resolve(true);
      } catch (err) {
        console.error('Error importando base de datos:', err);
        reject(err);
      }
    };
    
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};

// ============================================
// FUNCIONES CRUD CON AUTOSAVE
// ============================================

// Crear área con auto-guardado
export const createArea = async (data) => {
  const db = globalThis.__gct_db;
  db.run(`
    INSERT INTO datos_area (nombre_area, descripcion, estado)
    VALUES (?, ?, 'ACTIVO')
  `, [data.nombre_area, data.descripcion]);
  
  const result = query('SELECT last_insert_rowid() as id');
  await autoSave();
  return result[0]?.id;
};

// Crear cargo con auto-guardado
export const createCargo = async (data) => {
  const db = globalThis.__gct_db;
  db.run(`
    INSERT INTO datos_cargo (nombre_cargo, descripcion, estado)
    VALUES (?, ?, 'ACTIVO')
  `, [data.nombre_cargo, data.descripcion]);
  
  const result = query('SELECT last_insert_rowid() as id');
  await autoSave();
  return result[0]?.id;
};

// Crear empleado con auto-guardado
export const createEmpleado = async (data) => {
  const db = globalThis.__gct_db;
  db.run(`
    INSERT INTO datos_empleado (
      tipo_documento, documento, primer_nombre, segundo_nombre,
      primer_apellido, segundo_apellido, fecha_nacimiento, direccion,
      telefono, correo_corporativo, correo_personal, fecha_ingreso,
      estado, area_id, cargo_id, id_permisos, eps, pension, cesantias,
      caja_compensacion, contacto_emergencia_nombre, contacto_emergencia_telefono
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVA', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.tipo_documento, data.documento, data.primer_nombre, data.segundo_nombre,
    data.primer_apellido, data.segundo_apellido, data.fecha_nacimiento, data.direccion,
    data.telefono, data.correo_corporativo, data.correo_personal, data.fecha_ingreso,
    data.area_id, data.cargo_id, data.id_permisos || 3, data.eps, data.pension,
    data.cesantias, data.caja_compensacion, data.contacto_emergencia_nombre,
    data.contacto_emergencia_telefono
  ]);
  
  const result = query('SELECT last_insert_rowid() as id');
  await autoSave();
  return result[0]?.id;
};

// Actualizar empleado con auto-guardado
export const updateEmpleado = async (id, data) => {
  const db = globalThis.__gct_db;
  const fields = Object.keys(data);
  const values = Object.values(data);
  
  const setClause = fields.map(field => `${field} = ?`).join(', ');
  
  db.run(`UPDATE datos_empleado SET ${setClause} WHERE id_empleado = ?`, [...values, id]);
  await autoSave();
  return true;
};

// Crear tarea con auto-guardado
export const createTarea = async (data) => {
  const db = globalThis.__gct_db;
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO tareas_calendario (
      titulo, descripcion, id_area, id_empleado, prioridad,
      fecha_vencimiento, asignado_a, estado, creado_por,
      fecha_creacion, fecha_actualizacion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.titulo, data.descripcion, data.id_area, data.id_empleado,
    data.prioridad || 'media', data.fecha_vencimiento, data.asignado_a,
    data.estado || 'pendiente', data.creado_por, now, now
  ]);
  
  const result = query('SELECT last_insert_rowid() as id');
  await autoSave();
  return result[0]?.id;
};

// Actualizar estado tarea con auto-guardado
export const updateTareaEstado = async (id, estado) => {
  const db = globalThis.__gct_db;
  const now = new Date().toISOString();
  
  db.run(`
    UPDATE tareas_calendario 
    SET estado = ?, fecha_actualizacion = ? 
    WHERE id = ?
  `, [estado, now, id]);
  
  await autoSave();
  return true;
};

// Eliminar tarea con auto-guardado
export const deleteTarea = async (id) => {
  const db = globalThis.__gct_db;
  db.run('DELETE FROM tareas_calendario WHERE id = ?', [id]);
  await autoSave();
  return true;
};

// Resetear base de datos (borrar todo y volver a crear)
export const resetDatabase = async () => {
  const SQL = globalThis.__gct_sql;
  const newDb = new SQL.Database();
  
  globalThis.__gct_db = newDb;
  db = newDb;
  
  createTables();
  insertSampleData();
  await saveToIndexedDB();
  
  console.log('🔄 Base de datos reseteada');
  return true;
};

export default {
  initDatabase,
  query,
  execute,
  getEmpleadoById,
  getEmpleadoByAuthId,
  getEmpleadoByEmail,
  isSuperAdmin,
  getAllTareas,
  getTareasByEmpleado,
  getAllAreas,
  getAllEmpleados,
  getAllCargos,
  createArea,
  createCargo,
  createEmpleado,
  updateEmpleado,
  createTarea,
  updateTareaEstado,
  deleteTarea,
  exportDatabase,
  importDatabase,
  resetDatabase
};
