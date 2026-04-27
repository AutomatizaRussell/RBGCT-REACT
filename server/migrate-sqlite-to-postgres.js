import Database from 'better-sqlite3';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Conexión SQLite
const sqliteDb = new Database('./data/rbgct.db');

// Conexión PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'rbgct',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migración SQLite → PostgreSQL...\n');
    
    // ============================================
    // 1. Migrar áreas
    // ============================================
    console.log('📋 Migrando áreas...');
    const areas = sqliteDb.prepare('SELECT * FROM datos_area').all();
    for (const area of areas) {
      try {
        await client.query(`
          INSERT INTO datos_area (id_area, nombre_area, descripcion)
          VALUES ($1, $2, $3)
          ON CONFLICT (id_area) DO UPDATE SET
            nombre_area = EXCLUDED.nombre_area,
            descripcion = EXCLUDED.descripcion
        `, [area.id_area, area.nombre_area, area.descripcion]);
      } catch (e) {
        console.log(`  ⚠️ Área ${area.id_area} ya existe o error:`, e.message);
      }
    }
    console.log(`   ✅ ${areas.length} áreas migradas\n`);
    
    // ============================================
    // 2. Migrar cargos
    // ============================================
    console.log('📋 Migrando cargos...');
    const cargos = sqliteDb.prepare('SELECT * FROM datos_cargo').all();
    for (const cargo of cargos) {
      try {
        await client.query(`
          INSERT INTO datos_cargo (id_cargo, nombre_cargo, nivel)
          VALUES ($1, $2, $3)
          ON CONFLICT (id_cargo) DO UPDATE SET
            nombre_cargo = EXCLUDED.nombre_cargo,
            nivel = EXCLUDED.nivel
        `, [cargo.id_cargo, cargo.nombre_cargo, cargo.nivel]);
      } catch (e) {
        console.log(`  ⚠️ Cargo ${cargo.id_cargo} ya existe o error:`, e.message);
      }
    }
    console.log(`   ✅ ${cargos.length} cargos migrados\n`);
    
    // ============================================
    // 3. Migrar superadmins
    // ============================================
    console.log('📋 Migrando superadmins...');
    const superadmins = sqliteDb.prepare('SELECT * FROM superadmin').all();
    for (const admin of superadmins) {
      try {
        await client.query(`
          INSERT INTO superadmin (id, email, password_hash, nombre, apellido, role, estado, created_at, last_login)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            nombre = EXCLUDED.nombre,
            apellido = EXCLUDED.apellido,
            role = EXCLUDED.role,
            estado = EXCLUDED.estado
        `, [admin.id, admin.email, admin.password_hash, admin.nombre, 
            admin.apellido, admin.role || 'superadmin', admin.estado || 'ACTIVA', 
            admin.created_at, admin.last_login]);
      } catch (e) {
        console.log(`  ⚠️ Superadmin ${admin.email} ya existe o error:`, e.message);
      }
    }
    console.log(`   ✅ ${superadmins.length} superadmins migrados\n`);
    
    // ============================================
    // 4. Migrar empleados
    // ============================================
    console.log('📋 Migrando empleados...');
    const empleados = sqliteDb.prepare('SELECT * FROM datos_empleado').all();
    for (const emp of empleados) {
      try {
        await client.query(`
          INSERT INTO datos_empleado (
            id_empleado, auth_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
            correo_corporativo, correo_personal, telefono, telefono_emergencia,
            area_id, cargo_id, id_permisos, estado, fecha_nacimiento, fecha_ingreso,
            direccion, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (id_empleado) DO UPDATE SET
            primer_nombre = EXCLUDED.primer_nombre,
            segundo_nombre = EXCLUDED.segundo_nombre,
            primer_apellido = EXCLUDED.primer_apellido,
            segundo_apellido = EXCLUDED.segundo_apellido,
            correo_corporativo = EXCLUDED.correo_corporativo,
            estado = EXCLUDED.estado,
            area_id = EXCLUDED.area_id,
            cargo_id = EXCLUDED.cargo_id,
            id_permisos = EXCLUDED.id_permisos
        `, [
          emp.id_empleado, emp.auth_id, emp.primer_nombre, emp.segundo_nombre,
          emp.primer_apellido, emp.segundo_apellido, emp.correo_corporativo,
          emp.correo_personal, emp.telefono, emp.telefono_emergencia,
          emp.area_id, emp.cargo_id, emp.id_permisos, emp.estado,
          emp.fecha_nacimiento, emp.fecha_ingreso, emp.direccion,
          emp.created_at, emp.updated_at
        ]);
      } catch (e) {
        console.log(`  ⚠️ Empleado ${emp.correo_corporativo}:`, e.message);
      }
    }
    console.log(`   ✅ ${empleados.length} empleados migrados\n`);
    
    // ============================================
    // 5. Migrar tareas
    // ============================================
    console.log('📋 Migrando tareas...');
    const tareas = sqliteDb.prepare('SELECT * FROM tareas_calendario').all();
    for (const tarea of tareas) {
      try {
        await client.query(`
          INSERT INTO tareas_calendario (
            id, titulo, descripcion, id_area, id_empleado, prioridad,
            fecha_vencimiento, fecha_creacion, fecha_actualizacion,
            asignado_a, estado, creado_por
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO UPDATE SET
            titulo = EXCLUDED.titulo,
            descripcion = EXCLUDED.descripcion,
            estado = EXCLUDED.estado,
            prioridad = EXCLUDED.prioridad
        `, [
          tarea.id, tarea.titulo, tarea.descripcion, tarea.id_area,
          tarea.id_empleado, tarea.prioridad, tarea.fecha_vencimiento,
          tarea.fecha_creacion, tarea.fecha_actualizacion,
          tarea.asignado_a, tarea.estado, tarea.creado_por
        ]);
      } catch (e) {
        console.log(`  ⚠️ Tarea ${tarea.id}:`, e.message);
      }
    }
    console.log(`   ✅ ${tareas.length} tareas migradas\n`);
    
    // ============================================
    // 6. Migrar solicitudes de password
    // ============================================
    console.log('📋 Migrando solicitudes de password...');
    const solicitudes = sqliteDb.prepare('SELECT * FROM solicitudes_password').all();
    for (const sol of solicitudes) {
      try {
        await client.query(`
          INSERT INTO solicitudes_password (id, id_empleado, fecha_solicitud, leida, atendida)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            leida = EXCLUDED.leida,
            atendida = EXCLUDED.atendida
        `, [sol.id, sol.id_empleado, sol.fecha_solicitud, sol.leida, sol.atendida]);
      } catch (e) {
        console.log(`  ⚠️ Solicitud ${sol.id}:`, e.message);
      }
    }
    console.log(`   ✅ ${solicitudes.length} solicitudes migradas\n`);
    
    console.log('🎉 ¡MIGRACIÓN COMPLETADA!');
    console.log('\n📊 Resumen:');
    console.log(`   • Áreas: ${areas.length}`);
    console.log(`   • Cargos: ${cargos.length}`);
    console.log(`   • Superadmins: ${superadmins.length}`);
    console.log(`   • Empleados: ${empleados.length}`);
    console.log(`   • Tareas: ${tareas.length}`);
    console.log(`   • Solicitudes: ${solicitudes.length}`);
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    client.release();
    sqliteDb.close();
    await pool.end();
  }
}

// Ejecutar migración
migrate().catch(console.error);
