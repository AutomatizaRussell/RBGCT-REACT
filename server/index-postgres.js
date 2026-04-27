import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool, { initDatabase, insertSampleData } from './database-postgres.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Helper para ejecutar queries
async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// ============================================
// API TAREAS
// ============================================

// Obtener todas las tareas
app.get('/api/tareas', async (req, res) => {
  try {
    const { empleado_id } = req.query;
    
    let sql = `
      SELECT t.*, e.primer_nombre, e.primer_apellido, a.nombre_area
      FROM tareas_calendario t
      LEFT JOIN datos_empleado e ON t.id_empleado = e.id_empleado
      LEFT JOIN datos_area a ON t.id_area = a.id_area
    `;
    
    let params = [];
    
    if (empleado_id) {
      sql += ' WHERE t.id_empleado = $1';
      params.push(empleado_id);
    }
    
    sql += ' ORDER BY t.fecha_vencimiento ASC';
    
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo tareas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener tarea por ID
app.get('/api/tareas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT t.*, e.primer_nombre, e.primer_apellido, a.nombre_area
      FROM tareas_calendario t
      LEFT JOIN datos_empleado e ON t.id_empleado = e.id_empleado
      LEFT JOIN datos_area a ON t.id_area = a.id_area
      WHERE t.id = $1
    `, [id]);
    
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear tarea
app.post('/api/tareas', async (req, res) => {
  try {
    const { titulo, descripcion, id_area, id_empleado, prioridad, fecha_vencimiento, asignado_a, estado, creado_por } = req.body;
    
    console.log('Creando tarea:', { titulo, descripcion, id_area, id_empleado, prioridad, fecha_vencimiento, asignado_a, estado, creado_por });
    
    const areaId = id_area && id_area > 0 ? id_area : null;
    const empleadoId = id_empleado && id_empleado > 0 ? id_empleado : null;
    
    const result = await query(`
      INSERT INTO tareas_calendario 
      (titulo, descripcion, id_area, id_empleado, prioridad, fecha_vencimiento, asignado_a, estado, creado_por)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [titulo, descripcion, areaId, empleadoId, prioridad, fecha_vencimiento, asignado_a || '', estado || 'pendiente', creado_por]);
    
    res.status(201).json({ id: result.rows[0].id, message: 'Tarea creada' });
  } catch (error) {
    console.error('Error creando tarea:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar tarea
app.put('/api/tareas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const campos = req.body;
    
    const camposValidos = ['titulo', 'descripcion', 'id_area', 'id_empleado', 'prioridad', 'fecha_vencimiento', 'estado', 'asignado_a'];
    const actualizaciones = [];
    const valores = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(campos)) {
      if (camposValidos.includes(key)) {
        actualizaciones.push(`${key} = $${paramIndex}`);
        valores.push(value);
        paramIndex++;
      }
    }
    
    if (actualizaciones.length === 0) {
      return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
    }
    
    valores.push(id);
    const sql = `UPDATE tareas_calendario SET ${actualizaciones.join(', ')}, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await query(sql, valores);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    
    res.json({ message: 'Tarea actualizada', tarea: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar tarea
app.delete('/api/tareas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM tareas_calendario WHERE id = $1', [id]);
    res.json({ message: 'Tarea eliminada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API EMPLEADOS
// ============================================

// Obtener todos los empleados
app.get('/api/empleados', async (req, res) => {
  try {
    const result = await query(`
      SELECT e.*, a.nombre_area, c.nombre_cargo
      FROM datos_empleado e
      LEFT JOIN datos_area a ON e.area_id = a.id_area
      LEFT JOIN datos_cargo c ON e.cargo_id = c.id_cargo
      ORDER BY e.estado DESC, e.primer_apellido, e.primer_nombre
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener empleado por email
app.get('/api/empleados/by-email', async (req, res) => {
  try {
    const { email } = req.query;
    console.log('Buscando empleado por email:', email);
    
    if (!email) {
      return res.status(400).json({ error: 'Email requerido' });
    }
    
    const result = await query(`
      SELECT e.*, a.nombre_area, c.nombre_cargo
      FROM datos_empleado e
      LEFT JOIN datos_area a ON e.area_id = a.id_area
      LEFT JOIN datos_cargo c ON e.cargo_id = c.id_cargo
      WHERE e.correo_corporativo = $1 AND e.estado = 'ACTIVA'
    `, [email]);
    
    console.log('Resultado empleado:', result.rows[0] ? 'Encontrado' : 'No encontrado');
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error buscando empleado:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener empleado por ID
app.get('/api/empleados/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT e.*, a.nombre_area, c.nombre_cargo
      FROM datos_empleado e
      LEFT JOIN datos_area a ON e.area_id = a.id_area
      LEFT JOIN datos_cargo c ON e.cargo_id = c.id_cargo
      WHERE e.id_empleado = $1 AND e.estado = 'ACTIVA'
    `, [id]);
    
    res.json(result.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear empleado
app.post('/api/empleados', async (req, res) => {
  try {
    const campos = Object.keys(req.body);
    const valores = Object.values(req.body);
    const placeholders = campos.map((_, i) => `$${i + 1}`).join(', ');
    
    const result = await query(`
      INSERT INTO datos_empleado (${campos.join(', ')}) 
      VALUES (${placeholders}) 
      RETURNING id_empleado
    `, valores);
    
    res.status(201).json({ id: result.rows[0].id_empleado, message: 'Empleado creado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar empleado
app.put('/api/empleados/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const campos = req.body;
    
    const camposValidos = ['primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido', 
                          'correo_corporativo', 'correo_personal', 'telefono', 'area_id', 'cargo_id', 
                          'id_permisos', 'estado', 'fecha_nacimiento', 'fecha_ingreso', 'direccion'];
    
    const actualizaciones = [];
    const valores = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(campos)) {
      if (camposValidos.includes(key)) {
        actualizaciones.push(`${key} = $${paramIndex}`);
        valores.push(value);
        paramIndex++;
      }
    }
    
    if (actualizaciones.length === 0) {
      return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
    }
    
    valores.push(id);
    const sql = `UPDATE datos_empleado SET ${actualizaciones.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id_empleado = $${paramIndex} RETURNING *`;
    
    const result = await query(sql, valores);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    
    res.json({ message: 'Empleado actualizado', empleado: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar empleado
app.delete('/api/empleados/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM datos_empleado WHERE id_empleado = $1', [id]);
    res.json({ message: 'Empleado eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API AREAS
// ============================================

app.get('/api/areas', async (req, res) => {
  try {
    const result = await query('SELECT * FROM datos_area ORDER BY nombre_area');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API CARGOS
// ============================================

app.get('/api/cargos', async (req, res) => {
  try {
    const result = await query('SELECT * FROM datos_cargo ORDER BY nombre_cargo');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// API SUPERADMINS
// ============================================

app.get('/api/superadmins', async (req, res) => {
  try {
    const { email } = req.query;
    console.log('Buscando superadmin por email:', email);
    
    if (email) {
      const result = await query('SELECT * FROM superadmin WHERE email = $1', [email]);
      console.log('Resultado superadmin:', result.rows[0] ? 'Encontrado' : 'No encontrado');
      return res.json(result.rows[0] || null);
    }
    
    const result = await query('SELECT * FROM superadmin');
    res.json(result.rows);
  } catch (error) {
    console.error('Error buscando superadmin:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INICIALIZACIÓN
// ============================================

async function startServer() {
  try {
    // Inicializar base de datos
    await initDatabase();
    await insertSampleData();
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor API PostgreSQL corriendo en http://localhost:${PORT}`);
      console.log(`📊 Base de datos: PostgreSQL`);
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
}

startServer();
