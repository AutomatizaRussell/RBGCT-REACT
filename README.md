# RBGCT - Sistema de Gestión de Personal y Tareas

Sistema integral de gestión de empleados y calendario de tareas desarrollado para **Russell Bedford RBG S.A.S**. Incluye gestión de usuarios con roles, calendario de tareas, y control de acceso basado en permisos.

---

## 🏗️ Arquitectura del Proyecto

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Admin Dashboard │  │  User Dashboard │  │  CompleteProfile│ │
│  │  (SuperAdmin)    │  │  (Admin/Editor) │  │  (Primer Login) │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │  TaskCalendar    │  │  Login          │                      │
│  │  (Calendario)    │  │  (Auth)         │                      │
│  └─────────────────┘  └─────────────────┘                      │
├─────────────────────────────────────────────────────────────────┤
│                         API REST (Django DRF)                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  /empleados/     │  │  /tareas/       │  │  /areas/        │ │
│  │  /cargos/        │  │  /crear-usuario/│  │  /completar/    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                      BASE DE DATOS (PostgreSQL)                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  datos_empleado  │  │  tareas_calendario│  │  datos_area     │ │
│  │  datos_cargo     │  │  superadmin      │  │  auth_user      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Stack Tecnológico

### Frontend
| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| **React** | 18.x | Framework UI |
| **Vite** | 6.x | Build tool y dev server |
| **React Router** | 6.x | Navegación SPA |
| **Lucide React** | 0.x | Iconos |
| **Tailwind CSS** | 3.x | Estilos CSS |
| **date-fns** | 3.x | Manipulación de fechas |

### Backend
| Tecnología | Versión | Descripción |
|------------|---------|-------------|
| **Django** | 4.2.30 | Framework Python |
| **Django REST Framework** | 3.15.x | API REST |
| **PostgreSQL** | 15.x | Base de datos |
| **bcrypt** | 4.x | Hash de contraseñas |
| **CORS Headers** | 4.x | CORS handling |

---

## 📁 Estructura del Proyecto

```
GCT/
├── src/                              # Frontend React
│   ├── components/
│   │   ├── layout/                   # AdminSidebar, Admin2Sidebar, Sidebar
│   │   ├── tasks/                    # TaskCalendar
│   │   └── users/                    # UserTable, CreateUserPage, RoleModal
│   ├── context/
│   │   └── AuthContext.jsx           # Auth state, roles, permissions
│   ├── hooks/
│   │   └── useAuth.js                # useAuth hook
│   ├── lib/
│   │   ├── api.js                    # API functions
│   │   └── db.js                     # IndexedDB helpers
│   ├── pages/
│   │   ├── AdminDashboard.jsx        # SuperAdmin dashboard
│   │   ├── Admin2Dashboard.jsx       # Admin dashboard
│   │   ├── CompleteProfile.jsx       # First login form
│   │   ├── Login.jsx                 # Login page
│   │   └── UserDashboard.jsx         # Editor/User dashboard
│   ├── App.jsx                       # Routes
│   └── main.jsx                      # Entry point
│
├── backend-django/                   # Backend Django
│   ├── api/
│   │   ├── models.py                 # Database models
│   │   ├── views.py                  # API endpoints
│   │   ├── serializers.py            # DRF serializers
│   │   └── urls.py                   # API routes
│   ├── rbgct/                        # Django settings
│   └── manage.py
│
└── package.json
```

---

## 🗄️ Estructura de la Base de Datos

### Tablas Principales

#### `datos_empleado`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id_empleado` | SERIAL PK | ID único |
| `auth_id` | UUID | Referencia a auth_user |
| `primer_nombre` | VARCHAR(50) | Primer nombre |
| `segundo_nombre` | VARCHAR(50) | Segundo nombre |
| `primer_apellido` | VARCHAR(50) | Primer apellido |
| `segundo_apellido` | VARCHAR(50) | Segundo apellido |
| `apodo` | VARCHAR(30) | Nombre de usuario |
| `correo_corporativo` | VARCHAR(100) | Email corporativo |
| `correo_personal` | VARCHAR(100) | Email personal |
| `telefono` | VARCHAR(20) | Teléfono |
| `telefono_emergencia` | VARCHAR(20) | Teléfono emergencia |
| `direccion` | TEXT | Dirección |
| `fecha_nacimiento` | DATE | Fecha de nacimiento |
| `fecha_ingreso` | DATE | Fecha de ingreso (auto) |
| `sexo` | CHAR(1) | M/F/O |
| `tipo_sangre` | VARCHAR(3) | A+, A-, B+, B-, AB+, AB-, O+, O- |
| `id_area` | FK | Referencia a datos_area |
| `id_cargo` | FK | Referencia a datos_cargo |
| `id_permisos` | INTEGER | 1=Admin, 2=Editor, 3=Usuario |
| `estado` | VARCHAR(10) | ACTIVA/INACTIVO |
| `primer_login` | BOOLEAN | TRUE si es primer login |
| `permitir_edicion_datos` | BOOLEAN | Permitir auto-edición |
| `password` | VARCHAR(255) | Hash bcrypt |

#### `tareas_calendario`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id_tarea` | SERIAL PK | ID único |
| `titulo` | VARCHAR(200) | Título de la tarea |
| `descripcion` | TEXT | Descripción |
| `fecha_inicio` | DATE | Fecha inicio |
| `fecha_fin` | DATE | Fecha fin |
| `estado` | VARCHAR(20) | pendiente/en_progreso/completada/cancelada |
| `prioridad` | VARCHAR(10) | baja/media/alta |
| `id_asignador` | FK | Quién asignó |
| `id_responsable` | FK | Quién ejecuta |
| `id_area` | FK | Área responsable |
| `fecha_creacion` | TIMESTAMP | Auto |
| `fecha_actualizacion` | TIMESTAMP | Auto |

#### `datos_cargo` (Catálogo)
| ID | Cargo |
|----|-------|
| 1 | Socio |
| 2-4 | Gerente 1, 2, 3 |
| 5-7 | Senior 1, 2, 3 |
| 8-10 | Líder 1, 2, 3 |
| 11-14 | Analista 1, 2, 3, 4 |
| 15-17 | SemiSenior 1, 2, 3 |
| 18-21 | Asistente 1, 2, 3, 4 |

---

## 🔐 Sistema de Roles y Permisos

### Jerarquía
| Rol | ID | Permisos |
|-----|-----|----------|
| **SuperAdmin** | especial | Crear usuarios, reactivar usuarios, eliminar usuarios, gestionar permisos globales |
| **Administrador** | 1 | Crear/editar usuarios, ver inactivos, gestionar tareas |
| **Editor** | 2 | Crear/editar tareas, ver calendario |
| **Usuario** | 3 | Ver tareas asignadas, editar propio perfil (si se permite) |

### Flags Importantes
- `primer_login`: TRUE → Redirige a `/completar-perfil`
- `permitir_edicion_datos`: TRUE → Usuario puede editar su perfil

---

## 🚀 API Endpoints

### Autenticación
```
POST /api/login/
{
  "correo_corporativo": "email",
  "password": "pass"
}
```

### Empleados
```
GET    /api/empleados/              # Listar todos
GET    /api/empleados/activos/      # Listar activos
GET    /api/empleados/inactivos/    # Listar inactivos
GET    /api/empleados/?email=xxx    # Buscar por email
PATCH  /api/empleados/{id}/          # Actualizar empleado
DELETE /api/empleados/{id}/          # Eliminar (solo SuperAdmin)
```

### Tareas
```
GET    /api/tareas/?empleado_id=1    # Tareas por empleado
GET    /api/tareas/?area_id=1        # Tareas por área
POST   /api/tareas/                  # Crear tarea
PATCH  /api/tareas/{id}/             # Actualizar tarea
DELETE /api/tareas/{id}/             # Eliminar tarea
```

### SuperAdmin
```
POST /api/crear-usuario/             # Crear nuevo usuario
{
  "admin_email": "super@email.com",
  "admin_password": "pass",
  "correo_corporativo": "nuevo@email.com",
  "password": "temporal",
  "id_permisos": 1,
  "primer_nombre": "Nombre",
  ...
}

POST /api/completar-datos/           # Completar perfil primer login
POST /api/habilitar-edicion/         # Habilitar edición global
```

---

## ⚙️ Instalación y Setup

### Requisitos
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

### 1. Backend (Django)

```bash
cd backend-django

# Crear virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar PostgreSQL en rbgct/settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'rbgct',
        'USER': 'postgres',
        'PASSWORD': 'tu_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# Migraciones
python manage.py makemigrations
python manage.py migrate

# Crear SuperAdmin
python manage.py shell
from api.models import DatosEmpleado
DatosEmpleado.objects.create(
    correo_corporativo='superadmin@russellbedford.com.co',
    password='$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    primer_nombre='Super',
    primer_apellido='Admin',
    id_permisos=1,
    estado='ACTIVA'
)

# Iniciar servidor
python manage.py runserver
```

### 2. Frontend (React)

```bash
# En root del proyecto
npm install

# Desarrollo
npm run dev

# Build producción
npm run build
```

---

## 🔄 Flujo de Trabajo

### 1. Crear Usuario (SuperAdmin)
```
Admin Dashboard → Crear Usuario → Email + Password + Rol
→ Usuario recibe credenciales → Primer login
```

### 2. Primer Login (Usuario)
```
Login → Detecta primer_login=TRUE → Redirige a Completar Perfil
→ Ingresa: Nombres, Apellidos, Apodo, Contacto, Área, Cargo, etc.
→ primer_login=FALSE → Accede al sistema
```

### 3. Gestión de Usuarios
```
SuperAdmin/Admin → UserTable → Editar cualquier campo
→ Toggle "permitir_edicion_datos" para permitir auto-edición
```

### 4. Calendario de Tareas
```
Crear tarea → Asignar responsable/área/fechas
→ Aparece en calendario del responsable
→ Estados: pendiente → en_progreso → completada
```

---

## 🎯 Funcionalidades Implementadas

✅ **Autenticación**
- Login con email/password
- bcrypt para hashing seguro
- JWT-like session handling
- Cierre de sesión automático

✅ **Gestión de Usuarios**
- Crear usuarios (SuperAdmin)
- Completar perfil en primer login
- Edición completa de datos (Admin/SuperAdmin)
- Activar/Desactivar usuarios
- Eliminar usuarios permanentemente

✅ **Control de Acceso**
- 4 niveles de roles (SuperAdmin, Admin, Editor, Usuario)
- Permisos granulares
- Toggle para permitir edición propia

✅ **Calendario de Tareas**
- Vista mensual/semanal/diaria
- Crear/editar/eliminar tareas
- Asignar responsables
- Filtros por área/empleado

✅ **Catálogos Dinámicos**
- Áreas/Departamentos desde DB
- Cargos jerárquicos (Socio → Asistente)
- Tipo de sangre, Sexo

---

## 🐛 Troubleshooting

### Error: "id_empleado expected a number but got 'undefined'"
**Causa**: El frontend envía `user_id=undefined` al calendario  
**Solución**: Usar `empleadoData` del AuthContext en lugar de `user.user`

### Error: Tabla empleados vacía
**Causa**: Se ejecutó `TRUNCATE` accidentalmente  
**Solución**: Recrear SuperAdmin vía SQL o shell de Django

### Error: 401 Unauthorized al crear usuario
**Causa**: No se envía `admin_password` en el POST  
**Solución**: Incluir `admin_email` y `admin_password` en la request

---

## 📄 Licencia

© 2026 Russell Bedford RBG S.A.S - Todos los derechos reservados.

---

## 👥 Desarrollo

**Equipo de Desarrollo**:  
Desarrollado para Russell Bedford Colombia - Gestión de Talento y Operaciones.

**Versión**: 1.0.0  
**Última actualización**: Abril 2026
