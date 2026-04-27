import express from 'express';
import cors from 'cors';
import db from './database.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ============================================
// API TAREAS
// ============================================

// Obtener todas las tareas (con filtro opcional por empleado_id)
app.get('/api/tareas', (req, res) => {
  try {
    const { empleado_id } = req.query;
    
    let query = `
      SELECT t.*, e.primer_nombre, e.primer_apellido, a.nombre_area
      FROM tareas_calendario t
      LEFT JOIN datos_empleado e ON t.id_empleado = e.id_empleado
      LEFT JOIN datos_area a ON t.id_area = a.id_area
    `;
    
    let params = [];
    
    if (empleado_id) {
      query += ' WHERE t.id_empleado = ?';
      params.push(empleado_id);
    }
    
    query += ' ORDER BY t.fecha_vencimiento ASC';
    
    const tareas = db.prepare(query).all(...params);
    res.json(tareas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener tarea por ID
app.get('/api/tareas/:id', (req, res) => {
  try {
    const tarea = db.prepare('SELECT * FROM tareas_calendario WHERE id = ?').get(req.params.id);
    if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(tarea);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear tarea
app.post('/api/tareas', (req, res) => {
  try {
    const { titulo, descripcion, id_area, id_empleado, prioridad, fecha_vencimiento, asignado_a, estado, creado_por } = req.body;
    
    console.log('Creando tarea:', { titulo, descripcion, id_area, id_empleado, prioridad, fecha_vencimiento, asignado_a, estado, creado_por });
    
    // Si id_area o id_empleado no son válidos, usar null
    const areaId = id_area && id_area > 0 ? id_area : null;
    const empleadoId = id_empleado && id_empleado > 0 ? id_empleado : null;
    
    const result = db.prepare(`
      INSERT INTO tareas_calendario 
      (titulo, descripcion, id_area, id_empleado, prioridad, fecha_vencimiento, asignado_a, estado, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(titulo, descripcion, areaId, empleadoId, prioridad, fecha_vencimiento, asignado_a || '', estado || 'pendiente', creado_por);
    
    res.status(201).json({ id: result.lastInsertRowid, message: 'Tarea creada' });
  } catch (error) {
    console.error('Error creando tarea:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar tarea completa
app.put('/api/tareas/:id', (req, res) => {
  try {
    const { titulo, descripcion, id_area, id_empleado, prioridad, fecha_vencimiento, asignado_a, estado } = req.body;
    
    // Construir query dinámica según qué campos se envíen
    const campos = [];
    const valores = [];
    
    if (titulo !== undefined) { campos.push('titulo = ?'); valores.push(titulo); }
    if (descripcion !== undefined) { campos.push('descripcion = ?'); valores.push(descripcion); }
    if (id_area !== undefined) { campos.push('id_area = ?'); valores.push(id_area); }
    if (id_empleado !== undefined) { campos.push('id_empleado = ?'); valores.push(id_empleado); }
    if (prioridad !== undefined) { campos.push('prioridad = ?'); valores.push(prioridad); }
    if (fecha_vencimiento !== undefined) { campos.push('fecha_vencimiento = ?'); valores.push(fecha_vencimiento); }
    if (asignado_a !== undefined) { campos.push('asignado_a = ?'); valores.push(asignado_a); }
    if (estado !== undefined) { campos.push('estado = ?'); valores.push(estado); }
    
    if (campos.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    
    valores.push(req.params.id);
    db.prepare(`UPDATE tareas_calendario SET ${campos.join(', ')} WHERE id = ?`).run(...valores);
    
    res.json({ message: 'Tarea actualizada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar tarea
app.delete('/api/tareas/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM tareas_calendario WHERE id = ?').run(req.params.id);
    res.json({ message: 'Tarea eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API EMPLEADOS
// ============================================

// Obtener todos los empleados (activos e inactivos)
app.get('/api/empleados', (req, res) => {
  try {
    const empleados = db.prepare(`
      SELECT e.*, a.nombre_area, c.nombre_cargo
      FROM datos_empleado e
      LEFT JOIN datos_area a ON e.area_id = a.id_area
      LEFT JOIN datos_cargo c ON e.cargo_id = c.id_cargo
      ORDER BY e.estado DESC, e.primer_apellido, e.primer_nombre
    `).all();
    res.json(empleados);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener empleado por email (DEBE ir antes de /:id para que Express no lo interprete como ID)
app.get('/api/empleados/by-email', (req, res) => {
  try {
    const { email } = req.query;
    console.log('Buscando empleado por email:', email);
    
    if (!email) {
      return res.status(400).json({ error: 'Email requerido' });
    }
    
    const empleado = db.prepare(`
      SELECT e.*, a.nombre_area, c.nombre_cargo
      FROM datos_empleado e
      LEFT JOIN datos_area a ON e.area_id = a.id_area
      LEFT JOIN datos_cargo c ON e.cargo_id = c.id_cargo
      WHERE e.correo_corporativo = ? AND e.estado = 'ACTIVA'
    `).get(email);
    
    console.log('Resultado empleado:', empleado ? 'Encontrado' : 'No encontrado');
    
    // Devolver null si no existe (consistente con superadmins)
    res.json(empleado || null);
  } catch (error) {
    console.error('Error buscando empleado:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener empleado por ID (debe ir DESPUÉS de las rutas específicas como /by-email)
app.get('/api/empleados/:id', (req, res) => {
  try {
    const empleado = db.prepare(`
      SELECT e.*, a.nombre_area, c.nombre_cargo
      FROM datos_empleado e
      LEFT JOIN datos_area a ON e.area_id = a.id_area
      LEFT JOIN datos_cargo c ON e.cargo_id = c.id_cargo
      WHERE e.id_empleado = ? AND e.estado = 'ACTIVA'
    `).get(req.params.id);
    
    // Devolver null si no existe
    res.json(empleado || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear empleado
app.post('/api/empleados', (req, res) => {
  try {
    const campos = Object.keys(req.body);
    const valores = Object.values(req.body);
    const placeholders = campos.map(() => '?').join(', ');
    
    const result = db.prepare(`
      INSERT INTO datos_empleado (${campos.join(', ')}) VALUES (${placeholders})
    `).run(...valores);
    
    res.status(201).json({ id: result.lastInsertRowid, message: 'Empleado creado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar empleado
app.put('/api/empleados/:id', (req, res) => {
  try {
    const campos = Object.keys(req.body);
    const valores = Object.values(req.body);
    
    const setClause = campos.map(campo => `${campo} = ?`).join(', ');
    
    db.prepare(`
      UPDATE datos_empleado SET ${setClause} WHERE id_empleado = ?
    `).run(...valores, req.params.id);
    
    res.json({ message: 'Empleado actualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API AREAS
// ============================================

app.get('/api/areas', (req, res) => {
  try {
    const areas = db.prepare("SELECT * FROM datos_area WHERE estado = 'ACTIVO' ORDER BY nombre_area").all();
    res.json(areas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/areas', (req, res) => {
  try {
    const { nombre_area, descripcion } = req.body;
    const result = db.prepare("INSERT INTO datos_area (nombre_area, descripcion) VALUES (?, ?)").run(nombre_area, descripcion);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Área creada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API CARGOS
// ============================================

app.get('/api/cargos', (req, res) => {
  try {
    const cargos = db.prepare("SELECT * FROM datos_cargo WHERE estado = 'ACTIVO' ORDER BY nombre_cargo").all();
    res.json(cargos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API SUPERADMINS
// ============================================

app.get('/api/superadmins', (req, res) => {
  try {
    const { email } = req.query;
    console.log('Buscando superadmin por email:', email);
    
    if (!email) {
      console.log('Error: Email no proporcionado');
      return res.status(400).json({ error: 'Email requerido' });
    }
    
    const superadmin = db.prepare("SELECT * FROM super_admins WHERE email = ?").get(email);
    console.log('Resultado superadmin:', superadmin ? 'Encontrado' : 'No encontrado');
    
    // Devolver null si no existe (no un error)
    res.json(superadmin || null);
  } catch (error) {
    console.error('Error buscando superadmin:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', database: 'SQLite', timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor API corriendo en http://localhost:${PORT}`);
  console.log(`📊 Base de datos: data/rbgct.db`);
});

// Manejar errores y mantener el servidor vivo
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});
