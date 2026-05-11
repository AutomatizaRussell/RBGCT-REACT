"""
Script para migrar datos de SQLite a PostgreSQL en Django
Ejecutar: python migrate_from_sqlite.py
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rbgct.settings')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
django.setup()

import sqlite3
from api.models import DatosArea, DatosCargo, SuperAdmin, DatosEmpleado, TareasCalendario, SolicitudesPassword
from django.db import transaction

print("🔄 Iniciando migración SQLite → Django/PostgreSQL...\n")

# Conectar a SQLite
sqlite_path = os.path.join('..', 'data', 'rbgct.db')
if not os.path.exists(sqlite_path):
    # Intentar ruta alternativa
    sqlite_path = os.path.join('..', '..', 'data', 'rbgct.db')
    if not os.path.exists(sqlite_path):
        print("❌ No se encontró la base de datos SQLite en:", sqlite_path)
        sys.exit(1)

conn = sqlite3.connect(sqlite_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

try:
    with transaction.atomic():
        # Inicializar contadores
        areas = []
        cargos = []
        admins = []
        empleados = []
        tareas = []
        solicitudes = []
        
        # 1. Migrar Áreas
        print("📋 Migrando áreas...")
        cursor.execute("SELECT * FROM datos_area")
        areas = cursor.fetchall()
        for area in areas:
            area_dict = dict(area)
            DatosArea.objects.get_or_create(
                id_area=area_dict['id_area'],
                defaults={
                    'nombre_area': area_dict['nombre_area'],
                    'descripcion': area_dict.get('descripcion') or ''
                }
            )
        print(f"   ✅ {len(areas)} áreas migradas\n")
        
        # 2. Migrar Cargos
        print("📋 Migrando cargos...")
        cursor.execute("SELECT * FROM datos_cargo")
        cargos = cursor.fetchall()
        for cargo in cargos:
            cargo_dict = dict(cargo)
            DatosCargo.objects.get_or_create(
                id_cargo=cargo_dict['id_cargo'],
                defaults={
                    'nombre_cargo': cargo_dict['nombre_cargo'],
                    'nivel': cargo_dict.get('nivel') or ''
                }
            )
        print(f"   ✅ {len(cargos)} cargos migrados\n")
        
        # 3. Migrar SuperAdmins
        print("📋 Migrando superadmins...")
        try:
            cursor.execute("SELECT * FROM superadmin")
            admins = cursor.fetchall()
            for admin in admins:
                admin_dict = dict(admin)
                SuperAdmin.objects.get_or_create(
                    id=admin_dict['id'],
                    defaults={
                        'email': admin_dict['email'],
                        'password_hash': admin_dict['password_hash'],
                        'nombre': admin_dict['nombre'],
                        'apellido': admin_dict['apellido'],
                        'role': admin_dict.get('role') or 'superadmin',
                        'estado': admin_dict.get('estado') or 'ACTIVA',
                        'created_at': admin_dict.get('created_at'),
                        'last_login': admin_dict.get('last_login')
                    }
                )
            print(f"   ✅ {len(admins)} superadmins migrados\n")
        except sqlite3.OperationalError as e:
            print(f"   ⚠️ Tabla superadmin no existe: {e}\n")
        
        # 4. Migrar Empleados
        print("📋 Migrando empleados...")
        cursor.execute("SELECT * FROM datos_empleado")
        empleados = cursor.fetchall()
        for emp in empleados:
            emp_dict = dict(emp)
            area = None
            cargo = None
            
            if emp_dict.get('area_id'):
                try:
                    area = DatosArea.objects.get(id_area=emp_dict['area_id'])
                except DatosArea.DoesNotExist:
                    pass
            
            if emp_dict.get('cargo_id'):
                try:
                    cargo = DatosCargo.objects.get(id_cargo=emp_dict['cargo_id'])
                except DatosCargo.DoesNotExist:
                    pass
            
            DatosEmpleado.objects.get_or_create(
                id_empleado=emp_dict['id_empleado'],
                defaults={
                    'auth_id': emp_dict.get('auth_id'),
                    'primer_nombre': emp_dict['primer_nombre'],
                    'segundo_nombre': emp_dict.get('segundo_nombre') or '',
                    'primer_apellido': emp_dict['primer_apellido'],
                    'segundo_apellido': emp_dict.get('segundo_apellido') or '',
                    'correo_corporativo': emp_dict['correo_corporativo'],
                    'correo_personal': emp_dict.get('correo_personal') or '',
                    'telefono': emp_dict.get('telefono') or '',
                    'telefono_emergencia': emp_dict.get('telefono_emergencia') or '',
                    'area': area,
                    'cargo': cargo,
                    'id_permisos': emp_dict.get('id_permisos') or 3,
                    'estado': emp_dict.get('estado') or 'ACTIVA',
                    'fecha_nacimiento': emp_dict.get('fecha_nacimiento'),
                    'fecha_ingreso': emp_dict.get('fecha_ingreso'),
                    'direccion': emp_dict.get('direccion') or ''
                }
            )
        print(f"   ✅ {len(empleados)} empleados migrados\n")
        
        # 5. Migrar Tareas
        print("📋 Migrando tareas...")
        cursor.execute("SELECT * FROM tareas_calendario")
        tareas = cursor.fetchall()
        for tarea in tareas:
            tarea_dict = dict(tarea)
            area = None
            empleado = None
            
            if tarea_dict.get('id_area'):
                try:
                    area = DatosArea.objects.get(id_area=tarea_dict['id_area'])
                except DatosArea.DoesNotExist:
                    pass
            
            if tarea_dict.get('id_empleado'):
                try:
                    empleado = DatosEmpleado.objects.get(id_empleado=tarea_dict['id_empleado'])
                except DatosEmpleado.DoesNotExist:
                    pass
            
            TareasCalendario.objects.get_or_create(
                id=tarea_dict['id'],
                defaults={
                    'titulo': tarea_dict['titulo'],
                    'descripcion': tarea_dict.get('descripcion') or '',
                    'area': area,
                    'empleado': empleado,
                    'prioridad': tarea_dict.get('prioridad') or 'media',
                    'fecha_vencimiento': tarea_dict.get('fecha_vencimiento'),
                    'asignado_a': tarea_dict.get('asignado_a') or '',
                    'estado': tarea_dict.get('estado') or 'pendiente',
                    'creado_por': tarea_dict.get('creado_por')
                }
            )
        print(f"   ✅ {len(tareas)} tareas migradas\n")
        
        # 6. Migrar Solicitudes de Password
        print("📋 Migrando solicitudes de password...")
        try:
            cursor.execute("SELECT * FROM solicitudes_password")
            solicitudes = cursor.fetchall()
            for sol in solicitudes:
                sol_dict = dict(sol)
                try:
                    empleado = DatosEmpleado.objects.get(id_empleado=sol_dict['id_empleado'])
                    SolicitudesPassword.objects.get_or_create(
                        id=sol_dict['id'],
                        defaults={
                            'empleado': empleado,
                            'leida': bool(sol_dict.get('leida') or 0),
                            'atendida': bool(sol_dict.get('atendida') or 0)
                        }
                    )
                except DatosEmpleado.DoesNotExist:
                    print(f"   ⚠️ Solicitud {sol_dict['id']} omitida (empleado no existe)")
            
            print(f"   ✅ {len(solicitudes)} solicitudes migradas\n")
        except sqlite3.OperationalError as e:
            print(f"   ⚠️ Tabla solicitudes_password no existe: {e}\n")
    
    print("🎉 ¡MIGRACIÓN COMPLETADA!")
    print(f"\n📊 Resumen:")
    print(f"   • Áreas: {len(areas)}")
    print(f"   • Cargos: {len(cargos)}")
    print(f"   • Superadmins: {len(admins)}")
    print(f"   • Empleados: {len(empleados)}")
    print(f"   • Tareas: {len(tareas)}")
    print(f"   • Solicitudes: {len(solicitudes)}")

except Exception as e:
    print(f"\n❌ Error durante la migración: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

finally:
    conn.close()
    print("\n✅ Conexiones cerradas")
