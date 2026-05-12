# GCT — Sistema de Gestión de Capital de Talento

Sistema integral para **Russell Bedford RBG S.A.S** que cubre gestión de empleados, contratos, seguridad social, clientes, cursos de capacitación, tareas, automatización de workflows y herramientas documentales.

---

## Tabla de Contenidos

1. [Arquitectura del Proyecto](#1-arquitectura-del-proyecto)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Estructura de Archivos](#3-estructura-de-archivos)
4. [Base de Datos PostgreSQL](#4-base-de-datos-postgresql)
5. [Modelos — App `api` (schema público)](#5-modelos--app-api-schema-público)
6. [Modelos — App `clientes` (schema `clientes`)](#6-modelos--app-clientes-schema-clientes)
7. [Sistema de Roles y Permisos](#7-sistema-de-roles-y-permisos)
8. [API REST — Endpoints](#8-api-rest--endpoints)
9. [Sistema de Autenticación](#9-sistema-de-autenticación)
10. [Almacenamiento — Appwrite](#10-almacenamiento--appwrite)
11. [Exportación de Datos](#11-exportación-de-datos)
12. [Integraciones Externas](#12-integraciones-externas)
13. [Variables de Entorno](#13-variables-de-entorno)
14. [Instalación y Setup](#14-instalación-y-setup)
15. [Migraciones Django](#15-migraciones-django)
16. [Crear SuperAdmin](#16-crear-superadmin)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Arquitectura del Proyecto

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                              │
│                                                                        │
│   React 19 · Vite 8 · Tailwind CSS 4 · React Router 7                │
│                                                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ ┌─────────────┐  │
│  │AdminDashboard│ │Admin2Dashboard│ │EditorDashboard│ │UserDashboard│  │
│  │ (SuperAdmin) │ │   (Admin)    │ │   (Editor)   │ │  (Usuario)  │  │
│  └──────────────┘ └──────────────┘ └─────────────┘ └─────────────┘  │
│                                                                        │
│   AuthContext → useAuth    ·    lib/api.js (fetch + JWT refresh)      │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ HTTP / REST  (JSON)
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│               BACKEND  Django 4.2 + DRF 3.15                         │
│               python manage.py runserver  →  :8000                    │
│                                                                        │
│  App: api/          (RRHH, contratos, cursos, tareas, auth)           │
│  App: clientes/     (empresas clientes, servicios, documentos)        │
│                                                                        │
│  Autenticación: JWT Bearer  +  API Key (X-API-Key header)             │
│  Middleware: JWTMiddleware → authentication.py                        │
└──────────┬───────────────────────────────────┬────────────────────────┘
           │                                   │
  ┌────────▼────────┐                 ┌────────▼──────────┐
  │  PostgreSQL DB   │                 │  n8n (workflows)   │
  │                  │                 │  Emails / Triggers │
  │  schema: public  │                 └───────────────────┘
  │  ├ superadmin                               │
  │  ├ persona                         ┌────────▼──────────┐
  │  ├ datos_contacto                  │  Gmail SMTP        │
  │  ├ empleado                        │  (fallback email)  │
  │  ├ contrato                        └───────────────────┘
  │  ├ afiliacion_seguridad_social
  │  ├ entidad_eps/afp/arl/caja
  │  ├ curso / curso_contenido
  │  ├ tareas_calendario
  │  ├ alertas · api_key · n8n_log
  │  └ ...                             ┌───────────────────┐
  │                                    │  Appwrite Storage  │
  │  schema: clientes                  │  (solo documentos  │
  │  ├ cli_empresa                     │   de clientes)     │
  │  ├ cli_contacto                    └───────────────────┘
  │  ├ cli_servicio
  │  ├ cli_asignacion
  │  ├ cli_documento  ──────────────────────────────► Appwrite
  │  └ cli_bitacora
  └─────────────────┘
```

---

## 2. Stack Tecnológico

### Frontend
| Tecnología | Versión | Rol |
|---|---|---|
| React | 19.x | Framework UI |
| Vite | 8.x | Build tool + Dev server |
| React Router DOM | 7.x | Enrutamiento SPA |
| Tailwind CSS | 4.x | Estilos utilitarios |
| Lucide React | latest | Iconografía |
| Recharts | 3.x | Gráficos y dashboards |
| jsPDF + jspdf-autotable | latest | Exportación PDF |
| SheetJS (xlsx) | latest | Exportación Excel |
| React PDF | 10.x | Visor de documentos PDF |

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
| appwrite | 6.x | SDK Appwrite (almacenamiento) |
| gunicorn | 21.x | Servidor WSGI producción |
| django-cors-headers | 4.x | Manejo de CORS |
| markitdown | latest | Conversión de archivos a Markdown |

### Infraestructura
| Servicio | Uso |
|---|---|
| PostgreSQL 15 | Base de datos principal (dos schemas) |
| Appwrite Storage | Almacenamiento de documentos de clientes |
| n8n | Automatización de workflows y envío de emails |
| Gmail SMTP | Fallback de envío de correos |

---

## 3. Estructura de Archivos

```
GCT/
├── README.md
├── .gitignore
│
├── backend/                          # Backend Django
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env                          # Credenciales (NO commitear)
│   ├── .env.example                  # Plantilla de variables
│   ├── create_superadmin.py          # Script para crear SuperAdmin
│   ├── set_admin_password.py         # Script para cambiar contraseña
│   │
│   ├── rbgct/                        # Configuración del proyecto Django
│   │   ├── settings.py               # Configuración principal
│   │   ├── urls.py                   # URL root (/api/ y /clientes/)
│   │   ├── appwrite_storage.py       # Storage backend para Appwrite
│   │   ├── wsgi.py
│   │   └── asgi.py
│   │
│   ├── api/                          # App RRHH principal
│   │   ├── models.py                 # Todos los modelos del schema público
│   │   ├── views.py                  # ViewSets + endpoints personalizados
│   │   ├── serializers.py            # Serializadores DRF
│   │   ├── urls.py                   # Rutas de /api/
│   │   ├── authentication.py         # JWTAuthentication + ApiKeyAuthentication
│   │   ├── jwt_utils.py              # Generación/validación de tokens
│   │   ├── middleware.py             # JWTMiddleware
│   │   └── migrations/
│   │       ├── 0001_initial_rrhh_schema.py   # Modelos RRHH + SuperAdmin
│   │       ├── 0002_seed_areas_cargos.py     # Seed de áreas y cargos
│   │       ├── 0003_contrato_modulo.py        # Módulo contratos + SS
│   │       └── 0004_seed_entidades_ss.py      # Seed EPS/AFP/ARL/Cajas
│   │
│   ├── clientes/                     # App módulo clientes
│   │   ├── models.py                 # Modelos del schema clientes
│   │   ├── views.py                  # ViewSets clientes
│   │   ├── serializers.py            # Serializadores clientes
│   │   ├── urls.py                   # Rutas de /clientes/
│   │   └── migrations/
│   │       ├── 0001_initial.py       # Crea schema + modelos clientes
│   │       └── 0002_asignacion_area.py
│   │
│   └── media/                        # Archivos locales (cursos, contratos PDF)
│
└── frontend/                         # Frontend React
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    │
    └── src/
        ├── main.jsx
        ├── App.jsx                   # Rutas principales + ProtectedRoute
        │
        ├── pages/
        │   ├── Login.jsx
        │   ├── VerifyCode.jsx
        │   ├── CompleteProfile.jsx   # Completar perfil (primer login)
        │   ├── AdminDashboard.jsx    # Dashboard SuperAdmin
        │   ├── Admin2Dashboard.jsx   # Dashboard Administrador
        │   ├── EditorDashboard.jsx   # Dashboard Editor
        │   ├── UserDashboard.jsx     # Dashboard Usuario
        │   └── GestorPDFPage.jsx
        │
        ├── components/
        │   ├── auth/
        │   │   └── ProtectedRoute.jsx
        │   ├── layout/
        │   │   ├── AdminSidebar.jsx
        │   │   ├── Admin2Sidebar.jsx
        │   │   ├── EditorSidebar.jsx
        │   │   └── UserSidebar.jsx
        │   ├── admin/
        │   │   └── ApiKeyManager.jsx
        │   ├── admin2/
        │   │   ├── ClientesSection.jsx    # Gestión de clientes
        │   │   ├── ContratosSection.jsx   # Contratos + seguridad social
        │   │   ├── CursosSection.jsx
        │   │   └── UtilidadesSection.jsx
        │   ├── editor/
        │   │   ├── EditorCursos.jsx
        │   │   └── EditorHistorial.jsx
        │   ├── tasks/
        │   │   ├── TaskDashboard.jsx
        │   │   ├── TaskCalendar.jsx
        │   │   └── TaskManager.jsx
        │   ├── tools/
        │   │   ├── ConvertidorArchivos.jsx
        │   │   ├── GestorPDF.jsx
        │   │   └── LimpiadorMetadatos.jsx
        │   ├── ui/
        │   │   ├── StatCard.jsx
        │   │   └── ActionButton.jsx
        │   └── users/
        │       ├── UserTable.jsx          # Tabla + edición de empleados
        │       ├── CreateUserPage.jsx     # Formulario crear empleado
        │       ├── UserProfile.jsx        # Perfil propio del empleado
        │       ├── AutoGestion.jsx
        │       ├── MisClientes.jsx        # Clientes asignados al empleado
        │       └── ...
        │
        ├── context/
        │   └── AuthContext.jsx
        ├── hooks/
        │   └── useAuth.js
        └── lib/
            ├── api.js                     # Cliente HTTP (fetch + JWT refresh)
            ├── exportEmpleados.js         # Export CSV/Excel empleados
            ├── exportContratos.js         # Export PDF/Excel contratos + SS
            └── exportClientes.js          # Export PDF/Excel clientes
```

---

## 4. Base de Datos PostgreSQL

La base de datos `rbgct` usa **dos schemas** de PostgreSQL para separar dominios:

| Schema | App Django | Descripción |
|---|---|---|
| `public` | `api` | RRHH, autenticación, contratos, cursos, tareas |
| `clientes` | `clientes` | Empresas clientes, servicios, documentos |

### Crear la base de datos inicial

```sql
-- En psql o pgAdmin
CREATE DATABASE rbgct;

-- El schema "clientes" lo crea automáticamente la primera migración
-- de la app clientes (RunSQL en 0001_initial.py)
```

### Diagrama de relaciones — Schema público

```
SuperAdmin (UUID PK)
  └── ApiKey (FK → SuperAdmin)
  └── Alerta.atendida_por (FK → SuperAdmin)

Persona (id_persona)
  ├── DatosContacto (1:1 → Persona)
  │     correo_personal, telefono, direccion
  │     nombre_contacto_emergencia, telefono_emergencia, parentesco_emergencia
  │
  └── DatosEmpleado (1:1 → Persona)
        correo_corporativo, area(FK), cargo(FK)
        estado, id_permisos, password_hash
        ├── TareasCalendario (FK → DatosEmpleado)
        ├── SolicitudesPassword (FK → DatosEmpleado)
        ├── Alerta (FK → DatosEmpleado, nullable)
        ├── Contrato (FK → DatosEmpleado)
        │     └── ContratoRenovacion (FK → Contrato)
        ├── AfiliacionSeguridadSocial (1:1 → DatosEmpleado)
        │     eps(FK), afp(FK), arl(FK), caja(FK)
        └── CursoContenido.archivo (local filesystem)

DatosArea ←── DatosEmpleado.area
DatosCargo ←── DatosEmpleado.cargo
EntidadEPS ←── AfiliacionSeguridadSocial.eps
EntidadAFP ←── AfiliacionSeguridadSocial.afp
EntidadARL ←── AfiliacionSeguridadSocial.arl
CajaCompensacion ←── AfiliacionSeguridadSocial.caja
```

### Diagrama de relaciones — Schema `clientes`

```
EmpresaCliente (id)
  ├── ContactoCliente[] (FK → EmpresaCliente)
  ├── ServicioContratado[] (FK → EmpresaCliente, FK → DatosArea)
  ├── AsignacionEquipo[] (FK → EmpresaCliente, FK → DatosEmpleado, FK → ServicioContratado)
  ├── DocumentoCliente[] (FK → EmpresaCliente)   ← archivo va a Appwrite Storage
  └── BitacoraCliente[] (FK → EmpresaCliente, FK → DatosEmpleado)

EmpresaCliente.empresa_matriz (self-FK, nullable) → grupos empresariales
```

---

## 5. Modelos — App `api` (schema público)

### `SuperAdmin` — tabla: `superadmin`
Usuario administrador del sistema. Extiende `AbstractUser` de Django.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | generado automáticamente |
| `email` | VARCHAR unique | campo de login (reemplaza `username`) |
| `nombre` / `apellido` | VARCHAR | nombre visible |
| `role` | VARCHAR | siempre `"superadmin"` |
| `estado` | VARCHAR | `ACTIVA` / `INACTIVO` |
| `fecha_ingreso` | DATE | nullable |
| `password` | VARCHAR | hash Django (AbstractUser) |

---

### Jerarquía RRHH: `Persona` → `DatosContacto` + `DatosEmpleado`

Los datos de un empleado están **repartidos en tres tablas** para separar identidad, contacto y vínculo laboral:

```
Persona          (quien es la persona como individuo)
DatosContacto    (cómo contactarla — 1:1 con Persona)
DatosEmpleado    (su relación laboral con la empresa — 1:1 con Persona)
```

`DatosEmpleado` expone `@property` de compatibilidad que delegan a `Persona` y `DatosContacto`, así las vistas y serializers existentes leen `empleado.primer_nombre` o `empleado.telefono` sin cambios.

#### `Persona` — tabla: `persona`

| Campo | Tipo | Notas |
|---|---|---|
| `id_persona` | SERIAL PK | |
| `primer_nombre` | VARCHAR(100) | |
| `segundo_nombre` | VARCHAR(100) | nullable |
| `primer_apellido` | VARCHAR(100) | |
| `segundo_apellido` | VARCHAR(100) | nullable |
| `apodo` | VARCHAR(50) | nombre por el que se le conoce |
| `tipo_documento` | VARCHAR(2) | `CC` `CE` `PA` `TI` |
| `numero_documento` | VARCHAR(30) | unique, nullable |
| `fecha_nacimiento` | DATE | nullable |
| `sexo` | CHAR(1) | `M` `F` `O` |
| `tipo_sangre` | VARCHAR(3) | `A+` `A-` `B+` … `O-` |

#### `DatosContacto` — tabla: `datos_contacto`

| Campo | Tipo | Notas |
|---|---|---|
| `persona` | 1:1 → Persona | CASCADE |
| `correo_personal` | EMAIL | nullable |
| `telefono` | VARCHAR(20) | nullable |
| `direccion` | TEXT | nullable |
| `nombre_contacto_emergencia` | VARCHAR(150) | nullable |
| `telefono_emergencia` | VARCHAR(20) | nullable |
| `parentesco_emergencia` | VARCHAR(50) | nullable |
| `updated_at` | TIMESTAMP | auto |

#### `DatosEmpleado` — tabla: `empleado`

| Campo | Tipo | Notas |
|---|---|---|
| `id_empleado` | SERIAL PK | |
| `persona` | 1:1 → Persona | CASCADE |
| `auth_id` | UUID | nullable |
| `correo_corporativo` | EMAIL unique | email de login |
| `area` | FK → DatosArea | nullable |
| `cargo` | FK → DatosCargo | nullable |
| `fecha_ingreso` / `fecha_retiro` | DATE | nullable |
| `estado` | VARCHAR | `ACTIVA` / `INACTIVO` |
| `id_permisos` | INT | `1`=Admin `2`=Editor `3`=Usuario |
| `password_hash` | VARCHAR | hash bcrypt |
| `primer_login` | BOOLEAN | `True` → redirige a completar perfil |
| `datos_completados` | BOOLEAN | `True` → perfil completo |
| `permitir_edicion_datos` | BOOLEAN | permite auto-edición |
| `ultima_actividad` | TIMESTAMP | nullable |

---

### `DatosArea` — tabla: `datos_area`
Áreas / departamentos de la empresa.

| Campo | Tipo |
|---|---|
| `id_area` | SERIAL PK |
| `nombre_area` | VARCHAR(100) |
| `descripcion` | VARCHAR(255) nullable |

---

### `DatosCargo` — tabla: `datos_cargo`
Catálogo de cargos (Socio → Gerente → Senior → Analista → Asistente…).

| Campo | Tipo |
|---|---|
| `id_cargo` | SERIAL PK |
| `nombre_cargo` | VARCHAR(100) |
| `nivel` | VARCHAR(50) nullable |

---

### Módulo Contratos

#### `Contrato` — tabla: `contrato`

| Campo | Tipo | Notas |
|---|---|---|
| `empleado` | FK → DatosEmpleado | PROTECT |
| `tipo_contrato` | VARCHAR | `termino_fijo` `termino_indefinido` `obra_labor` `prestacion_servicios` `aprendizaje` |
| `fecha_inicio` / `fecha_fin` | DATE | fin nullable |
| `salario` | DECIMAL(14,2) | |
| `tipo_salario` | VARCHAR | `ordinario` / `integral` |
| `auxilio_transporte` | BOOLEAN | |
| `forma_pago` | VARCHAR | `mensual` `quincenal` `semanal` |
| `jornada` | VARCHAR | `completa` `medio_tiempo` `flexible` `por_horas` |
| `modalidad` | VARCHAR | `presencial` `remoto` `hibrido` |
| `pdf_contrato` | FileField | → `media/contratos/` (local) |
| `estado` | VARCHAR | `ACTIVO` `VENCIDO` `TERMINADO` `RENOVADO` `SUSPENDIDO` |
| `motivo_terminacion` | VARCHAR | nullable |
| **Constraint único** | | solo 1 contrato ACTIVO por empleado |

#### `ContratoRenovacion` — tabla: `contrato_renovacion`

| Campo | Tipo |
|---|---|
| `contrato` | FK → Contrato |
| `fecha_renovacion` | DATE |
| `nueva_fecha_fin` | DATE nullable |
| `nuevo_salario` | DECIMAL nullable |
| `pdf_renovacion` | FileField → `media/contratos/renovaciones/` |

#### `AfiliacionSeguridadSocial` — tabla: `afiliacion_seguridad_social`

| Campo | Tipo |
|---|---|
| `empleado` | 1:1 → DatosEmpleado |
| `eps` | FK → EntidadEPS nullable |
| `numero_afiliacion_eps` / `fecha_afiliacion_eps` | — |
| `afp` | FK → EntidadAFP nullable |
| `numero_afiliacion_afp` / `fecha_afiliacion_afp` | — |
| `arl` | FK → EntidadARL nullable |
| `nivel_riesgo_arl` | VARCHAR | I · II · III · IV · V |
| `numero_poliza_arl` / `fecha_afiliacion_arl` | — |
| `caja_compensacion` | FK → CajaCompensacion nullable |
| `numero_afiliacion_caja` / `fecha_afiliacion_caja` | — |

**Entidades catálogo:** `EntidadEPS`, `EntidadAFP`, `EntidadARL`, `CajaCompensacion` — cada una con `nombre`, `codigo`, `activa`.

---

### Módulo Cursos

#### `Curso` — tabla: `curso`

| Campo | Tipo | Notas |
|---|---|---|
| `nombre` / `descripcion` | VARCHAR / TEXT | |
| `orden` | INT | posición en listado |
| `activo` | BOOLEAN | |
| `visibilidad` | VARCHAR | `todos` `area` `persona` |
| `area` | FK → DatosArea | si visibilidad=area |
| `empleado_asignado` | FK → DatosEmpleado | si visibilidad=persona |

#### `CursoContenido` — tabla: `curso_contenido`

| Campo | Tipo | Notas |
|---|---|---|
| `curso` | FK → Curso | |
| `tipo` | VARCHAR | `youtube` `video` `documento` `texto` `enlace` `cuestionario` |
| `titulo` | VARCHAR | |
| `url` | VARCHAR | para YouTube o enlaces externos |
| `contenido` | TEXT | para texto directo |
| `archivo` | FileField | → `media/cursos/` (filesystem local) |
| `orden` | INT | |

---

### Otros modelos (`api`)

| Modelo | Tabla | Descripción |
|---|---|---|
| `TareasCalendario` | `tareas_calendario` | Tareas con estado y prioridad |
| `SolicitudesPassword` | `solicitudes_password` | Solicitudes de reset |
| `Alerta` | `alertas` | Alertas de seguridad (login fallido, recuperación) |
| `ReglamentoItem` | `reglamento_item` | Reglamento interno por ítems |
| `CursoHistorial` | `curso_historial` | Log de cambios en cursos |
| `N8nLog` | `n8n_log` | Logs de ejecuciones de n8n |
| `ApiKey` | `api_key` | API Keys para integraciones externas |

---

## 6. Modelos — App `clientes` (schema `clientes`)

Todos los modelos usan `db_table = '"clientes"."cli_xxx"'` para vivir dentro del schema `clientes` de PostgreSQL.

### `EmpresaCliente` — tabla: `clientes.cli_empresa`

| Campo | Tipo | Notas |
|---|---|---|
| `razon_social` | VARCHAR(255) | |
| `nit` | VARCHAR(20) unique | |
| `digito_verificacion` | VARCHAR(1) | nullable |
| `tipo_empresa` | VARCHAR | `microempresa` `pyme` `grande` `grupo_empresarial` |
| `tamano_empresa` | VARCHAR | micro / pequeña / mediana / grande |
| `actividad_economica` | VARCHAR(10) | código CIIU |
| `regimen_tributario` | VARCHAR | simplificado / comun / gran_contribuyente / … |
| `ciudad` / `departamento` / `direccion` | — | nullable |
| `telefono` / `email_principal` / `website` | — | nullable |
| `estado` | VARCHAR | `prospecto` `activo` `inactivo` `suspendido` `retirado` |
| `nivel_riesgo` | VARCHAR | `bajo` `medio` `alto` `critico` |
| `fecha_inicio_relacion` | DATE | nullable |
| `empresa_matriz` | self-FK | nullable (subsidiarias) |

### `ContactoCliente` — tabla: `clientes.cli_contacto`

| Campo | Tipo |
|---|---|
| `empresa` | FK → EmpresaCliente |
| `nombre` | VARCHAR(150) |
| `cargo` | VARCHAR | representante_legal / gerente / contador / … |
| `email` / `telefono` | nullable |
| `es_principal` | BOOLEAN |
| `activo` | BOOLEAN |

### `ServicioContratado` — tabla: `clientes.cli_servicio`

| Campo | Tipo |
|---|---|
| `empresa` | FK → EmpresaCliente |
| `area` | FK → `api.DatosArea` |
| `fecha_inicio` / `fecha_fin` | DATE |
| `valor_mensual` | DECIMAL(14,2) nullable |
| `periodicidad` | VARCHAR | mensual / bimestral / trimestral / semestral / anual / unico |
| `estado` | VARCHAR | activo / pausado / terminado |

### `AsignacionEquipo` — tabla: `clientes.cli_asignacion`

| Campo | Tipo | Notas |
|---|---|---|
| `empresa` | FK → EmpresaCliente | |
| `area` | FK → `api.DatosArea` | nullable |
| `empleado` | FK → `api.DatosEmpleado` | |
| `servicio` | FK → ServicioContratado | nullable |
| `rol` | VARCHAR | responsable_principal / gerente / senior / analista / revisor / apoyo |
| `fecha_inicio` / `fecha_fin` | DATE | fin nullable |
| `activo` | BOOLEAN | |
| **Constraint único** | | 1 asignación activa por empresa+area+empleado |

### `DocumentoCliente` — tabla: `clientes.cli_documento`

| Campo | Tipo | Notas |
|---|---|---|
| `empresa` | FK → EmpresaCliente | |
| `tipo` | VARCHAR | rut / camara_comercio / estado_financiero / contrato_servicio / … |
| `nombre` | VARCHAR(200) | |
| `archivo` | FileField | **→ Appwrite Storage** (único campo con storage remoto) |
| `fecha_documento` | DATE | nullable |
| `vigente` | BOOLEAN | |
| `subido_por` | FK → `api.DatosEmpleado` | nullable |

> El campo `archivo` usa explícitamente `storage=AppwriteFileStorage()`.  
> Todos los demás `FileField` del proyecto (cursos, contratos PDF) usan el filesystem local en `media/`.

### `BitacoraCliente` — tabla: `clientes.cli_bitacora`

| Campo | Tipo |
|---|---|
| `empresa` | FK → EmpresaCliente |
| `tipo` | VARCHAR | reunion / llamada / visita / email / entrega / novedad / otro |
| `descripcion` | TEXT |
| `empleado` | FK → `api.DatosEmpleado` nullable |
| `fecha` | DATETIME |

---

## 7. Sistema de Roles y Permisos

```
SuperAdmin  (modelo SuperAdmin, role='superadmin')
│  ├── Control total del sistema
│  ├── Crear / eliminar empleados
│  ├── Cambiar contraseñas
│  ├── Gestionar API Keys y alertas
│  └── Dashboard: AdminDashboard.jsx
│
Administrador  (DatosEmpleado, id_permisos=1)
│  ├── Gestión operativa de empleados
│  ├── Módulo contratos y seguridad social
│  ├── Módulo clientes
│  ├── Exportar datos (PDF/Excel)
│  └── Dashboard: Admin2Dashboard.jsx
│
Editor  (DatosEmpleado, id_permisos=2)
│  ├── Crear y editar cursos
│  ├── Gestionar reglamento interno
│  ├── Ver logs n8n
│  └── Dashboard: EditorDashboard.jsx
│
Usuario  (DatosEmpleado, id_permisos=3)
   ├── Ver perfil propio
   ├── Editar contacto personal (si permitir_edicion_datos=True)
   ├── Ver cursos asignados
   ├── Ver clientes asignados
   └── Dashboard: UserDashboard.jsx
```

### Flags de control de acceso en `DatosEmpleado`

| Flag | Comportamiento |
|---|---|
| `primer_login = True` | Fuerza redirect a `/completar-perfil` |
| `datos_completados = False` | Muestra aviso de perfil incompleto |
| `permitir_edicion_datos = True` | Habilita auto-edición del perfil |
| `estado = 'INACTIVO'` | Login denegado |

---

## 8. API REST — Endpoints

**Base URL:** `http://localhost:8000`  
**Auth:** `Authorization: Bearer <access_token>` o `X-API-Key: <key>`

### `/api/` — App RRHH

#### Autenticación y sesión
| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/login/` | Login empleado o SuperAdmin |
| POST | `/api/token/refresh/` | Renovar access token |
| POST | `/api/ping/` | Heartbeat (mantener sesión) |
| POST | `/api/enviar-codigo/` | Enviar OTP por email |
| POST | `/api/verificar-codigo/` | Verificar OTP (primer login) |
| POST | `/api/recuperar-password/` | Iniciar recuperación de contraseña |
| POST | `/api/verificar-codigo-recuperacion/` | Verificar código de recuperación |
| POST | `/api/restablecer-password/` | Establecer nueva contraseña |

#### Empleados
| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/empleados/` | Listar empleados |
| POST | `/api/empleados/` | Crear empleado |
| GET/PATCH | `/api/empleados/{id}/` | Obtener / actualizar |
| DELETE | `/api/empleados/{id}/` | Eliminar |
| POST | `/api/crear-usuario/` | Crear usuario completo (SuperAdmin) |
| POST | `/api/completar-datos/` | Completar perfil primer login |
| PATCH | `/api/empleados/{id}/actualizar-password/` | Cambiar contraseña |
| POST | `/api/habilitar-edicion/` | Habilitar edición de un empleado |
| POST | `/api/habilitar-edicion-masiva/` | Habilitar edición para todos |
| GET | `/api/actividad-reciente/` | Últimas actividades registradas |

#### Áreas, Cargos y SuperAdmins
| Método | Endpoint |
|---|---|
| GET/POST | `/api/areas/` · `/api/areas/{id}/` |
| GET/POST | `/api/cargos/` · `/api/cargos/{id}/` |
| GET/POST | `/api/superadmins/` · `/api/superadmins/{id}/` |

#### Contratos y Seguridad Social
| Método | Endpoint | Descripción |
|---|---|---|
| GET/POST | `/api/contratos/` | Listar / crear contratos |
| GET/PATCH | `/api/contratos/{id}/` | Obtener / actualizar |
| GET/POST | `/api/contratos-renovaciones/` | Renovaciones |
| GET/POST | `/api/afiliaciones-ss/` | Afiliaciones seguridad social |
| GET/POST | `/api/entidades-eps/` | Catálogo EPS |
| GET/POST | `/api/entidades-afp/` | Catálogo AFP |
| GET/POST | `/api/entidades-arl/` | Catálogo ARL |
| GET/POST | `/api/cajas-compensacion/` | Catálogo cajas |

#### Cursos y Formación
| Método | Endpoint |
|---|---|
| GET/POST | `/api/cursos/` · `/api/cursos/{id}/` |
| GET/POST | `/api/curso-contenido/` · `/api/curso-contenido/{id}/` |
| GET | `/api/curso-historial/` |

#### Tareas y otros
| Método | Endpoint |
|---|---|
| GET/POST | `/api/tareas/` · `/api/tareas/{id}/` |
| GET/POST | `/api/reglamento/` · `/api/reglamento/{id}/` |
| GET/POST | `/api/api-keys/` · `/api/api-keys/{id}/` |
| GET | `/api/n8n-logs/` |
| POST | `/api/n8n-proxy/` |
| GET | `/api/alertas-recuperacion/` |
| POST | `/api/alertas-recuperacion/{id}/atender/` |
| DELETE | `/api/alertas-recuperacion/{id}/eliminar/` |

#### Herramientas de archivos
| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/convertir-markdown/` | Archivo → Markdown (MarkItDown) |
| POST | `/api/convertir-archivo/` | PDF / Excel / Word |
| POST | `/api/gestor-pdf/` | Fusionar, dividir, rotar PDFs |

---

### `/clientes/` — App Clientes

| Método | Endpoint | Descripción |
|---|---|---|
| GET/POST | `/clientes/empresas/` | Listar / crear empresas |
| GET/PATCH/DELETE | `/clientes/empresas/{id}/` | Detalle empresa |
| GET/POST | `/clientes/contactos/` | Contactos de empresa |
| GET/POST | `/clientes/servicios/` | Servicios contratados |
| GET/POST | `/clientes/asignaciones/` | Asignaciones de equipo |
| GET/POST | `/clientes/documentos/` | Documentos (archivo → Appwrite) |
| GET/POST | `/clientes/bitacora/` | Bitácora de interacciones |

---

## 9. Sistema de Autenticación

### Flujo JWT + OTP

```
1. POST /api/login/  { correo_corporativo, password }
        │
        ├─ Si primer_login=True → envía OTP al email
        │       POST /api/verificar-codigo/  { codigo }
        │       └→ genera access + refresh token
        │          redirect a /completar-perfil
        │
        └─ Si login normal → genera access + refresh token directamente

2. Cada request:  Authorization: Bearer <access_token>

3. Token expirado (15 min):
        POST /api/token/refresh/  { refresh_token }
        └→ nuevo access_token
```

### Payload del token JWT

```json
{
  "user_id": "<uuid-o-int>",
  "type": "superadmin | empleado",
  "token_type": "access | refresh",
  "exp": 1748000000,
  "iat": 1747999100
}
```

### API Key Authentication

Enviar header `X-API-Key: <clave>` en lugar de Bearer. Útil para n8n, scripts, integraciones externas. Solo SuperAdmin puede crear y gestionar API Keys.

---

## 10. Almacenamiento — Appwrite

Solo el campo `DocumentoCliente.archivo` usa Appwrite Storage. Todos los demás `FileField` (contratos PDF, archivos de cursos) usan el filesystem local en `backend/media/`.

### Configuración en `.env`

```env
APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=xxxxxxxxxxxxxxxxxxxxxxxx
APPWRITE_BUCKET_ID=xxxxxxxxxxxxxxxxxxxxxxxx
APPWRITE_API_KEY=standard_xxxxxxxxxxxxxxxxxxxxxxxx
```

### Cómo funciona

El backend `rbgct/appwrite_storage.py` es un Django Storage personalizado:

- **Subir:** `_save()` llama a `storage.create_file()` y devuelve el path `bucket_id/file_id/nombre.ext`
- **URL pública:** `url()` construye `{endpoint}/storage/buckets/{bucket}/files/{file_id}/view?project={project}`
- **Eliminar:** `delete()` llama a `storage.delete_file()`
- **Existencia:** `exists()` llama a `storage.get_file()`

El campo en el modelo:

```python
# clientes/models.py
archivo = models.FileField(
    upload_to='clientes/documentos/',
    storage=AppwriteFileStorage()
)
```

---

## 11. Exportación de Datos

### Empleados — `lib/exportEmpleados.js`

```javascript
exportEmpleadosCSV(empleados, 'empleados_rrhh')
exportEmpleadosXLSX(empleados, 'empleados_rrhh')
```

Incluye: datos personales, contacto, emergencia, laborales, permisos.

### Contratos — `lib/exportContratos.js`

```javascript
// Global (todos los empleados filtrados)
exportContratosExcel(filtrados, contratos, afiliaciones, 'contratos')
exportContratosPDF(filtrados, contratos, afiliaciones, 'contratos')

// Individual (un empleado)
exportContratosExcel([empleado], contratos, { [id]: afiliacion }, 'contrato_juan')
exportContratosPDF([empleado], contratos, { [id]: afiliacion }, 'contrato_juan')
```

El PDF genera dos páginas: página 1 = datos del contrato, página 2 = seguridad social.

### Clientes — `lib/exportClientes.js`

```javascript
exportClientesExcel(clientes, 'clientes')
exportClientesPDF(clientes, 'clientes')
```

---

## 12. Integraciones Externas

### n8n — Automatización de workflows

Eventos que disparan n8n:
- Creación de usuario → email de bienvenida con contraseña temporal
- Recuperación de contraseña → código OTP por email

**Fallback:** Si n8n falla, el email se envía directamente vía Gmail SMTP.

```env
N8N_WEBHOOK_URL=https://tu-n8n.com/webhook/xxxxx
N8N_WEBHOOK_API_KEY=tu_api_key
```

El endpoint `/api/n8n-proxy/` reenvía las llamadas desde el frontend a n8n desde el servidor, evitando problemas de CORS.

### Gmail SMTP — Fallback de email

```env
EMAIL_HOST_USER=correo@gmail.com
EMAIL_HOST_PASSWORD=contraseña_de_aplicacion_google
```

---

## 13. Variables de Entorno

### Backend — `backend/.env`

```env
# ── PostgreSQL ──────────────────────────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rbgct
DB_USER=postgres
DB_PASSWORD=tu_password

# ── Django ──────────────────────────────────────────────────────────────
# Generar con: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
DJANGO_SECRET_KEY=clave-secreta-larga-y-aleatoria
DEBUG=False

# ── Email (Gmail SMTP) ──────────────────────────────────────────────────
EMAIL_HOST_USER=correo@gmail.com
EMAIL_HOST_PASSWORD=contraseña_app_google
DEFAULT_FROM_EMAIL=RBG CT <no-reply@rbgct.com>

# ── Frontend URL ────────────────────────────────────────────────────────
FRONTEND_URL=http://localhost:5173

# ── n8n ─────────────────────────────────────────────────────────────────
N8N_WEBHOOK_URL=http://localhost:5678/webhook/tu-webhook
N8N_WEBHOOK_API_KEY=tu-api-key-n8n

# ── Appwrite Storage ────────────────────────────────────────────────────
APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=xxxxxxxxxxxxxxxxxxxxxxxx
APPWRITE_BUCKET_ID=xxxxxxxxxxxxxxxxxxxxxxxx
APPWRITE_API_KEY=standard_xxxxxxxxxxxxxxxxxxxxxxxx
```

> Nunca commitear `.env` con credenciales reales. Usar `.env.example` como plantilla.

---

## 14. Instalación y Setup

### Requisitos previos
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

### 1. Crear la base de datos

```sql
-- En psql o pgAdmin
CREATE DATABASE rbgct;
```

### 2. Backend

```bash
cd backend

# Crear y activar entorno virtual
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux / macOS

# Instalar dependencias
pip install -r requirements.txt

# Copiar y configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Aplicar todas las migraciones (ver sección 15)
python manage.py migrate

# Iniciar servidor de desarrollo
python manage.py runserver
# Disponible en: http://localhost:8000
```

### 3. Frontend

```bash
cd frontend

npm install
npm run dev
# Disponible en: http://localhost:5173
```

### 4. Build de producción

```bash
# Frontend
cd frontend && npm run build

# Backend con Gunicorn (Linux/Mac)
cd backend
gunicorn rbgct.wsgi:application --bind 0.0.0.0:8000
```

---

## 15. Migraciones Django

Django mantiene un historial de cambios de la base de datos mediante archivos de migración en `api/migrations/` y `clientes/migrations/`.

### Aplicar todas las migraciones (setup inicial)

```bash
cd backend
venv\Scripts\activate

# Aplica las migraciones de AMBAS apps en el orden correcto:
# api primero (crea schema público + seed), luego clientes (crea schema clientes)
python manage.py migrate
```

### Ver el estado de las migraciones

```bash
# Muestra qué migraciones están aplicadas ([X]) y cuáles no ([ ])
python manage.py showmigrations

# Ver solo una app
python manage.py showmigrations api
python manage.py showmigrations clientes
```

---

### Crear nuevas migraciones

#### Cuando modificas un modelo en `api/models.py` (empleados, contratos, cursos…)

```bash
# 1. Detecta los cambios y genera el archivo de migración
python manage.py makemigrations api

# 2. Aplica la migración
python manage.py migrate api
```

#### Cuando modificas un modelo en `clientes/models.py` (empresas, servicios, documentos…)

```bash
# 1. Genera la migración
python manage.py makemigrations clientes

# 2. Aplica la migración
python manage.py migrate clientes
```

#### Ejemplo completo: agregar un campo a `DatosEmpleado`

```python
# 1. Editar api/models.py — agregar el campo
class DatosEmpleado(models.Model):
    ...
    numero_cuenta = models.CharField(max_length=30, blank=True, null=True)
```

```bash
# 2. Generar migración
python manage.py makemigrations api
# Crea: api/migrations/0005_datosempleado_numero_cuenta.py

# 3. Aplicar
python manage.py migrate api
```

#### Ejemplo completo: agregar un campo a `EmpresaCliente`

```python
# 1. Editar clientes/models.py
class EmpresaCliente(models.Model):
    ...
    logo_url = models.URLField(blank=True, null=True)
```

```bash
# 2. Generar migración
python manage.py makemigrations clientes
# Crea: clientes/migrations/0003_empresacliente_logo_url.py

# 3. Aplicar
python manage.py migrate clientes
```

---

### Migración con datos (seed / data migration)

Si necesitas insertar datos fijos (como un catálogo) junto con un cambio de esquema:

```bash
# Crear migración vacía
python manage.py makemigrations api --empty --name seed_nuevos_cargos
```

Editar el archivo generado:

```python
# api/migrations/0005_seed_nuevos_cargos.py
from django.db import migrations

def seed_cargos(apps, schema_editor):
    DatosCargo = apps.get_model('api', 'DatosCargo')
    nuevos = ['Especialista', 'Coordinador']
    for nombre in nuevos:
        DatosCargo.objects.get_or_create(nombre_cargo=nombre)

def reverse_seed(apps, schema_editor):
    pass  # no se revierte seed

class Migration(migrations.Migration):
    dependencies = [('api', '0004_seed_entidades_ss')]
    operations = [migrations.RunPython(seed_cargos, reverse_seed)]
```

```bash
python manage.py migrate api
```

---

### Migración del schema `clientes` (caso especial)

La primera migración de la app `clientes` crea el schema PostgreSQL antes de crear las tablas:

```python
# clientes/migrations/0001_initial.py (fragmento)
operations = [
    migrations.RunSQL(
        'CREATE SCHEMA IF NOT EXISTS clientes;',
        reverse_sql='DROP SCHEMA IF EXISTS clientes CASCADE;'
    ),
    migrations.CreateModel(name='EmpresaCliente', ...),
    ...
]
```

Si en algún momento necesitas recrear el schema desde cero:

```bash
# ADVERTENCIA: esto elimina todos los datos de clientes
python manage.py migrate clientes zero   # revierte todas las migraciones
python manage.py migrate clientes        # las vuelve a aplicar
```

---

### Revertir una migración específica

```bash
# Volver al estado de la migración 0002 en api
python manage.py migrate api 0002

# Volver al estado de la migración 0001 en clientes
python manage.py migrate clientes 0001
```

---

### Migraciones existentes (referencia)

#### `api/migrations/`

| Archivo | Contenido |
|---|---|
| `0001_initial_rrhh_schema.py` | Crea todas las tablas RRHH: SuperAdmin, Persona, DatosContacto, DatosEmpleado, DatosArea, DatosCargo, TareasCalendario, SolicitudesPassword, Alerta, Curso, CursoContenido, CursoHistorial, ReglamentoItem, N8nLog, ApiKey |
| `0002_seed_areas_cargos.py` | Inserta 7 áreas y 14 cargos por defecto |
| `0003_contrato_modulo.py` | Crea Contrato, ContratoRenovacion, AfiliacionSeguridadSocial, EntidadEPS/AFP/ARL, CajaCompensacion |
| `0004_seed_entidades_ss.py` | Inserta catálogo de EPS, AFP, ARL y Cajas de Colombia |

#### `clientes/migrations/`

| Archivo | Contenido |
|---|---|
| `0001_initial.py` | Crea schema `clientes` + todas las tablas: EmpresaCliente, ContactoCliente, ServicioContratado, AsignacionEquipo, DocumentoCliente, BitacoraCliente |
| `0002_asignacion_area.py` | Agrega campo `area` a AsignacionEquipo |

---

## 16. Crear SuperAdmin

### Opción 1: Script dedicado (recomendado)

```bash
cd backend
venv\Scripts\activate
python create_superadmin.py
```

### Opción 2: Django shell

```bash
python manage.py shell
```

```python
import bcrypt
from api.models import SuperAdmin

email    = "admin@rbg.com"
password = "ContraseñaSegura123!"
hashed   = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

admin = SuperAdmin.objects.create(
    email=email,
    password_hash=hashed,
    nombre="Admin",
    apellido="RBG",
    role="superadmin",
    estado="ACTIVA",
    is_staff=True,
    is_superuser=True,
)
print(f"SuperAdmin creado: {admin.email} — ID: {admin.id}")
```

### Cambiar contraseña de SuperAdmin

```python
# Django shell
import bcrypt
from api.models import SuperAdmin

admin = SuperAdmin.objects.get(email='admin@rbg.com')
nueva = "NuevaContraseña456!"
admin.password_hash = bcrypt.hashpw(nueva.encode(), bcrypt.gensalt()).decode()
admin.save()
```

---

## 17. Troubleshooting

### `could not connect to server` — PostgreSQL no responde

```bash
# Windows — verificar si el servicio está corriendo
net start postgresql-x64-15

# Ver en services.msc → buscar "postgresql"
```

### `No module named 'django'`

El entorno virtual no está activado.

```bash
cd backend
venv\Scripts\activate   # Windows
```

### `relation "clientes.cli_empresa" does not exist`

El schema `clientes` no fue creado. Aplicar las migraciones de la app `clientes`:

```bash
python manage.py migrate clientes
```

### `401 Unauthorized` en todos los endpoints

El access token expiró (15 minutos). El frontend debe llamar a `POST /api/token/refresh/` automáticamente. Verificar el interceptor en `lib/api.js`.

### `CORS` al hacer requests desde el frontend

Verificar en `settings.py`:

```python
CORS_ALLOW_ALL_ORIGINS = True   # desarrollo
# O en producción:
CORS_ALLOWED_ORIGINS = ['https://tu-dominio.com']
```

### `primer_login=True` bucle infinito

El endpoint `POST /api/completar-datos/` no está actualizando el flag. Verificar que la respuesta incluye `"primer_login": false` y que `AuthContext` actualiza el estado local.

### `AppwriteException` al subir documentos

- Verificar que las 4 variables `APPWRITE_*` están en `.env`
- Confirmar que el bucket existe en la consola de Appwrite
- Verificar que la API Key tiene permiso de escritura en el bucket (`storage.files.write`)

### Error `bcrypt hash no coincide`

```python
# Django shell — resetear contraseña manualmente
import bcrypt
from api.models import DatosEmpleado

emp = DatosEmpleado.objects.get(correo_corporativo='email@rbcol.co')
emp.password_hash = bcrypt.hashpw(b'nueva_clave', bcrypt.gensalt()).decode()
emp.save()
```

---

## Licencia

© 2026 **Russell Bedford RBG S.A.S** — Todos los derechos reservados.  
Sistema de uso interno. Versión 2.1.0 — Mayo 2026.
