import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configuración de conexión PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'rbgct',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  // Configuración para producción
  max: 20, // máximo de conexiones
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Verificar conexión
pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

// Función para inicializar la base de datos
export async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('✅ Conectado a PostgreSQL');
    
    // Crear extensiones necesarias
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    
    // ============================================
    // TABLA: datos_area
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS datos_area (
        id_area SERIAL PRIMARY KEY,
        nombre_area VARCHAR(100) NOT NULL,
        descripcion VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // ============================================
    // TABLA: datos_cargo
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS datos_cargo (
        id_cargo SERIAL PRIMARY KEY,
        nombre_cargo VARCHAR(100) NOT NULL,
        nivel VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // ============================================
    // TABLA: superadmin
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS superadmin (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'superadmin',
        estado VARCHAR(20) DEFAULT 'ACTIVA',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      )
    `);
    
    // ============================================
    // TABLA: datos_empleado
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS datos_empleado (
        id_empleado SERIAL PRIMARY KEY,
        auth_id UUID,
        primer_nombre VARCHAR(100) NOT NULL,
        segundo_nombre VARCHAR(100),
        primer_apellido VARCHAR(100) NOT NULL,
        segundo_apellido VARCHAR(100),
        correo_corporativo VARCHAR(255) UNIQUE NOT NULL,
        correo_personal VARCHAR(255),
        telefono VARCHAR(20),
        telefono_emergencia VARCHAR(20),
        area_id INTEGER REFERENCES datos_area(id_area) ON DELETE SET NULL,
        cargo_id INTEGER REFERENCES datos_cargo(id_cargo) ON DELETE SET NULL,
        id_permisos INTEGER DEFAULT 3,
        estado VARCHAR(20) DEFAULT 'ACTIVA',
        fecha_nacimiento DATE,
        fecha_ingreso DATE,
        direccion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // ============================================
    // TABLA: tareas_calendario
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS tareas_calendario (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        descripcion TEXT,
        id_area INTEGER REFERENCES datos_area(id_area) ON DELETE SET NULL,
        id_empleado INTEGER REFERENCES datos_empleado(id_empleado) ON DELETE SET NULL,
        prioridad VARCHAR(20) DEFAULT 'media',
        fecha_vencimiento DATE,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        asignado_a VARCHAR(255),
        estado VARCHAR(20) DEFAULT 'pendiente',
        creado_por UUID
      )
    `);
    
    // ============================================
    // TABLA: solicitudes_password
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS solicitudes_password (
        id SERIAL PRIMARY KEY,
        id_empleado INTEGER REFERENCES datos_empleado(id_empleado) ON DELETE CASCADE,
        fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        leida BOOLEAN DEFAULT FALSE,
        atendida BOOLEAN DEFAULT FALSE
      )
    `);
    
    console.log('✅ Tablas PostgreSQL creadas/verificadas');
    
  } catch (error) {
    console.error('❌ Error inicializando PostgreSQL:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Función para insertar datos de ejemplo
export async function insertSampleData() {
  const client = await pool.connect();
  try {
    // Verificar si ya hay datos
    const { rows: existingAreas } = await client.query('SELECT COUNT(*) FROM datos_area');
    if (parseInt(existingAreas[0].count) > 0) {
      console.log('✅ Datos de ejemplo ya existen en PostgreSQL');
      return;
    }
    
    // Insertar áreas
    await client.query(`
      INSERT INTO datos_area (nombre_area, descripcion) VALUES
      ('Auditoría y Revisoría Fiscal', 'Auditoría externa e interna'),
      ('Outsourcing Contable y Tributario', 'Servicios de outsourcing'),
      ('Consultoría Empresarial BPO', 'Consultoría y BPO'),
      ('Consultoría en Comercio Exterior', 'Comercio internacional'),
      ('Gestión de Riesgos y Control Interno', 'Riesgos y control interno'),
      ('Jurídica', 'Asesoría legal'),
      ('Tecnología', 'Desarrollo y sistemas'),
      ('Recursos Humanos', 'Gestión humana'),
      ('Marketing', 'Marketing y comunicaciones')
    `);
    
    // Insertar cargos
    await client.query(`
      INSERT INTO datos_cargo (nombre_cargo, nivel) VALUES
      ('Socio Director', 'Directivo'),
      ('Gerente', 'Gerencia'),
      ('Supervisor Senior', 'Supervisión'),
      ('Supervisor', 'Supervisión'),
      ('Consultor Senior', 'Consultoría'),
      ('Consultor', 'Consultoría'),
      ('Analista', 'Operativo'),
      ('Asistente', 'Operativo'),
      ('Pasante', 'Trainee')
    `);
    
    // Insertar superadmins
    await client.query(`
      INSERT INTO superadmin (id, email, password_hash, nombre, apellido, role, estado) VALUES
      ('1233c9d3-b99f-475b-a754-e61c42e313b5', 'test-admin@rbcol.co', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test', 'Admin', 'superadmin', 'ACTIVA'),
      ('1234c9d3-b99f-475b-a754-e61c42e313b6', 'juan.perez@russellbedford.com.co', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Juan', 'Pérez', 'superadmin', 'ACTIVA')
    `);
    
    // Insertar empleados de ejemplo
    await client.query(`
      INSERT INTO datos_empleado 
      (primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo_corporativo, telefono, area_id, cargo_id, id_permisos, estado, fecha_ingreso)
      VALUES
      ('María', 'Elena', 'Rodríguez', 'Gómez', 'maria.rodriguez@russellbedford.com.co', '3001234567', 1, 2, 1, 'ACTIVA', '2024-01-15'),
      ('Carlos', 'Andrés', 'Martínez', 'López', 'carlos.martinez@russellbedford.com.co', '3007654321', 2, 3, 3, 'INACTIVO', '2023-06-20'),
      ('Ana', 'Lucía', 'Fernández', 'Silva', 'ana.fernandez@russellbedford.com.co', '3019876543', 3, 4, 2, 'ACTIVA', '2024-03-01'),
      ('Pedro', 'José', 'García', 'Martín', 'pedro.garcia@russellbedford.com.co', '3023456789', 7, 6, 3, 'ACTIVA', '2024-02-10')
    `);
    
    console.log('✅ Datos de ejemplo insertados en PostgreSQL');
    
  } catch (error) {
    console.error('❌ Error insertando datos de ejemplo:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Exportar pool para usar en otras partes
export default pool;
