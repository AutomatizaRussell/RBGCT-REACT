# GCT — Sistema de Gestión de Capital de Talento

Sistema integral de gestión de empleados, formación, tareas y automatización desarrollado para **Russell Bedford RBG S.A.S**. Incluye gestión de usuarios con roles, calendario de tareas, cursos de capacitación, gestión documental, reglamento interno e integración con flujos de automatización mediante n8n.

---

## Tabla de Contenidos

1. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Principales Características](#principales-características)
4. [Estructura de Archivos](#estructura-de-archivos)
5. [Modelos de Base de Datos](#modelos-de-base-de-datos)
6. [Sistema de Roles y Permisos](#sistema-de-roles-y-permisos)
7. [API REST — Endpoints Principales](#api-rest--endpoints-principales)
8. [Exportación de Datos](#exportación-de-datos)
9. [Sistema de Autenticación](#sistema-de-autenticación)
10. [Integraciones Externas](#integraciones-externas)
11. [Variables de Entorno](#variables-de-entorno)
12. [Instalación y Setup](#instalación-y-setup)
13. [Crear un SuperAdmin](#crear-un-superadmin)
14. [Troubleshooting](#troubleshooting)

---

## Arquitectura del Proyecto

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENTE (Browser)                                 │
│                                                                             │
│   React 19 + Vite 8 + Tailwind CSS 4 + React Router 7                     │
│                                                                             │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │
│   │ AdminDash  │  │ Admin2Dash │  │ EditorDash │  │   UserDashboard    │  │
│   │(SuperAdmin)│  │  (Admin)   │  │  (Editor)  │  │    (Usuario)       │  │
│   └────────────┘  └────────────┘  └────────────┘  └────────────────────┘  │
│   ┌──────────┐ ┌───────────┐ ┌──────────────┐ ┌──────────────────────┐   │
│   │  Login   │ │ CompleteP │ │  GestorPDF   │ │    VerifyCode        │   │
│   └──────────┘ └───────────┘ └──────────────┘ └──────────────────────┘   │
│                                                                             │
│              AuthContext  ──►  useAuth / useDatabase                       │
│              api.js (fetch)    lib/db.js  lib/sqlite.js                    │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │ HTTP / REST
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Django 4.2 + DRF 3.15)                       │
│                         python manage.py runserver                          │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ /api/login/  │  │/api/empleados│  │  /api/cursos/ │  │ /api/tareas/  │ │
│  │/api/crear-   │  │/api/areas/   │  │/api/reglamento│  │/api/alertas/  │ │
│  │  usuario/    │  │/api/cargos/  │  │/api/n8n-logs/ │  │/api/api-keys/ │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └───────────────┘ │
│                                                                             │
│  Autenticación: JWT (Bearer)  +  API Key (X-API-Key header)                │
│  authentication.py ──► JWTAuthentication  /  ApiKeyAuthentication          │
└─────────────────────┬──────────────────────────┬────────────────────────────┘
                      │                          │
            ┌─────────▼────────┐       ┌─────────▼──────────┐
            │  PostgreSQL DB   │       │  n8n (Automatización)│
            │  (13 modelos)    │       │  Emails / Workflows  │
            └──────────────────┘       └──────────────────────┘
                      │
            ┌─────────▼────────────────────────────────────────┐
            │           Supabase (Real-time / Storage)          │
            └──────────────────────────────────────────────────┘
```

---

## Stack Tecnológico

### Frontend
| Tecnología | Versión | Rol |
|---|---|---|
| React | 19.2.4 | Framework UI |
| Vite | 8.0.1 | Build tool + Dev server |
| React Router DOM | 7.13.2 | Enrutamiento SPA |
| Tailwind CSS | 4.2.2 | Estilos utilitarios |
| Lucide React | 1.7.0 | Iconografía |
| Recharts | 3.8.1 | Gráficos y dashboards |
| Supabase JS | 2.101.0 | Cliente base de datos real-time |
| React PDF | 10.4.1 | Visor de documentos PDF |
| sql.js | 1.14.1 | SQLite en el navegador |
| bcryptjs | 3.0.3 | Hash de contraseñas (cliente) |
| jsonwebtoken | 9.0.3 | Manejo de tokens JWT |
| Express | 5.2.1 | Servidor Node.js auxiliar (dev) |

### Backend
| Tecnología | Versión | Rol |
|---|---|---|
| Python | 3.11+ | Lenguaje base |
| Django | 4.2.x | Framework web |
| Django REST Framework | 3.15.x | API REST |
| psycopg2-binary | 2.9.x | Driver PostgreSQL |
| bcrypt | 4.0.x | Hash seguro de contraseñas |
| PyJWT | 2.8.x | Tokens JWT |
| python-dotenv | 1.0.x | Variables de entorno |
| resend | 0.8.x | Servicio de email (Resend) |
| gunicorn | 21.x | Servidor WSGI para producción |
| django-cors-headers | 4.x | Manejo de CORS |
| markitdown | - | Conversión de archivos a Markdown |

### Base de Datos e Infraestructura
| Servicio | Uso |
|---|---|
| PostgreSQL 15 | Base de datos principal |
| Supabase | Real-time, storage de archivos |
| n8n | Automatización de flujos y emails |
| Resend | Envío de correos transaccionales |
| Gmail SMTP | Fallback de envío de correos |

---

## Principales Características

### 👥 Gestión de Empleados
- ✅ **Datos Personales + Contacto**: Integración de tabla `Persona` con `DatosContacto`
- ✅ **Información de Emergencia**: Contacto de emergencia, parentesco, teléfono
- ✅ **Exportación CSV/Excel**: Descarga completa de datos personales, laborales y contacto
- ✅ **Multi-Área y Cargo**: Asignación flexible a áreas y cargos
- ✅ **Estado del Empleado**: ACTIVA/INACTIVA con control de permisos

### 📊 Dashboards por Rol
- **SuperAdmin**: Control total, visualización de todos los datos, auditoría
- **Admin**: Gestión operativa de empleados, cursos, tareas
- **Editor**: Creación y edición de contenidos y cursos
- **Usuario**: Autogestión, visualización de cursos, tareas asignadas

### 📚 Gestión de Cursos
- Creación y asignación de cursos
- Seguimiento de progreso por usuario
- Historial de completación
- Módulos con contenido multimedia

### 📅 Calendario de Tareas
- Tareas con estado (pendiente, en proceso, completada)
- Asignación a empleados
- Vistas: tabla, calendario, dashboard
- Alertas y notificaciones

### 🔐 Seguridad
- **Autenticación JWT**: Tokens con refresh
- **Verificación de Email**: Códigos OTP por Resend
- **Control de Acceso**: Roles granulares (SuperAdmin, Admin, Editor, Usuario)
- **Permisos de Edición**: De uso único con validación de contraseña
- **API Keys**: Gestión segura para integraciones

### 📄 Herramientas de Documentos
- **Gestor PDF**: Fusión, división, rotación de PDFs
- **Conversor de Archivos**: Excel, Word, Markdown
- **Limpiador de Metadatos**: Eliminación segura de información sensible

### 🔗 Integraciones
- **n8n**: Automatización de workflows y envío de emails
- **Resend**: Plataforma de email transaccional
- **Gmail SMTP**: Fallback para envío de correos

---

## Estructura de Archivos

```
GCT/
│
├── .env                              # Variables de entorno (NO commitear)
├── .env.example                      # Plantilla de variables
├── .gitignore
├── package.json                      # Dependencias frontend
├── vite.config.js                    # Configuración Vite
├── tailwind.config.js                # Configuración Tailwind
├── postcss.config.js
├── eslint.config.js
├── index.html                        # Entry HTML
│
├── src/                              # Código fuente React
│   ├── main.jsx                      # Punto de entrada
│   ├── App.jsx                       # Rutas principales
│   │
│   ├── pages/                        # Páginas / vistas
│   │   ├── Login.jsx                 # Pantalla de login
│   │   ├── VerifyCode.jsx            # Verificación de código (primer login)
│   │   ├── CompleteProfile.jsx       # Completar perfil (primer ingreso)
│   │   ├── AdminDashboard.jsx        # Dashboard SuperAdmin
│   │   ├── Admin2Dashboard.jsx       # Dashboard Administrador (rol 1)
│   │   ├── EditorDashboard.jsx       # Dashboard Editor (rol 2)
│   │   ├── UserDashboard.jsx         # Dashboard Usuario (rol 3)
│   │   └── GestorPDFPage.jsx         # Gestor de documentos PDF
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   └── ProtectedRoute.jsx    # Wrapper de rutas protegidas
│   │   │
│   │   ├── layout/                   # Barras laterales por rol
│   │   │   ├── AdminSidebar.jsx      # Sidebar SuperAdmin
│   │   │   ├── Admin2Sidebar.jsx     # Sidebar Administrador
│   │   │   ├── EditorSidebar.jsx     # Sidebar Editor
│   │   │   ├── UserSidebar.jsx       # Sidebar Usuario
│   │   │   └── Sidebar.jsx           # Sidebar genérico
│   │   │
│   │   ├── admin/
│   │   │   └── ApiKeyManager.jsx     # Gestión de API Keys
│   │   │
│   │   ├── admin2/
│   │   │   ├── CursosSection.jsx     # Sección de cursos (Admin2)
│   │   │   ├── ContratosSection.jsx  # Sección de contratos
│   │   │   ├── ClientesSection.jsx   # Sección de clientes
│   │   │   └── UtilidadesSection.jsx # Utilidades (Admin2)
│   │   │
│   │   ├── editor/
│   │   │   ├── EditorCursos.jsx      # Editor de cursos
│   │   │   └── EditorHistorial.jsx   # Historial de ediciones
│   │   │
│   │   ├── tasks/
│   │   │   ├── TaskDashboard.jsx     # Panel principal de tareas
│   │   │   ├── TaskCalendar.jsx      # Vista calendario
│   │   │   └── TaskManager.jsx       # CRUD de tareas
│   │   │
│   │   ├── tools/
│   │   │   ├── ConvertidorArchivos.jsx   # Conversor de archivos
│   │   │   ├── GestorPDF.jsx             # Herramienta PDF
│   │   │   ├── LimpiadorMetadatos.jsx    # Limpiador de metadatos
│   │   │   └── index.js
│   │   │
│   │   ├── ui/
│   │   │   ├── StatCard.jsx          # Tarjeta de estadísticas
│   │   │   ├── ActionButton.jsx      # Botón reutilizable
│   │   │   └── RecentUserRow.jsx     # Fila de usuario reciente
│   │   │
│   │   └── users/
│   │       ├── UserTable.jsx         # Tabla de empleados
│   │       ├── UserTableadm2.jsx     # Tabla empleados (Admin2)
│   │       ├── CreateUserPage.jsx    # Formulario crear usuario
│   │       ├── RoleModal.jsx         # Modal de roles
│   │       ├── UserProfile.jsx       # Perfil de usuario
│   │       ├── AutoGestion.jsx       # Autogestión del empleado
│   │       ├── ComunicadosInternos.jsx   # Comunicados internos
│   │       ├── ManualesCargo.jsx     # Manuales por cargo
│   │       ├── MisClientes.jsx       # Mis clientes asignados
│   │       ├── N8nLogs.jsx           # Visor de logs de n8n
│   │       └── SystemSettings.jsx    # Configuración del sistema
│   │
│   ├── context/
│   │   └── AuthContext.jsx           # Estado global de autenticación
│   │
│   ├── hooks/
│   │   └── useAuth.js                # Hook de autenticación
│   │
│   ├── lib/
│   │   ├── api.js                    # Cliente HTTP - endpoints backend
│   │   ├── exportEmpleados.js        # **Funciones de exportación CSV/Excel**
│   │   └── index.js
│   │
│   └── assets/                       # Recursos estáticos

---

## Modelos de Base de Datos

### 🔐 Autenticación
- **SuperAdmin**: Usuario administrador del sistema con rol 'superadmin'

### 👤 RRHH - Jerarquía de Datos Personales
```
Persona (Datos básicos)
  ├─ primer_nombre, segundo_nombre
  ├─ primer_apellido, segundo_apellido
  ├─ tipo_documento, numero_documento
  ├─ fecha_nacimiento, sexo, tipo_sangre
  └─ apodo

DatosContacto (1:1 con Persona)
  ├─ correo_personal, telefono, direccion
  └─ nombre_contacto_emergencia, telefono_emergencia, parentesco_emergencia

DatosEmpleado (1:1 con Persona)
  ├─ correo_corporativo
  ├─ area (FK) + cargo (FK)
  ├─ fecha_ingreso, fecha_retiro
  ├─ estado (ACTIVA/INACTIVA)
  ├─ id_permisos (1=Admin, 2=Editor, 3=Usuario)
  └─ permitir_edicion_datos (permisos de uso único)
```

### 📊 Recursos
- **DatosArea**: Áreas de la empresa (7 áreas por defecto)
- **DatosCargo**: Cargos/posiciones (14 cargos por defecto)
- **TareasCalendario**: Tareas con estado
- **Curso**: Cursos de capacitación
- **CursoContenido**: Módulos dentro de cursos
- **CursoHistorial**: Progreso del usuario en cursos

### 📋 Administración
- **Contrato**: Contratos laborales
- **AfiliacionSeguridadSocial**: Afiliaciones EPS/AFP/ARL
- **Reglamento**: Ítems del reglamento interno
- **N8nLog**: Logs de workflows de n8n
- **ApiKey**: API keys para integraciones

---

## Exportación de Datos

### Función `exportEmpleadosCSV()` y `exportEmpleadosXLSX()`
**Ubicación**: [lib/exportEmpleados.js](frontend/src/lib/exportEmpleados.js)

Exporta todos los datos de empleados en formatos **CSV** y **Excel (.xlsx)** con:

#### Datos Incluidos:
| Categoría | Campos |
|-----------|--------|
| **Personales** | Nombre, Apellidos, Apodo, Documento, Fecha Nacimiento, Sexo, Tipo Sangre |
| **Contacto** | Correo Personal, Teléfono, Dirección |
| **Emergencia** | Contacto Emergencia, Teléfono Emergencia, Parentesco |
| **Laborales** | Correo Corporativo, Área, Cargo, Fecha Ingreso/Retiro, Estado |
| **Permisos** | Rol, Permite Edición Datos |
| **Auditoría** | Fecha Creación, Última Actualización |

#### Uso:
```javascript
import { exportEmpleadosCSV, exportEmpleadosXLSX } from '../../lib/exportEmpleados';

// Exportar a CSV
exportEmpleadosCSV(empleados, 'empleados_rrhh');

// Exportar a Excel
exportEmpleadosXLSX(empleados, 'empleados_rrhh');
```

#### Características:
- ✅ CSV con BOM UTF-8 (compatible con Excel y caracteres especiales)
- ✅ Formato XLSX con estilos
- ✅ Nombres de archivo con timestamp (YYYYMMdd_HHMM)
- ✅ Respeta filtros de búsqueda y estado
- ✅ Solo disponible para SuperAdmin e Admin

---

## Sistema de Roles y Permisos

```
SuperAdmin (id_permisos = null, role='superadmin')
├─ Crear/eliminar usuarios y empleados
├─ Cambiar contraseñas
├─ Gestionar áreas y cargos
├─ Visualizar auditoría completa
└─ Acceso a Admin Dashboard

Admin (id_permisos = 1)
├─ Crear/modificar empleados de su empresa
├─ Asignar cursos y tareas
├─ Exportar datos (CSV/Excel)
├─ Generar reportes
└─ Acceso a Admin2 Dashboard

Editor (id_permisos = 2)
├─ Crear y editar cursos
├─ Gestionar contenido
├─ Ver logs de n8n
└─ Acceso a Editor Dashboard

Usuario (id_permisos = 3)
├─ Editar perfil (si permitir_edicion_datos=True)
├─ Ver cursos asignados
├─ Enviar solicitudes
└─ Acceso a User Dashboard
```

---

## API REST — Endpoints Principales

### 🔑 Autenticación
```
POST   /api/login/                      # Login con email + código OTP
POST   /api/crear-usuario/              # Crear nuevo usuario (SuperAdmin)
POST   /api/enviar-codigo/              # Enviar código de verificación
POST   /api/verificar-codigo/           # Verificar código y generar JWT
POST   /api/recuperar-password/         # Solicitar recuperación
POST   /api/token/refresh/              # Refrescar token JWT
```

### 👥 Empleados
```
GET    /api/empleados/                  # Listar todos los empleados
POST   /api/empleados/                  # Crear empleado
GET    /api/empleados/{id}/             # Obtener empleado específico
PUT    /api/empleados/{id}/             # Actualizar empleado
DELETE /api/empleados/{id}/             # Eliminar empleado
POST   /api/empleados/{id}/cambiar_estado/   # Cambiar estado (ACTIVA/INACTIVA)
POST   /api/empleados/{id}/actualizar-password/ # Cambiar contraseña
```

### 📚 Cursos
```
GET    /api/cursos/                     # Listar cursos
POST   /api/cursos/                     # Crear curso
GET    /api/curso-contenido/            # Listar contenido
GET    /api/curso-historial/            # Historial de progreso
```

### 📅 Tareas
```
GET    /api/tareas/                     # Listar tareas
POST   /api/tareas/                     # Crear tarea
PUT    /api/tareas/{id}/                # Actualizar tarea
DELETE /api/tareas/{id}/                # Eliminar tarea
```

### 🔗 Integraciones
```
GET    /api/n8n-logs/                   # Logs de workflows
POST   /api/n8n-proxy/                  # Proxy para n8n
POST   /api/convertir-archivo/          # Convertir archivos (Excel, Word, etc.)
POST   /api/gestor-pdf/                 # Operaciones PDF (fusión, división)
POST   /api/convertir-markdown/         # Convertir documentos a Markdown
```

### 🔐 Seguridad
```
GET    /api/api-keys/                   # Listar API keys
POST   /api/api-keys/                   # Crear API key
DELETE /api/api-keys/{id}/              # Eliminar API key
```

---

## Sistema de Autenticación

### Flujo JWT + OTP
```
Usuario → Login (email) 
  ↓
Backend → Envía código OTP por email (Resend)
  ↓
Usuario → Ingresa código de 6 dígitos
  ↓
Backend → Verifica código y genera:
          - access_token (JWT, 15 min)
          - refresh_token (JWT, 7 días)
  ↓
Frontend → Almacena tokens en memoria/localStorage
  ↓
Cada request → Usa Bearer token en Authorization header
```

### Manejo de Tokens
- **access_token**: Válido 15 minutos, incluye rol y permisos
- **refresh_token**: Válido 7 días, permite obtener nuevo access_token
- **Refresh automático**: En `/api/token/refresh/`

---

## Integraciones Externas

### 📧 Email (Resend)
- Envío de códigos OTP
- Bienvenida de nuevos usuarios
- Notificaciones
- Recuperación de contraseña

**Fallback**: Si Resend falla, usa Gmail SMTP configurado en `.env`

### 🤖 n8n (Automatización)
- Webhooks para workflow custom
- Envío de emails automático
- Trigger de eventos
- Logging de ejecuciones

### 🗄️ PostgreSQL
- Base de datos principal
- Datos ACID compliant
- Respaldos automáticos (en producción)

---

## Variables de Entorno

### Backend (.env)
```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rbgct
DB_USER=postgres
DB_PASSWORD=tu_password

# Django
DJANGO_SECRET_KEY=tu-clave-secreta
DEBUG=False

# Email
RESEND_API_KEY=re_xxxxx
DEFAULT_FROM_EMAIL=noreply@rbgct.com

# Frontend
FRONTEND_URL=http://localhost:5173

# n8n
N8N_WEBHOOK_URL=http://localhost:5678/webhook/...
N8N_WEBHOOK_API_KEY=xxxxx
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api
VITE_API_TIMEOUT=30000
VITE_DEBUG=false
```

---

## Instalación y Setup

### Requisitos Previos
- Python 3.11+
- Node.js 18+
- PostgreSQL 13+
- Git

### 1. Clonar Repositorio
```bash
git clone <tu-repositorio>
cd GCT
```

### 2. Backend Setup
```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Copiar .env
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar migraciones
python manage.py migrate

# Crear superadmin (opcional)
python manage.py seed_fake_data --clean  # Solo si necesitas datos de prueba

# Iniciar servidor
python manage.py runserver
```

### 3. Frontend Setup
```bash
cd frontend

# Instalar dependencias
npm install

# Copiar .env
cp .env.example .env
# Editar .env con URL del backend

# Iniciar desarrollo
npm run dev

# Build para producción
npm run build
```

---

## Crear un SuperAdmin

```bash
cd backend
python create_superadmin.py
```

Ingresa:
- Email
- Contraseña (6+ caracteres)
- Nombre
- Apellido

---

## Troubleshooting

### Error: "No hay empleados para exportar"
- Verifica que haya empleados en el sistema
- Revisa los filtros de búsqueda aplicados

### Error: Campos de Persona no aparecen en exportación
- Asegúrate de que el serializer incluya los métodos `get_` correspondientes
- Verifica que la tabla `Persona` tenga datos completados
- Recarga la página y reinicia el servidor backend

### JWT Token Expirado
```bash
POST /api/token/refresh/
Body: { "refresh_token": "..." }
```

### Problema con CORS
- Verifica `CORS_ALLOWED_ORIGINS` en `settings.py`
- Asegúrate de que frontend URL coincida

---

## Licencia

Proyecto privado para Russell Bedford RBG S.A.S

---

## Contacto & Soporte

Para cambios, sugerencias o reportar bugs, contacta al equipo de desarrollo.
│   │   │   ├── AdminSidebar.jsx      # Sidebar SuperAdmin
│   │   │   ├── Admin2Sidebar.jsx     # Sidebar Administrador
│   │   │   ├── EditorSidebar.jsx     # Sidebar Editor
│   │   │   ├── UserSidebar.jsx       # Sidebar Usuario
│   │   │   └── Sidebar.jsx           # Sidebar genérico
│   │   │
│   │   ├── admin/
│   │   │   └── ApiKeyManager.jsx     # Gestión de API Keys
│   │   │
│   │   ├── admin2/
│   │   │   ├── CursosSection.jsx     # Sección de cursos (Admin2)
│   │   │   └── UtilidadesSection.jsx # Utilidades (Admin2)
│   │   │
│   │   ├── editor/
│   │   │   ├── EditorCursos.jsx      # Editor de cursos
│   │   │   └── EditorHistorial.jsx   # Historial de ediciones
│   │   │
│   │   ├── tasks/
│   │   │   ├── TaskDashboard.jsx     # Panel principal de tareas
│   │   │   ├── TaskCalendar.jsx      # Vista calendario
│   │   │   └── TaskManager.jsx       # CRUD de tareas
│   │   │
│   │   ├── tools/
│   │   │   ├── ConvertidorArchivos.jsx   # Conversor de archivos
│   │   │   ├── GestorPDF.jsx             # Herramienta PDF
│   │   │   ├── LimpiadorMetadatos.jsx    # Limpiador de metadatos
│   │   │   └── index.js
│   │   │
│   │   ├── ui/
│   │   │   ├── StatCard.jsx          # Tarjeta de estadísticas
│   │   │   ├── ActionButton.jsx      # Botón reutilizable
│   │   │   └── RecentUserRow.jsx     # Fila de usuario reciente
│   │   │
│   │   └── users/
│   │       ├── UserTable.jsx         # Tabla de empleados
│   │       ├── UserTableadm2.jsx     # Tabla empleados (Admin2)
│   │       ├── CreateUserPage.jsx    # Formulario crear usuario
│   │       ├── RoleModal.jsx         # Modal de roles
│   │       ├── UserProfile.jsx       # Perfil de usuario
│   │       ├── AutoGestion.jsx       # Autogestión del empleado
│   │       ├── ComunicadosInternos.jsx   # Comunicados internos
│   │       ├── ManualesCargo.jsx     # Manuales por cargo
│   │       ├── N8nLogs.jsx           # Visor de logs de n8n
│   │       └── SystemSettings.jsx    # Configuración del sistema
│   │
│   ├── context/
│   │   └── AuthContext.jsx           # Estado global de autenticación
│   │
│   ├── hooks/
│   │   ├── useAuth.js                # Hook de autenticación
│   │   └── useDatabase.js            # Hook de operaciones DB
│   │
│   └── lib/
│       ├── api.js                    # Funciones de llamadas a la API
│       ├── db.js                     # Helpers IndexedDB / local storage
│       └── sqlite.js                 # Helpers SQLite (cliente)
│
├── backend-django/                   # Backend Django
│   ├── manage.py
│   ├── requirements.txt
│   ├── create_superadmin.py          # Script para crear SuperAdmin
│   ├── set_admin_password.py         # Script para cambiar password
│   ├── migrate_from_sqlite.py        # Migración desde SQLite
│   │
│   ├── api/                          # App principal Django
│   │   ├── models.py                 # 13 modelos de base de datos
│   │   ├── views.py                  # Endpoints y ViewSets
│   │   ├── serializers.py            # Serializadores DRF
│   │   ├── urls.py                   # Rutas de la API
│   │   ├── authentication.py         # JWT + API Key auth
│   │   ├── jwt_utils.py              # Generación/validación de tokens
│   │   ├── middleware.py             # Middleware personalizado
│   │   └── migrations/               # 13 migraciones de base de datos
│   │       ├── 0001_initial.py
│   │       ├── 0002_datosempleado_password_hash.py
│   │       ├── 0003_datosempleado_datos_completados_and_more.py
│   │       ├── 0004_datosempleado_sexo_datosempleado_tipo_sangre.py
│   │       ├── 0005_datosempleado_apodo.py
│   │       ├── 0006_datosempleado_ultima_actividad.py
│   │       ├── 0007_alerta.py
│   │       ├── 0008_reglamentoitem.py
│   │       ├── 0009_curso_cursocontenido.py
│   │       ├── 0010_superadmin_fecha_ingreso.py
│   │       ├── 0011_n8nlog.py
│   │       ├── 0012_curso_area_empleado_asignado_curso_visibilidad_and_more.py
│   │       └── 0013_apikey.py
│   │
│   ├── rbgct/                        # Configuración del proyecto Django
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   │
│   └── media/                        # Archivos subidos (cursos, PDFs)
│
├── server/
│   └── index.js                      # Servidor Node.js auxiliar (dev)
│
└── dist/                             # Build de producción (generado)
```

---

## Arquitectura de la Base de Datos

La base de datos es **PostgreSQL 15** administrada mediante migraciones de Django. A continuación el diagrama de relaciones y la descripción de cada modelo.

### Diagrama de Relaciones (ERD)

```
SuperAdmin
  ├── id (UUID PK)
  ├── email
  └── ─────────────────────────────────────────────────────────────────┐
                                                                       │
DatosArea ◄──── DatosEmpleado ──────────────────────────────────────► │
  │               │  (FK: id_area)                                     │
  │               │  (FK: id_cargo) ──────────────────► DatosCargo     │
  │               │                                                     │
  │               ├──► TareasCalendario (FK: empleado, area)           │
  │               ├──► SolicitudesPassword (FK: empleado)              │
  │               ├──► CursoHistorial (log)                            │
  │               └──► Alerta (FK: empleado, nullable)                 │
  │                           └──► (FK: atendida_por → SuperAdmin) ◄──┘
  │
Curso ◄──── CursoContenido (FK: curso)
  │    ◄──── CursoHistorial (FK: curso)
  │    (FK: area → DatosArea)
  └──── (FK: empleado_asignado → DatosEmpleado)

ApiKey (FK: creado_por → SuperAdmin)
N8nLog (independiente)
ReglamentoItem (independiente)
```

---

### Modelos Detallados

#### 1. `SuperAdmin` — Administrador del sistema

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | Identificador único |
| `email` | VARCHAR unique | Correo de acceso |
| `password_hash` | VARCHAR | Hash bcrypt de la contraseña |
| `nombre` | VARCHAR(50) | Primer nombre |
| `apellido` | VARCHAR(50) | Apellido |
| `role` | VARCHAR(20) | Siempre `superadmin` |
| `estado` | VARCHAR(10) | `ACTIVA` / `INACTIVO` |
| `created_at` | TIMESTAMP | Fecha de creación (auto) |
| `last_login` | TIMESTAMP | Último acceso (nullable) |
| `fecha_ingreso` | DATE | Fecha de vinculación (nullable) |

---

#### 2. `DatosEmpleado` — Empleados / usuarios del sistema

| Campo | Tipo | Descripción |
|---|---|---|
| `id_empleado` | SERIAL (PK) | ID autoincremental |
| `auth_id` | UUID | Referencia interna de autenticación |
| `primer_nombre` | VARCHAR(50) | |
| `segundo_nombre` | VARCHAR(50) | Opcional |
| `primer_apellido` | VARCHAR(50) | |
| `segundo_apellido` | VARCHAR(50) | Opcional |
| `apodo` | VARCHAR(30) | Nombre de usuario / nickname |
| `correo_corporativo` | VARCHAR(100) unique | Email de login |
| `correo_personal` | VARCHAR(100) | Email personal |
| `telefono` | VARCHAR(20) | Teléfono principal |
| `telefono_emergencia` | VARCHAR(20) | Contacto de emergencia |
| `direccion` | TEXT | Dirección residencia |
| `fecha_nacimiento` | DATE | |
| `sexo` | CHAR(1) | `M` / `F` / `O` |
| `tipo_sangre` | VARCHAR(3) | `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-` |
| `area` | FK → DatosArea | Área/departamento (nullable) |
| `cargo` | FK → DatosCargo | Cargo (nullable) |
| `id_permisos` | INTEGER | `1`=Admin, `2`=Editor, `3`=Usuario |
| `estado` | VARCHAR(10) | `ACTIVA` / `INACTIVO` |
| `primer_login` | BOOLEAN | `True` → redirige a completar perfil |
| `datos_completados` | BOOLEAN | `True` → perfil completo |
| `permitir_edicion_datos` | BOOLEAN | Permite auto-edición del perfil |
| `password_hash` | VARCHAR | Hash bcrypt |
| `ultima_actividad` | TIMESTAMP | Última actividad registrada |
| `created_at` | TIMESTAMP | Auto |
| `updated_at` | TIMESTAMP | Auto |

---

#### 3. `DatosArea` — Áreas / departamentos

| Campo | Tipo | Descripción |
|---|---|---|
| `id_area` | SERIAL (PK) | |
| `nombre_area` | VARCHAR(100) | Nombre del área |
| `descripcion` | VARCHAR(255) | Descripción (opcional) |
| `created_at` | TIMESTAMP | Auto |

---

#### 4. `DatosCargo` — Catálogo de cargos

| Campo | Tipo | Descripción |
|---|---|---|
| `id_cargo` | SERIAL (PK) | |
| `nombre_cargo` | VARCHAR(100) | Nombre del cargo |
| `nivel` | VARCHAR(50) | Nivel jerárquico |
| `created_at` | TIMESTAMP | Auto |

**Niveles de cargo (de mayor a menor):**
Socio → Gerente → Senior → Líder → Analista → SemiSenior → Asistente

---

#### 5. `TareasCalendario` — Tareas y calendario

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL (PK) | |
| `titulo` | VARCHAR(200) | Título de la tarea |
| `descripcion` | TEXT | Descripción detallada |
| `area` | FK → DatosArea | Área asignada (nullable) |
| `empleado` | FK → DatosEmpleado | Responsable (nullable) |
| `prioridad` | VARCHAR(10) | `baja` / `media` / `alta` |
| `estado` | VARCHAR(20) | `pendiente` / `en_proceso` / `completada` / `cancelada` |
| `fecha_vencimiento` | DATE | Fecha límite |
| `asignado_a` | UUID | UUID del responsable |
| `creado_por` | UUID | UUID del creador |
| `fecha_creacion` | TIMESTAMP | Auto |
| `fecha_actualizacion` | TIMESTAMP | Auto |

---

#### 6. `SolicitudesPassword` — Solicitudes de restablecimiento

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL (PK) | |
| `empleado` | FK → DatosEmpleado | Solicitante |
| `fecha_solicitud` | TIMESTAMP | Auto |
| `leida` | BOOLEAN | El admin la vio |
| `atendida` | BOOLEAN | Fue procesada |

---

#### 7. `Alerta` — Alertas de seguridad

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL (PK) | |
| `tipo` | VARCHAR | `recuperacion_password` / `login_fallido` / `otro` |
| `empleado` | FK → DatosEmpleado | Nullable (si el usuario no existe) |
| `email_solicitante` | VARCHAR | Email que originó la alerta |
| `nombre_solicitante` | VARCHAR | Nombre del solicitante |
| `rol_solicitante` | VARCHAR | Rol declarado |
| `estado_alerta` | VARCHAR | `pendiente` / `atendida` / `ignorada` |
| `usuario_existe` | BOOLEAN | Verificación de existencia |
| `atendida_por` | FK → SuperAdmin | Admin que la gestionó |
| `fecha_creacion` | TIMESTAMP | Auto |
| `fecha_actualizacion` | TIMESTAMP | Auto |

---

#### 8. `ReglamentoItem` — Reglamento interno

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL (PK) | |
| `titulo` | VARCHAR | Título del ítem |
| `contenido` | TEXT | Contenido completo |
| `orden` | INTEGER | Posición en el listado |
| `created_at` | TIMESTAMP | Auto |
| `updated_at` | TIMESTAMP | Auto |

---

#### 9. `Curso` — Cursos de formación

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL (PK) | |
| `nombre` | VARCHAR | Nombre del curso |
| `descripcion` | TEXT | Descripción |
| `orden` | INTEGER | Posición en el listado |
| `activo` | BOOLEAN | Activo/Inactivo |
| `visibilidad` | VARCHAR | `todos` / `area` / `persona` |
| `area` | FK → DatosArea | Área destinataria (si visibilidad=area) |
| `empleado_asignado` | FK → DatosEmpleado | Persona específica (si visibilidad=persona) |
| `created_at` | TIMESTAMP | Auto |
| `updated_at` | TIMESTAMP | Auto |

---

#### 10. `CursoContenido` — Contenido de los cursos

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL (PK) | |
| `curso` | FK → Curso | Curso padre |
| `tipo` | VARCHAR | `youtube` / `video` / `documento` / `texto` / `enlace` / `cuestionario` |
| `titulo` | VARCHAR | Título del contenido |
| `descripcion` | TEXT | Descripción (opcional) |
| `url` | VARCHAR | URL externa (YouTube, enlace) |
| `contenido` | TEXT | Contenido textual directo |
| `archivo` | FileField | Archivo subido (PDF, video, etc.) |
| `orden` | INTEGER | Posición dentro del curso |
| `created_at` | TIMESTAMP | Auto |

---

#### 11. `CursoHistorial` — Historial de cambios en cursos

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL (PK) | |
| `curso` | FK → Curso | Curso afectado |
| `accion` | VARCHAR | `crear` / `editar` / `eliminar` / `agregar_contenido` / `eliminar_contenido` |
| `descripcion` | TEXT | Detalle de la acción |
| `usuario_nombre` | VARCHAR | Nombre del usuario que actuó |
| `created_at` | TIMESTAMP | Auto |

---

#### 12. `N8nLog` — Logs de automatización n8n

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL (PK) | |
| `workflow_name` | VARCHAR | Nombre del workflow ejecutado |
| `status` | VARCHAR | `SUCCESS` / `ERROR` |
| `message` | TEXT | Mensaje o descripción |
| `destinatario` | VARCHAR | Email destinatario |
| `tipo_evento` | VARCHAR | Tipo de evento que lo disparó |
| `response_data` | JSONField | Respuesta cruda del webhook |
| `created_at` | TIMESTAMP | Auto |

---

#### 13. `ApiKey` — Llaves de acceso para integraciones externas

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID (PK) | |
| `key` | VARCHAR(64) unique | Llave generada |
| `nombre` | VARCHAR | Nombre descriptivo |
| `descripcion` | TEXT | Descripción del uso |
| `creado_por` | FK → SuperAdmin | Quién la creó |
| `created_at` | TIMESTAMP | Auto |
| `last_used_at` | TIMESTAMP | Último uso (nullable) |
| `uso_count` | INTEGER | Contador de usos |
| `is_active` | BOOLEAN | Habilitada/Deshabilitada |
| `permisos` | JSONField | Lista de permisos específicos |
| `ip_permitidas` | JSONField | Lista de IPs autorizadas |

---

## Sistema de Roles y Permisos

### Jerarquía de Roles

```
SuperAdmin (especial)
    │  └─ Crear/eliminar usuarios
    │  └─ Gestionar roles y permisos
    │  └─ Ver todos los datos
    │  └─ Gestionar API Keys
    │  └─ Atender alertas de seguridad
    │  └─ Configuración del sistema
    │
Administrador (id_permisos = 1)
    │  └─ Crear y editar usuarios
    │  └─ Ver empleados activos e inactivos
    │  └─ Gestionar áreas y cargos
    │  └─ Gestionar tareas y calendario
    │
Editor (id_permisos = 2)
    │  └─ Crear/editar tareas
    │  └─ Gestionar cursos de formación
    │  └─ Ver calendario de toda la empresa
    │
Usuario (id_permisos = 3)
       └─ Ver tareas asignadas
       └─ Editar propio perfil (si permitir_edicion_datos=True)
       └─ Ver cursos asignados
```

### Flags de Control de Acceso

| Flag | Tipo | Comportamiento |
|---|---|---|
| `primer_login` | BOOLEAN | `True` → redirige a `/completar-perfil` al iniciar sesión |
| `datos_completados` | BOOLEAN | `False` → perfil incompleto, muestra aviso |
| `permitir_edicion_datos` | BOOLEAN | `False` → bloquea autoedición del empleado |
| `estado` | VARCHAR | `INACTIVO` → login denegado |

### Páginas por Rol

| Rol | Página principal | Sidebar |
|---|---|---|
| SuperAdmin | `AdminDashboard.jsx` | `AdminSidebar.jsx` |
| Administrador | `Admin2Dashboard.jsx` | `Admin2Sidebar.jsx` |
| Editor | `EditorDashboard.jsx` | `EditorSidebar.jsx` |
| Usuario | `UserDashboard.jsx` | `UserSidebar.jsx` |

---

## API REST — Endpoints Completos

**Base URL:** `http://localhost:8000/api/`  
**Autenticación:** `Authorization: Bearer <access_token>` para JWT, `X-API-Key: <key>` para API Keys.

---

### Autenticación y sesión

| Método | Endpoint | Descripción | Auth requerida |
|---|---|---|---|
| `POST` | `/api/login/` | Login de empleado o SuperAdmin | No |
| `POST` | `/api/token/refresh/` | Renovar access token con refresh token | No |
| `POST` | `/api/ping/` | Heartbeat para mantener sesión activa | Sí |
| `POST` | `/api/enviar-codigo/` | Enviar código de verificación por email | No |
| `POST` | `/api/verificar-codigo/` | Verificar código de login (primer acceso) | No |

**Ejemplo `POST /api/login/`**
```json
// Request
{
  "correo_corporativo": "john@rbcol.co",
  "password": "mi_contraseña"
}

// Response (empleado)
{
  "access": "eyJ...",
  "refresh": "eyJ...",
  "user_type": "empleado",
  "user": {
    "id_empleado": 5,
    "primer_nombre": "John",
    "id_permisos": 1,
    "primer_login": false
  }
}

// Response (requiere verificación - primer login)
{
  "requiere_verificacion": true,
  "mensaje": "Código enviado al correo"
}
```

---

### Empleados

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/empleados/` | Listar todos los empleados |
| `GET` | `/api/empleados/?email=xxx` | Buscar por correo |
| `GET` | `/api/empleados/{id}/` | Obtener empleado por ID |
| `PATCH` | `/api/empleados/{id}/` | Actualizar datos del empleado |
| `DELETE` | `/api/empleados/{id}/` | Eliminar empleado (solo SuperAdmin) |
| `PATCH` | `/api/empleados/{id}/actualizar-password/` | Cambiar contraseña |
| `POST` | `/api/crear-usuario/` | Crear nuevo usuario (SuperAdmin/Admin) |
| `POST` | `/api/completar-datos/` | Completar perfil en primer login |
| `GET` | `/api/actividad-reciente/` | Listado de actividad reciente |

**Ejemplo `POST /api/crear-usuario/`**
```json
// Request
{
  "correo_corporativo": "nuevo@rbcol.co",
  "primer_nombre": "María",
  "primer_apellido": "López",
  "id_permisos": 3,
  "area": 2,
  "cargo": 5
}

// Response
{
  "id_empleado": 12,
  "mensaje": "Usuario creado exitosamente",
  "password_temporal": "Abc123!"
}
```

---

### Áreas y Cargos

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/areas/` | Listar áreas |
| `POST` | `/api/areas/` | Crear área |
| `PATCH` | `/api/areas/{id}/` | Actualizar área |
| `DELETE` | `/api/areas/{id}/` | Eliminar área |
| `GET` | `/api/cargos/` | Listar cargos |
| `POST` | `/api/cargos/` | Crear cargo |
| `PATCH` | `/api/cargos/{id}/` | Actualizar cargo |
| `DELETE` | `/api/cargos/{id}/` | Eliminar cargo |

---

### SuperAdmins

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/superadmins/` | Listar superadmins |
| `POST` | `/api/superadmins/` | Crear superadmin |
| `GET` | `/api/superadmins/{id}/` | Obtener por ID |
| `PATCH` | `/api/superadmins/{id}/` | Actualizar |
| `DELETE` | `/api/superadmins/{id}/` | Eliminar |

---

### Tareas

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/tareas/` | Listar todas las tareas |
| `GET` | `/api/tareas/?empleado_id=1` | Filtrar por empleado |
| `GET` | `/api/tareas/?area_id=1` | Filtrar por área |
| `POST` | `/api/tareas/` | Crear tarea |
| `PATCH` | `/api/tareas/{id}/` | Actualizar tarea |
| `DELETE` | `/api/tareas/{id}/` | Eliminar tarea |

---

### Recuperación de contraseña

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/recuperar-password/` | Iniciar recuperación |
| `POST` | `/api/verificar-codigo-recuperacion/` | Verificar código recibido |
| `POST` | `/api/restablecer-password/` | Establecer nueva contraseña |
| `POST` | `/api/registrar-intento-recuperacion/` | Registrar intento en log |

---

### Alertas de seguridad

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/alertas-recuperacion/` | Listar alertas pendientes |
| `POST` | `/api/alertas-recuperacion/{id}/atender/` | Marcar alerta como atendida |
| `DELETE` | `/api/alertas-recuperacion/{id}/eliminar/` | Eliminar alerta |
| `GET` | `/api/solicitudes-password/` | Solicitudes de reset |

---

### Cursos y formación

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/cursos/` | Listar cursos |
| `POST` | `/api/cursos/` | Crear curso |
| `PATCH` | `/api/cursos/{id}/` | Actualizar curso |
| `DELETE` | `/api/cursos/{id}/` | Eliminar curso |
| `GET` | `/api/curso-contenido/` | Listar contenidos |
| `POST` | `/api/curso-contenido/` | Agregar contenido |
| `PATCH` | `/api/curso-contenido/{id}/` | Actualizar contenido |
| `DELETE` | `/api/curso-contenido/{id}/` | Eliminar contenido |
| `GET` | `/api/curso-historial/` | Historial de cambios (solo lectura) |

---

### Reglamento interno

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/reglamento/` | Listar ítems del reglamento |
| `POST` | `/api/reglamento/` | Crear ítem |
| `PATCH` | `/api/reglamento/{id}/` | Actualizar ítem |
| `DELETE` | `/api/reglamento/{id}/` | Eliminar ítem |

---

### API Keys

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/api-keys/` | Listar API Keys |
| `POST` | `/api/api-keys/` | Crear nueva API Key |
| `PATCH` | `/api/api-keys/{id}/` | Actualizar (activar/desactivar) |
| `DELETE` | `/api/api-keys/{id}/` | Eliminar API Key |

---

### Herramientas de archivos

| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/convertir-markdown/` | Convertir archivo a Markdown (MarkItDown) |
| `POST` | `/api/convertir-archivo/` | Convertir PDF/Excel/Word |
| `POST` | `/api/gestor-pdf/` | Fusionar, dividir o rotar PDFs |

---

### Logs y automatización

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/n8n-logs/` | Ver logs de ejecuciones n8n (solo lectura) |
| `POST` | `/api/n8n-proxy/` | Proxy para llamadas a webhooks n8n (manejo de CORS) |

---

## Sistema de Autenticación

### JWT (JSON Web Tokens)

El backend implementa autenticación JWT personalizada en `authentication.py` (clase `JWTAuthentication`).

**Flujo:**
1. El usuario hace `POST /api/login/` con email y contraseña.
2. El backend valida con bcrypt y genera dos tokens:
   - `access_token`: válido por **15 minutos**
   - `refresh_token`: válido por **7 días**
3. El frontend guarda los tokens en `localStorage`.
4. Cada request incluye `Authorization: Bearer <access_token>`.
5. Cuando el access token expira, se renueva automáticamente con `POST /api/token/refresh/`.

**Payload del token:**
```json
{
  "user_id": "uuid-or-int",
  "type": "superadmin | empleado",
  "token_type": "access | refresh",
  "exp": 1748000000,
  "iat": 1747999100
}
```

**Tipos de usuario soportados:**
- `type: "superadmin"` → resuelve el modelo `SuperAdmin`
- `type: "empleado"` → resuelve el modelo `DatosEmpleado`

---

### API Key Authentication

La clase `ApiKeyAuthentication` permite autenticación mediante header `X-API-Key`.

**Flujo:**
1. Se envía `X-API-Key: <clave>` en el header.
2. El sistema busca en el modelo `ApiKey` y valida que esté activa.
3. Registra `last_used_at` y suma `uso_count`.
4. Retorna el `SuperAdmin` asociado como usuario autenticado.

**Uso típico:** Integraciones externas, n8n, scripts automáticos.

---

### Proceso de primer login

```
Usuario ingresa por primera vez
         │
         ▼
   POST /api/login/
   password temporal → válida con bcrypt
         │
         ▼
   primer_login = True
         │
         ▼
   Sistema envía código de verificación al email
         │
         ▼
   POST /api/verificar-codigo/
         │
         ▼
   Redirect → /completar-perfil
         │
         ▼
   POST /api/completar-datos/
   (nombres, cargo, área, contacto, etc.)
         │
         ▼
   primer_login = False
   datos_completados = True
         │
         ▼
   Acceso normal al sistema
```

---

## Integraciones Externas

### n8n — Automatización de flujos

n8n se usa para el envío de emails transaccionales y automatización de procesos.

**Eventos que disparan n8n:**
- Creación de usuario → Email de bienvenida con credenciales temporales
- Recuperación de contraseña → Email con código de verificación
- Otros workflows personalizados

**Configuración en `.env`:**
```
N8N_WEBHOOK_URL=https://tu-n8n.com/webhook/xxxxx
N8N_WEBHOOK_API_KEY=tu_api_key_de_n8n
N8N_BASE_URL=https://tu-n8n.com
```

**Endpoint proxy en Django:**
```
POST /api/n8n-proxy/
```
Este endpoint recibe peticiones del frontend y las reenvía al webhook de n8n desde el servidor, evitando problemas de CORS.

**Fallback:** Si n8n falla, el sistema envía el email directamente usando Django SMTP.

---

### Supabase — Real-time y Storage

Supabase se usa como cliente de base de datos real-time en el frontend para funcionalidades de actualización en vivo.

**Configuración en `.env`:**
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Resend — Servicio de email

Resend es el proveedor de email transaccional principal.

**Configuración en `.env`:**
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

**Fallback SMTP:**
```
EMAIL_HOST_USER=tu_correo@gmail.com
EMAIL_HOST_PASSWORD=contraseña_de_aplicación
```

---

## Variables de Entorno

### Frontend (`.env` en la raíz del proyecto)
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Backend (`.env` dentro de `backend-django/`)
```env
# Django
DJANGO_SECRET_KEY=tu_clave_secreta_django_50_caracteres
DEBUG=True

# PostgreSQL
DB_NAME=rbgct
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_PORT=5432

# Email
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_HOST_USER=correo@gmail.com
EMAIL_HOST_PASSWORD=contraseña_app_gmail

# n8n
N8N_WEBHOOK_URL=https://tu-n8n.com/webhook/xxxxx
N8N_WEBHOOK_API_KEY=tu_api_key
N8N_BASE_URL=https://tu-n8n.com
```

> **Importante:** Nunca commitear archivos `.env` con credenciales reales. Usar `.env.example` como plantilla.

---

## Instalación y Setup

### Requisitos previos
- Python 3.11 o superior
- Node.js 18 o superior
- PostgreSQL 15 o superior
- Git

---

### 1. Clonar el repositorio
```bash
git clone <repo-url>
cd GCT
```

---

### 2. Configurar el Backend (Django)

```bash
# Entrar al directorio del backend
cd backend-django

# Crear entorno virtual
python -m venv venv

# Activar el entorno virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

**Crear la base de datos en PostgreSQL:**
```sql
CREATE DATABASE rbgct;
CREATE USER postgres WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE rbgct TO postgres;
```

**Crear el archivo `.env` en `backend-django/`:**
```env
DJANGO_SECRET_KEY=genera-una-clave-secreta-larga-aqui
DEBUG=True
DB_NAME=rbgct
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_PORT=5432
RESEND_API_KEY=re_xxxx
N8N_WEBHOOK_URL=https://tu-n8n.com/webhook/xxxx
N8N_WEBHOOK_API_KEY=tu_key
```

**Ejecutar migraciones:**
```bash
python manage.py migrate
```

**Iniciar el servidor backend:**
```bash
python manage.py runserver
# Disponible en: http://localhost:8000
```

---

### 3. Configurar el Frontend (React)

```bash
# Volver al directorio raíz
cd ..

# Instalar dependencias
npm install

# Crear el archivo .env en la raíz
echo "VITE_SUPABASE_URL=https://tu-proyecto.supabase.co" > .env
echo "VITE_SUPABASE_ANON_KEY=eyJ..." >> .env

# Iniciar servidor de desarrollo
npm run dev
# Disponible en: http://localhost:5173
```

**Para correr frontend y servidor Node.js simultáneamente:**
```bash
npm run dev:full
```

---

### 4. Build de producción

```bash
# Frontend
npm run build
# Genera la carpeta dist/

# Backend con Gunicorn (Linux)
cd backend-django
gunicorn rbgct.wsgi:application --bind 0.0.0.0:8000
```

---

## Crear un SuperAdmin

Existen tres formas de crear un SuperAdmin:

---

### Opción 1: Script dedicado (recomendado)

```bash
cd backend-django
# Asegúrate de que el entorno virtual está activado
python create_superadmin.py
```

El script crea el SuperAdmin con datos predeterminados o los del entorno. Edita el archivo para personalizar email, nombre y contraseña antes de ejecutar.

---

### Opción 2: Django Shell (forma manual)

```bash
cd backend-django
python manage.py shell
```

```python
import bcrypt
from api.models import SuperAdmin

# Generar hash de la contraseña
password = "TuContraseñaSegura123!"
password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Crear el SuperAdmin
admin = SuperAdmin.objects.create(
    email='superadmin@rbcol.co',
    password_hash=password_hash,
    nombre='Super',
    apellido='Admin',
    role='superadmin',
    estado='ACTIVA'
)

print(f"SuperAdmin creado con ID: {admin.id}")
print(f"Email: {admin.email}")
print(f"Contraseña: {password}")
```

---

### Opción 3: API REST (si el backend está corriendo)

Si ya existe un SuperAdmin activo, puedes crear otro vía la API:

```bash
curl -X POST http://localhost:8000/api/superadmins/ \
  -H "Authorization: Bearer <tu_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nuevo-admin@rbcol.co",
    "password_hash": "<bcrypt_hash>",
    "nombre": "Nuevo",
    "apellido": "Admin",
    "role": "superadmin",
    "estado": "ACTIVA"
  }'
```

---

### Verificar que el SuperAdmin funciona

1. Abre `http://localhost:5173`
2. Ingresa con el email y contraseña configurados
3. Debes ver el `AdminDashboard` (panel de SuperAdmin)

---

### Cambiar contraseña de SuperAdmin existente

```bash
cd backend-django
python set_admin_password.py
```

O desde el shell de Django:

```python
import bcrypt
from api.models import SuperAdmin

admin = SuperAdmin.objects.get(email='superadmin@rbcol.co')
nueva_password = "NuevaContraseña456!"
admin.password_hash = bcrypt.hashpw(nueva_password.encode(), bcrypt.gensalt()).decode()
admin.save()
print("Contraseña actualizada.")
```

---

## Flujos de Trabajo Principales

### Flujo 1: Creación de usuario por SuperAdmin

```
SuperAdmin → AdminDashboard → "Crear Usuario"
   │
   ▼
Completa: email, nombre, rol, área, cargo
   │
   ▼
POST /api/crear-usuario/
   │
   ├── Sistema genera contraseña temporal
   ├── Crea registro en DatosEmpleado (primer_login=True)
   └── Envía email de bienvenida vía n8n (con fallback SMTP)
         │
         Email contiene:
         ├── URL del sistema
         ├── Email corporativo
         ├── Contraseña temporal
         └── Código de verificación
```

---

### Flujo 2: Primer acceso del empleado

```
Empleado abre email de bienvenida
   │
   ▼
POST /api/login/ → detecta primer_login=True
   │
   ▼
Sistema envía código de 6 dígitos
   │
   ▼
Empleado ingresa código → POST /api/verificar-codigo/
   │
   ▼
Redirect a /completar-perfil
   │
   ▼
Completa: apodo, teléfono, dirección, sexo, tipo de sangre, fecha nacimiento
   │
   ▼
POST /api/completar-datos/
   │
   ├── primer_login = False
   └── datos_completados = True
         │
         ▼
   Acceso normal según rol
```

---

### Flujo 3: Recuperación de contraseña

```
Usuario hace clic en "¿Olvidé mi contraseña?"
   │
   ▼
Ingresa email → POST /api/recuperar-password/
   │
   ├── Sistema registra Alerta (tipo: recuperacion_password)
   └── Envía código de recuperación por email
         │
         ▼
Usuario ingresa código → POST /api/verificar-codigo-recuperacion/
   │
   ▼
Usuario ingresa nueva contraseña → POST /api/restablecer-password/
   │
   ├── Actualiza password_hash con bcrypt
   └── Alerta marcada como atendida
```

---

### Flujo 4: Gestión de cursos

```
Editor/SuperAdmin → Sección Cursos
   │
   ▼
Crear curso (nombre, descripción, visibilidad)
   │
   ├── visibilidad: "todos"   → visible para todos
   ├── visibilidad: "area"    → seleccionar área destino
   └── visibilidad: "persona" → seleccionar empleado específico
         │
         ▼
Agregar contenido al curso:
   ├── YouTube (URL de video)
   ├── Video subido (archivo)
   ├── Documento (PDF, Word, Excel)
   ├── Texto enriquecido
   ├── Enlace externo
   └── Cuestionario
         │
         ▼
Sistema registra cada cambio en CursoHistorial
   │
   ▼
Empleados acceden según su rol/área asignada
```

---

## Gestión de API Keys

Las API Keys permiten que sistemas externos (n8n, scripts, otras apps) accedan a la API sin usar el flujo JWT.

### Crear una API Key (SuperAdmin)

1. Ir a `AdminDashboard` → sección `API Keys`
2. Clic en "Nueva API Key"
3. Completar nombre, descripción y permisos
4. La clave se muestra **una sola vez** al crearla. Guardarla de inmediato.

### Usar una API Key

```bash
curl -X GET http://localhost:8000/api/empleados/ \
  -H "X-API-Key: tu_api_key_generada"
```

### Características de las API Keys

- Se pueden activar/desactivar sin eliminarlas
- Registran cada uso (`last_used_at`, `uso_count`)
- Soportan restricción por IP (`ip_permitidas`)
- Soportan permisos granulares (`permisos` como JSON)
- Solo SuperAdmin puede crearlas y gestionarlas

---

## Troubleshooting

### Error: `CORS` al hacer requests desde el frontend

**Causa:** El backend Django no incluye el origen del frontend en CORS.

**Solución:** Verificar en `settings.py` que `CORS_ALLOW_ALL_ORIGINS = True` o agregar el origen:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
]
```

---

### Error: `401 Unauthorized` en todos los endpoints

**Causa:** El token JWT expiró (15 minutos).

**Solución:** El frontend debe llamar automáticamente a `POST /api/token/refresh/` con el `refresh_token`. Verificar que `api.js` implementa el interceptor de renovación.

---

### Error: `django.db.utils.OperationalError: could not connect to server`

**Causa:** PostgreSQL no está corriendo o las credenciales del `.env` son incorrectas.

**Solución:**
```bash
# Windows - Verificar si PostgreSQL está corriendo
services.msc  # buscar "postgresql-x64-15"

# O iniciar desde terminal
net start postgresql-x64-15
```

---

### Error: `primer_login=True` bucle infinito

**Causa:** El endpoint `/api/completar-datos/` no está actualizando el flag.

**Solución:** Verificar que la respuesta incluye `primer_login: false` y que `AuthContext` actualiza el estado local.

---

### Error: `Email no enviado` — n8n webhook falla

**Causa:** La URL del webhook de n8n es incorrecta o n8n no está corriendo.

**Solución:** El sistema tiene fallback automático a SMTP. Para verificar:
```bash
# Ver logs en el backend
python manage.py runserver
# Observar los print/logs al crear usuario
```
Si n8n falla, el email se envía directamente. Verificar `N8N_WEBHOOK_URL` en `.env`.

---

### Error: `bcrypt hash no coincide`

**Causa:** El password_hash fue generado con una librería diferente (bcryptjs en frontend vs bcrypt en Python).

**Solución:** Ambas librerías son compatibles. Verificar que el hash guardado en DB comienza con `$2a$` o `$2b$`. Si el campo está vacío o corrupto:
```python
# Django shell
import bcrypt
from api.models import DatosEmpleado
emp = DatosEmpleado.objects.get(correo_corporativo='email@rbcol.co')
new_hash = bcrypt.hashpw(b'nueva_clave', bcrypt.gensalt()).decode()
emp.password_hash = new_hash
emp.save()
```

---

### Tabla de empleados vacía / SuperAdmin sin acceso

**Causa:** Migración accidental o reset de base de datos.

**Solución:** Recrear el SuperAdmin usando la [Opción 2 del script](#opción-2-django-shell-forma-manual).

---

## Scripts de Utilidad

| Script | Ubicación | Descripción |
|---|---|---|
| `create_superadmin.py` | `backend-django/` | Crear SuperAdmin inicial |
| `set_admin_password.py` | `backend-django/` | Cambiar contraseña de SuperAdmin |
| `migrate_from_sqlite.py` | `backend-django/` | Migrar datos desde SQLite a PostgreSQL |

---

## 🛡️ Crear SuperAdmin (Único método seguro)

Por motivos de seguridad, el **SuperAdmin** solo puede crearse a través del shell de Django.  
No existe un endpoint público ni un formulario en el panel para evitar accesos no autorizados.

### 📌 Pasos para crear el SuperAdmin

1. **Activa tu entorno virtual** y accede al shell de Django:

```bash
python manage.py shell
Pega exactamente este código en el prompt >>>:

python
from api.models import SuperAdmin
import bcrypt

email = "admin@rbg.com"
password = "123456789"
nombre = "Admin"
apellido = "RBG"

hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
admin = SuperAdmin.objects.create(
    email=email,
    password_hash=hashed,
    nombre=nombre,
    apellido=apellido,
    role="superadmin",
    estado="activo"
)
print(f"✅ SuperAdmin creado: {admin.email} (ID: {admin.id})")
Sal del shell:

python
exit()
Verifica que el SuperAdmin esté creado:

bash
python manage.py shell -c "from api.models import SuperAdmin; print(SuperAdmin.objects.filter(email='admin@rbg.com').exists())"
⚠️ Importante:
Este método solo puede ejecutarlo quien tenga acceso físico o SSH al servidor.
No hay otra forma de crear un SuperAdmin en el sistema.


## Licencia y Autoría

© 2026 **Russell Bedford RBG S.A.S** — Todos los derechos reservados.

Sistema desarrollado internamente para la gestión de talento humano y operaciones.

**Versión:** 2.0.0  
**Última actualización:** Mayo 2026
