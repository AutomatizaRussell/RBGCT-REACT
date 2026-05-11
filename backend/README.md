# Backend Django - RBGCT

Backend en Django con PostgreSQL para el sistema de gestión de empleados y tareas.

## Requisitos

- Python 3.8+
- PostgreSQL 12+
- pip

## Instalación

### 1. Crear entorno virtual

```bash
cd backend-django
python -m venv venv

# Activar en Windows:
venv\Scripts\activate

# Activar en macOS/Linux:
source venv/bin/activate
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3. Crear base de datos PostgreSQL

Abre pgAdmin o psql y ejecuta:

```sql
CREATE DATABASE rbgct;
```

### 4. Configurar variables de entorno

Copia el archivo de ejemplo y configura tus credenciales:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales PostgreSQL:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rbgct
DB_USER=postgres
DB_PASSWORD=tu_password_aqui
DJANGO_SECRET_KEY=una-clave-secreta-larga-y-segura
DEBUG=True
```

### 5. Crear tablas en la base de datos

```bash
python manage.py migrate
```

### 6. (Opcional) Migrar datos desde SQLite

Si tienes datos en SQLite que quieres migrar:

```bash
python migrate_from_sqlite.py
```

### 7. Crear superusuario para Django Admin

```bash
python manage.py createsuperuser
```

### 8. Iniciar servidor

```bash
python manage.py runserver
```

El servidor estará disponible en: http://localhost:8000

## Endpoints de la API

### Áreas
- `GET /api/areas/` - Listar todas
- `POST /api/areas/` - Crear nueva
- `GET /api/areas/{id}/` - Obtener una
- `PUT /api/areas/{id}/` - Actualizar
- `DELETE /api/areas/{id}/` - Eliminar

### Cargos
- `GET /api/cargos/` - Listar todos
- `POST /api/cargos/` - Crear nuevo
- `GET /api/cargos/{id}/` - Obtener uno
- `PUT /api/cargos/{id}/` - Actualizar
- `DELETE /api/cargos/{id}/` - Eliminar

### SuperAdmins
- `GET /api/superadmins/` - Listar todos
- `GET /api/superadmins/by-email/?email=x` - Buscar por email
- `POST /api/superadmins/` - Crear nuevo
- `PUT /api/superadmins/{id}/` - Actualizar
- `DELETE /api/superadmins/{id}/` - Eliminar

### Empleados
- `GET /api/empleados/` - Listar todos
- `GET /api/empleados/by-email/?email=x` - Buscar por email
- `GET /api/empleados/activos/` - Listar activos
- `GET /api/empleados/inactivos/` - Listar inactivos
- `POST /api/empleados/` - Crear nuevo
- `PUT /api/empleados/{id}/` - Actualizar
- `DELETE /api/empleados/{id}/` - Eliminar

### Tareas
- `GET /api/tareas/` - Listar todas
- `GET /api/tareas/?empleado_id=x` - Filtrar por empleado
- `GET /api/tareas/por_empleado/?empleado_id=x` - Tareas de un empleado
- `POST /api/tareas/` - Crear nueva
- `PUT /api/tareas/{id}/` - Actualizar
- `DELETE /api/tareas/{id}/` - Eliminar

### Solicitudes de Password
- `GET /api/solicitudes-password/` - Listar todas
- `GET /api/solicitudes-password/pendientes/` - Listar pendientes
- `POST /api/solicitudes-password/` - Crear nueva
- `PUT /api/solicitudes-password/{id}/` - Actualizar
- `DELETE /api/solicitudes-password/{id}/` - Eliminar

## Panel de Administración

Django tiene un panel de admin integrado:

1. Ve a: http://localhost:8000/admin/
2. Inicia sesión con el superusuario creado
3. Gestiona todos los datos desde la interfaz web

## Diferencias con el backend anterior (Node.js)

| Característica | Node.js/SQLite | Django/PostgreSQL |
|----------------|----------------|-------------------|
| Base de datos | SQLite | PostgreSQL |
| ORM | SQL manual | Django ORM |
| Admin | No tiene | Django Admin |
| Seguridad | Básica | CSRF, XSS, SQL Injection protegido |
| Escalabilidad | Limitada | Alta concurrencia |

## Producción

Para producción:

1. Cambiar `DEBUG=False` en `.env`
2. Generar nueva `DJANGO_SECRET_KEY`
3. Configurar `ALLOWED_HOSTS` en `settings.py`
4. Usar Gunicorn: `gunicorn rbgct.wsgi:application`
5. Configurar Nginx como reverse proxy
6. Usar SSL/HTTPS

## Solución de problemas

### Error: "No module named 'django'"
Asegúrate de activar el entorno virtual.

### Error: "database 'rbgct' does not exist"
Crea la base de datos en PostgreSQL primero.

### Error: "relation already exists"
Las tablas ya existen. Usa migraciones o borra la base de datos y recrea.

## Soporte

Para más información consulta la documentación de Django:
https://docs.djangoproject.com/
