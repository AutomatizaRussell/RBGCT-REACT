# GCT — Sistema de Gestión de Capital de Talento

Sistema integral para **Russell Bedford RBG S.A.S** que cubre empleados, contratos, seguridad social, CRM de clientes, formación, tareas, vacantes, automatización de workflows y herramientas documentales.

- **Producción:** `https://conecta.rbgct.cloud`
- **Deploy:** Coolify (VPS) — rama `main`
- **Correo:** AUTOMATIZACIONMEDELLIN@rbcol.co

---

## Tabla de Contenidos

1. [Arquitectura](#1-arquitectura)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Estructura de Archivos](#3-estructura-de-archivos)
4. [Base de Datos PostgreSQL](#4-base-de-datos-postgresql)
5. [Modelos — App `api`](#5-modelos--app-api-schema-público)
6. [Modelos — App `clientes`](#6-modelos--app-clientes-schema-clientes)
7. [Sistema de Roles y Permisos](#7-sistema-de-roles-y-permisos)
8. [API REST — Endpoints](#8-api-rest--endpoints)
9. [Sistema de Autenticación](#9-sistema-de-autenticación)
10. [n8n Gateway](#10-n8n-gateway)
11. [Almacenamiento — Appwrite y Media](#11-almacenamiento--appwrite-y-media)
12. [Portal de Vacantes — Supabase](#12-portal-de-vacantes--supabase)
13. [Exportación de Datos](#13-exportación-de-datos)
14. [Variables de Entorno](#14-variables-de-entorno)
15. [Instalación Local](#15-instalación-local)
16. [Docker y Producción](#16-docker-y-producción)
17. [Migraciones Django](#17-migraciones-django)
18. [Crear SuperAdmin](#18-crear-superadmin)
19. [Troubleshooting](#19-troubleshooting)

---

## 1. Arquitectura

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                              │
│   React 19 · Vite 8 · Tailwind CSS 4 · React Router 7               │
│                                                                        │
│  AdminDashboard   Admin2Dashboard   EditorDashboard   UserDashboard   │
│  (SuperAdmin)        (Admin)           (Editor)        (Empleado)     │
│                                                                        │
│  AuthContext / useAuth    ·    lib/api.js (fetch + JWT auto-refresh)  │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │ HTTPS / JSON
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Traefik (TLS)  →  nginx interno  →  Django :8000  /  React build    │
│                                                                        │
│  Django 4.2 + DRF 3.15                                                │
│  ├── api/          RRHH, contratos, cursos, tareas, auth, herramientas│
│  ├── clientes/     CRM: empresas, servicios, equipo, documentos       │
│  ├── empleados/    Modelos modulares: Persona, DatosContacto          │
│  └── formacion/    Modelos modulares: Curso, CursoModulo              │
│                                                                        │
│  Auth: JWT HS256 (custom)  +  API Key (X-API-Key)                    │
│  n8n_gateway.py → único punto de salida hacia n8n                    │
└──────┬──────────────────────────────┬────────────────────────────────┘
       │                              │
  ┌────▼────────┐            ┌────────▼──────────┐
  │ PostgreSQL  │            │  n8n workflows     │
  │ schema:     │            │  n8n.rbgct.cloud   │
  │  public     │            └────────┬───────────┘
  │  clientes   │                     │
  └─────────────┘            ┌────────▼───────────┐
       │                     │  Gmail SMTP         │
  ┌────▼────────┐            │  Resend.com         │
  │   Redis     │            └────────────────────┘
  │  (cache)    │
  └─────────────┘            ┌────────────────────┐
                             │  Appwrite Storage   │
                             │  (docs clientes)    │
                             └────────────────────┘
                             ┌────────────────────┐
                             │  Supabase           │
                             │  (vacantes)         │
                             └────────────────────┘
                             ┌────────────────────┐
                             │  Google Gemini API  │
                             │  (asistente IA)     │
                             └────────────────────┘
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
| Lucide React | 1.x | Iconografía principal |
| Phosphor Icons | 2.x | Iconografía complementaria |
| Recharts | 3.x | Gráficos y dashboards |
| jsPDF + jspdf-autotable | 4.x / 5.x | Exportación PDF |
| SheetJS (xlsx) | 0.18.x | Exportación Excel |
| react-pdf + pdfjs-dist | 10.x / 5.x | Visor de documentos PDF |
| html2canvas | 1.x | Capturas de pantalla |
| clsx | 2.x | Composición de clases CSS |
| @supabase/supabase-js | 2.x | Cliente Supabase (vacantes) |

### Backend

| Tecnología | Versión | Rol |
|---|---|---|
| Python | 3.11+ | Lenguaje base |
| Django | 4.2.x | Framework web |
| Django REST Framework | 3.14+ | API REST |
| psycopg2-binary | 2.9+ | Driver PostgreSQL |
| bcrypt | 4.x | Hash de contraseñas |
| PyJWT | 2.8+ | Tokens JWT HS256 |
| redis | 5.x | Cache distribuida |
| gunicorn | 21.x | WSGI producción (4 workers, 4 threads) |
| django-cors-headers | 4.x | CORS |
| appwrite | 6.1.0 | SDK storage documentos clientes |
| resend | 0.8+ | Email transaccional (alternativa SMTP) |
| markitdown | latest | Archivos → Markdown |
| pdf2docx / pypdf | latest | Procesamiento PDF |
| reportlab | 4.x | Generación PDF server-side |
| openpyxl | 3.x | Lectura/escritura Excel |
| Pillow | 10.x | Procesamiento imágenes |
| mammoth / htmldocx | latest | Conversión Word |

### Infraestructura

| Servicio | Uso |
|---|---|
| PostgreSQL 16 | BD principal (schemas: `public` RRHH, `clientes` CRM) |
| Redis 7 | Cache (sesiones 2FA, deduplicación, rate limiting) |
| Nginx | Reverse proxy interno (rutas `/api/` → Django, `/` → React) |
| Traefik | Proxy externo TLS (Coolify) |
| Coolify | PaaS de deploy (VPS, rama `main`) |
| n8n | Automatización: emails, onboarding, notificaciones |
| Appwrite | Storage documentos de clientes |
| Supabase | BD vacantes y postulaciones |
| Google Gemini API | Asistente IA integrado |
| Gmail SMTP / Resend | Email transaccional |

---

## 3. Estructura de Archivos

```
RBGCT-REACT/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── create_superadmin.py
│   ├── set_admin_password.py
│   │
│   ├── rbgct/                        # Config Django
│   │   ├── settings.py
│   │   ├── urls.py                   # /api/ y /clientes/
│   │   ├── appwrite_storage.py       # Storage backend Appwrite
│   │   ├── wsgi.py / asgi.py
│   │
│   ├── api/                          # App RRHH principal
│   │   ├── models.py                 # SuperAdmin, DatosEmpleado, Tarea, ApiKey, N8nLog…
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   ├── permissions.py            # IsSuperAdminUser, IsAdminOrSuperAdmin
│   │   ├── authentication.py         # JWTAuthentication + ApiKeyAuthentication
│   │   ├── jwt_utils.py
│   │   ├── middleware.py             # JWTMiddleware
│   │   ├── n8n_gateway.py            # Capa centralizada de comunicación con n8n
│   │   └── views/                    # ViewSets modulares
│   │       ├── auth.py               # Login, 2FA, refresh token
│   │       ├── empleados.py          # CRUD empleados, contacto, persona
│   │       ├── cursos.py             # Cursos, módulos, progreso, cuestionarios
│   │       ├── certificados.py       # Certificados de empleo
│   │       ├── herramientas.py       # PDF, markdown, convertidor archivos
│   │       ├── ia.py                 # Proxy Gemini + proxy n8n
│   │       └── recuperacion.py       # Recuperación de contraseña
│   │
│   ├── clientes/                     # App CRM
│   │   ├── models.py                 # EmpresaCliente, Contacto, Servicio, Asignacion…
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   │
│   ├── empleados/                    # App modelos de persona (separados de api)
│   │   └── models/
│   │       ├── __init__.py
│   │       └── persona.py            # Persona, DatosContacto, DatoAcademico, Hijo
│   │
│   └── formacion/                    # App modelos de formación (separados de api)
│       └── models/
│           ├── __init__.py
│           └── curso.py              # Curso, CursoModulo, CursoContenido, progreso…
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                   # Rutas + lazy loading + ProtectedRoute
│       ├── index.css                 # Variables CSS --rb-* + Tailwind + clases globales
│       │
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── VerifyCode.jsx
│       │   ├── CompleteProfile.jsx
│       │   ├── AdminDashboard.jsx    # SuperAdmin
│       │   ├── Admin2Dashboard.jsx   # Admin
│       │   ├── EditorDashboard.jsx   # Editor
│       │   ├── UserDashboard.jsx     # Empleado
│       │   └── EmpleadoDashboard.jsx
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── SidebarShell.jsx         # Wrapper sidebar compartido
│       │   │   ├── AdminSidebar.jsx         # Nav SuperAdmin
│       │   │   ├── SuperAdminSidebar.jsx
│       │   │   ├── EditorSidebar.jsx        # Nav Editor
│       │   │   ├── EmpleadoSidebar.jsx      # Nav Empleado
│       │   │   └── Topbar.jsx               # Header con stripe de 4 colores RB
│       │   ├── auth/
│       │   │   └── ProtectedRoute.jsx
│       │   ├── admin/
│       │   │   ├── ClientesSection.jsx
│       │   │   ├── ContratosSection.jsx
│       │   │   ├── CertificadoSection.jsx
│       │   │   └── N8nLogs.jsx
│       │   ├── empleados/
│       │   │   ├── gestion/                 # Vistas admin de empleados
│       │   │   └── portal/                  # Vistas del empleado (perfil, autogestión)
│       │   │       ├── UserProfile.jsx
│       │   │       ├── AutoGestion.jsx
│       │   │       └── ComunicadosInternos.jsx
│       │   ├── formacion/
│       │   │   ├── admin/                   # Gestión de cursos (admin)
│       │   │   ├── editor/                  # Editor de cursos
│       │   │   └── portal/                  # Portal cursos del empleado
│       │   │       └── ManualesCargo.jsx
│       │   ├── features/
│       │   │   ├── vacantes/                # Portal de vacantes (Supabase)
│       │   │   │   ├── PortalVacantes.jsx
│       │   │   │   ├── VacantesAdmin.jsx
│       │   │   │   └── VacantesResumen.jsx
│       │   │   └── FormulariosSQF/          # Formularios Calidad
│       │   ├── herramientas/
│       │   │   ├── ConvertidorArchivos.jsx
│       │   │   ├── GestorPDFPage.jsx
│       │   │   └── LimpiadorMetadatos.jsx
│       │   └── common/
│       │       └── SugerenciasChat.jsx
│       │
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   └── DataCacheContext.jsx
│       ├── hooks/
│       │   └── useAuth.js
│       └── lib/
│           ├── api.js                # Cliente HTTP (fetch + JWT auto-refresh)
│           ├── brand.js              # Tokens de color RB (inline styles)
│           ├── cn.js                 # Wrapper clsx
│           ├── colombiaData.js       # Departamentos y municipios de Colombia
│           ├── exports.js            # Re-exportaciones barrel
│           ├── exportEmpleados.js    # CSV / Excel empleados
│           ├── exportContratos.js    # PDF / Excel contratos + SS
│           └── exportClientes.js     # PDF / Excel clientes
│
├── nginx/
│   ├── nginx.conf                    # Dev
│   ├── nginx-proxy.conf              # Proxy layer
│   └── nginx-prod.conf               # Producción
│
├── docker-compose.yml                # Dev (db, backend, frontend, nginx)
├── docker-compose.prod.yml           # Prod (+ Redis, healthchecks)
├── Dockerfile.backend
├── Dockerfile.frontend
├── Dockerfile.nginx
├── scripts/
│   └── gct-watchdog.sh               # Auto-recuperación (cron del host)
└── .env.docker.example
```

---

## 4. Base de Datos PostgreSQL

La base de datos `rbgct` usa **dos schemas** para separar dominios:

| Schema | App Django | Descripción |
|---|---|---|
| `public` | `api`, `empleados`, `formacion` | RRHH, auth, contratos, cursos, tareas |
| `clientes` | `clientes` | CRM: empresas, servicios, documentos |

### Relaciones principales — Schema público

```
SuperAdmin (UUID PK)
  └── ApiKey[]

Persona
  ├── DatosContacto (1:1)
  │     correo_personal, telefono, pais/departamento/municipio/residencia
  │     detalles_residencia, direccion, emergencia
  ├── DatoAcademico[] (nivel, institución, diploma)
  ├── Hijo[]
  └── DatosEmpleado (1:1)
        correo_corporativo, area(FK), cargo(FK)
        estado, id_permisos, password_hash
        flags: datos_persona_completados, datos_academicos_completados
               acceso_formularios_sqf, es_encargado_cursos
        ├── TareasCalendario[]
        ├── Contrato[]
        │     └── ContratoRenovacion[]
        ├── AfiliacionSeguridadSocial (1:1)
        │     eps/afp/arl/caja (FKs)
        ├── ProgresoContenido[]
        ├── AsignacionFormacion[]
        ├── AsignacionOnboarding[]
        ├── Sugerencia[]
        └── N8nLog[]  (via destinatario)

Curso → CursoModulo[] → CursoContenido[]
CursoContenido → ProgresoContenido (empleado × contenido)
                 IntentoCuestionario[]
```

### Relaciones — Schema `clientes`

```
EmpresaCliente
  ├── ContactoCliente[]
  ├── ServicioContratado[] (FK → DatosArea)
  ├── AsignacionEquipo[] (FK → DatosEmpleado, DatosArea)
  ├── DocumentoCliente[] → Appwrite Storage
  ├── BitacoraCliente[]
  └── FacturacionCliente[]
```

---

## 5. Modelos — App `api` (schema público)

### `SuperAdmin`

Extiende `AbstractUser` de Django. Login por email.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID PK | |
| `email` | VARCHAR unique | campo de login |
| `nombre` / `apellido` | VARCHAR | |
| `role` | VARCHAR | siempre `"superadmin"` |
| `estado` | VARCHAR | `ACTIVA` / `INACTIVO` |
| `password` | VARCHAR | hash Django |

---

### Jerarquía de persona: `Persona` → `DatosContacto` + `DatosEmpleado`

Los datos de un empleado están en **tres tablas** para separar identidad, contacto y vínculo laboral. `DatosEmpleado` expone propiedades delegadas (`empleado.primer_nombre`, `empleado.telefono`, etc.) para compatibilidad con serializers y vistas.

#### `Persona`

| Campo | Tipo | Notas |
|---|---|---|
| `id_persona` | SERIAL PK | |
| `primer_nombre` / `segundo_nombre` | VARCHAR | segundo nullable |
| `primer_apellido` / `segundo_apellido` | VARCHAR | segundo nullable |
| `apodo` | VARCHAR(50) | nombre preferido |
| `tipo_documento` | VARCHAR(2) | `CC` `CE` `PA` `TI` |
| `numero_documento` | VARCHAR(30) | unique, nullable |
| `lugar_expedicion` / `fecha_expedicion` | — | nullable |
| `fecha_nacimiento` | DATE | nullable |
| `ciudad_nacimiento` / `departamento_nacimiento` / `pais_nacimiento` | — | nullable |
| `nacionalidad` | VARCHAR | |
| `sexo` | CHAR(1) | `M` `F` `O` |
| `tipo_sangre` | VARCHAR(3) | `A+` `A-` … `O-` |
| `estado_civil` | VARCHAR | soltero / casado / union_libre / divorciado / viudo |
| `estrato_socioeconomico` | INT | 1–6 |
| `tipo_vivienda` | VARCHAR | propia / arrendada / familiar / otro |
| `tiene_discapacidad` | BOOLEAN | |
| `descripcion_discapacidad` | TEXT | nullable |
| `certificado_discapacidad` | FileField | → `media/discapacidad/` |
| `tiene_hijos` | BOOLEAN | |
| `numero_hijos` | INT | nullable |
| `tiene_vehiculo` | BOOLEAN | |
| `tipo_vehiculo` / `placa_vehiculo` | VARCHAR | nullable |

#### `DatosContacto`

| Campo | Tipo |
|---|---|
| `persona` | 1:1 → Persona |
| `correo_personal` | EMAIL nullable |
| `telefono` | VARCHAR(20) nullable |
| `pais_residencia` / `departamento_residencia` / `municipio_residencia` | VARCHAR nullable |
| `direccion` | TEXT nullable |
| `detalles_residencia` | VARCHAR(255) nullable |
| `nombre_contacto_emergencia` / `telefono_emergencia` / `parentesco_emergencia` | — nullable |

#### `DatoAcademico`

| Campo | Tipo |
|---|---|
| `persona` | FK → Persona |
| `nivel` | VARCHAR | bachiller / tecnico / tecnologo / profesional / especializacion / maestria / doctorado / otro |
| `titulo` | VARCHAR(200) |
| `institucion` | VARCHAR(200) |
| `anio_graduacion` | INT nullable |
| `diploma` | FileField → `media/diplomas/` |

#### `Hijo`

| Campo | Tipo |
|---|---|
| `persona` | FK → Persona |
| `nombre` | VARCHAR(200) |
| `fecha_nacimiento` | DATE nullable |
| `documento` | VARCHAR(30) nullable |

#### `DatosEmpleado`

| Campo | Tipo | Notas |
|---|---|---|
| `id_empleado` | SERIAL PK | |
| `persona` | 1:1 → Persona | |
| `auth_id` | UUID | nullable |
| `correo_corporativo` | EMAIL unique | email de login |
| `area` | FK → DatosArea | nullable |
| `cargo` | FK → DatosCargo | nullable |
| `fecha_ingreso` / `fecha_retiro` | DATE | nullable |
| `estado` | VARCHAR | `ACTIVA` / `INACTIVO` |
| `id_permisos` | INT | `1`=Admin `2`=Editor `3`=Usuario |
| `password_hash` | VARCHAR | bcrypt |
| `primer_login` | BOOLEAN | → redirige a completar perfil |
| `datos_persona_completados` | BOOLEAN | |
| `datos_academicos_completados` | BOOLEAN | |
| `permitir_edicion_datos` | BOOLEAN | |
| `acceso_formularios_sqf` | BOOLEAN | |
| `acceso_sqf_clientes/contratos/facturacion/auditoria` | BOOLEAN | permisos granulares SQF |
| `es_encargado_cursos` | BOOLEAN | puede gestionar cursos |
| `ultima_actividad` | TIMESTAMP | nullable |

---

### Módulo Contratos

#### `Contrato`

| Campo | Tipo | Notas |
|---|---|---|
| `empleado` | FK → DatosEmpleado | PROTECT |
| `tipo_contrato` | VARCHAR | `termino_fijo` `termino_indefinido` `obra_labor` `prestacion_servicios` `aprendizaje` |
| `fecha_inicio` / `fecha_fin` | DATE | fin nullable |
| `fecha_firma` | DATE | nullable |
| `salario` | DECIMAL(14,2) | |
| `tipo_salario` | VARCHAR | `ordinario` / `integral` |
| `auxilio_transporte` | BOOLEAN | |
| `forma_pago` | VARCHAR | `mensual` `quincenal` `semanal` |
| `jornada` | VARCHAR | `completa` `medio_tiempo` `flexible` `por_horas` |
| `modalidad` | VARCHAR | `presencial` `remoto` `hibrido` |
| `lugar_trabajo` | VARCHAR | nullable |
| `periodo_prueba_dias` | INT | nullable |
| `pdf_contrato` | FileField | → `media/contratos/` |
| `estado` | VARCHAR | `ACTIVO` `VENCIDO` `TERMINADO` `RENOVADO` `SUSPENDIDO` |
| `motivo_terminacion` / `fecha_terminacion` | — | nullable |

#### `AfiliacionSeguridadSocial`

| Campo | Tipo |
|---|---|
| `empleado` | 1:1 → DatosEmpleado |
| `eps` | FK → EntidadEPS |
| `numero_afiliacion_eps` / `fecha_afiliacion_eps` | — |
| `afp` | FK → EntidadAFP |
| `numero_afiliacion_afp` / `fecha_afiliacion_afp` | — |
| `arl` | FK → EntidadARL |
| `nivel_riesgo_arl` | VARCHAR | I · II · III · IV · V |
| `numero_poliza_arl` / `fecha_afiliacion_arl` | — |
| `caja_compensacion` | FK → CajaCompensacion |
| `numero_afiliacion_caja` / `fecha_afiliacion_caja` | — |

Catálogos: `EntidadEPS`, `EntidadAFP`, `EntidadARL`, `CajaCompensacion` — todos con `nombre`, `codigo`, `activa`.

---

### Módulo Formación

#### `Curso`

| Campo | Tipo | Notas |
|---|---|---|
| `nombre` / `descripcion` | — | |
| `orden` | INT | posición en listado |
| `activo` | BOOLEAN | |
| `visibilidad` | VARCHAR | `todos` `area` `cargo` `persona` |
| `area` / `cargo` / `empleado_asignado` | FK nullable | según visibilidad |
| `imagen` | FileField | → `media/cursos/imagenes/` |

#### `CursoModulo`

| Campo | Tipo |
|---|---|
| `curso` | FK → Curso |
| `titulo` | VARCHAR |
| `orden` | INT |

#### `CursoContenido`

| Campo | Tipo | Notas |
|---|---|---|
| `curso` | FK → Curso | |
| `modulo` | FK → CursoModulo | nullable |
| `tipo` | VARCHAR | `youtube` `video` `documento` `texto` `enlace` `cuestionario` |
| `titulo` | VARCHAR | |
| `url` | VARCHAR | YouTube / enlace externo |
| `contenido` | TEXT | texto directo o JSON preguntas cuestionario |
| `archivo` | FileField | → `media/cursos/` |
| `orden` | INT | |
| `puntaje_aprobacion` | INT | para tipo `cuestionario` |

#### Progreso y cuestionarios

| Modelo | Descripción |
|---|---|
| `ProgresoContenido` | empleado × contenido, `completado` BOOLEAN |
| `AsignacionFormacion` | asignación/exclusión empleado × curso |
| `IntentoCuestionario` | respuestas + puntaje + aprobado |
| `NotificacionCurso` | notificación al creador cuando empleado completa |

---

### Otros modelos (`api`)

| Modelo | Tabla | Descripción |
|---|---|---|
| `TareasCalendario` | `tareas_calendario` | Tareas con estado, prioridad, asignación |
| `ReglamentoItem` | `reglamento_item` | Reglamento interno por ítems ordenables |
| `PlanOnboarding` | `plan_onboarding` | Planes de onboarding con pasos |
| `N8nLog` | `n8n_log` | Logs de todos los flujos n8n |
| `ApiKey` | `api_key` | API Keys para integraciones externas |
| `SolicitudCertificado` | — | Solicitudes de certificado de empleo |
| `Sugerencia` | `sugerencia` | Sugerencias / comentarios de empleados |
| `Alerta` | `alertas` | Alertas de seguridad (intentos de recuperación) |

---

## 6. Modelos — App `clientes` (schema `clientes`)

Todos los modelos usan `db_table = '"clientes"."cli_xxx"'`.

### `EmpresaCliente`

| Campo | Tipo | Notas |
|---|---|---|
| `razon_social` | VARCHAR(255) | |
| `nit` | VARCHAR(20) unique | |
| `digito_verificacion` | VARCHAR(1) | nullable |
| `tipo_empresa` | VARCHAR | `microempresa` `pyme` `grande` `grupo_empresarial` |
| `tamano_empresa` | VARCHAR | micro / pequeña / mediana / grande |
| `actividad_economica` | VARCHAR(10) | código CIIU |
| `descripcion_actividad` | TEXT | nullable |
| `regimen_tributario` | VARCHAR | simplificado / comun / gran_contribuyente / … |
| `ciudad` / `departamento` / `direccion` | — | nullable |
| `telefono` / `email_principal` / `website` | — | nullable |
| `camara_comercio_numero` | VARCHAR | nullable |
| `estado` | VARCHAR | `prospecto` `activo` `inactivo` `suspendido` `retirado` |
| `nivel_riesgo` | VARCHAR | `bajo` `medio` `alto` `critico` |
| `fecha_inicio_relacion` | DATE | nullable |
| `empresa_matriz` | self-FK | nullable — grupos empresariales |
| `observaciones` | TEXT | nullable |

### `ContactoCliente` · `ServicioContratado` · `AsignacionEquipo` · `DocumentoCliente` · `BitacoraCliente` · `FacturacionCliente`

Igual a la documentación anterior. `DocumentoCliente.archivo` usa `AppwriteFileStorage()`. `FacturacionCliente` es el módulo de facturación mensual por cliente/área.

---

## 7. Sistema de Roles y Permisos

```
SuperAdmin  (modelo SuperAdmin)
│  ├── Control total del sistema
│  ├── Crear / eliminar empleados y SuperAdmins
│  ├── Gestionar API Keys, alertas y configuración
│  └── Dashboard: AdminDashboard + Admin2Dashboard + EditorDashboard
│
Administrador  (DatosEmpleado, id_permisos=1)
│  ├── Gestión operativa de empleados
│  ├── Contratos y seguridad social
│  ├── CRM clientes
│  ├── Certificados de empleo
│  └── Dashboard: Admin2Dashboard
│
Editor  (DatosEmpleado, id_permisos=2)
│  ├── Crear y editar cursos (si es_encargado_cursos=True)
│  ├── Reglamento interno
│  └── Dashboard: EditorDashboard
│
Usuario  (DatosEmpleado, id_permisos=3)
   ├── Ver y editar perfil propio
   ├── Cursos asignados + progreso
   ├── Ver clientes asignados
   ├── Solicitar certificado de empleo
   ├── Sugerencias
   └── Dashboard: UserDashboard / EmpleadoDashboard
```

### Flags de acceso en `DatosEmpleado`

| Flag | Efecto |
|---|---|
| `primer_login = True` | Redirige a `/completar-perfil` obligatoriamente |
| `datos_persona_completados = False` | Aviso de perfil incompleto |
| `permitir_edicion_datos = True` | Habilita auto-edición de contacto y persona |
| `es_encargado_cursos = True` | Acceso al editor de cursos |
| `acceso_formularios_sqf = True` | Acceso al módulo SQF |
| `estado = 'INACTIVO'` | Login denegado |

---

## 8. API REST — Endpoints

**Base URL producción:** `https://conecta.rbgct.cloud`  
**Base URL local:** `http://localhost:8000`  
**Auth:** `Authorization: Bearer <access_token>` · `X-API-Key: <key>`

### Autenticación y sesión

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/login/` | Login (siempre dispara código 2FA) |
| POST | `/api/token/refresh/` | Renovar access token |
| POST | `/api/enviar-codigo/` | Reenviar OTP |
| POST | `/api/verificar-codigo/` | Verificar OTP → retorna JWT |
| POST | `/api/recuperar-password/` | Solicitar código de recuperación |
| POST | `/api/verificar-codigo-recuperacion/` | Verificar código |
| POST | `/api/restablecer-password/` | Establecer nueva contraseña |
| POST | `/api/ping/` | Heartbeat de actividad |
| GET | `/api/health/` | Health check (BD + cache) — público |

### Empleados

| Método | Endpoint | Descripción |
|---|---|---|
| GET/POST | `/api/empleados/` | Listar / crear |
| GET/PATCH/DELETE | `/api/empleados/{id}/` | Detalle |
| POST | `/api/empleados/{id}/cambiar_estado/` | Activar / desactivar |
| POST | `/api/empleados/{id}/actualizar-password/` | Cambiar contraseña |
| GET | `/api/empleados/{id}/historial/` | Historial del empleado |
| GET | `/api/empleados/{id}/academicos/` | Académicos de un empleado (admin) |
| POST | `/api/crear-usuario/` | Crear usuario completo |
| POST | `/api/completar-datos/` | Completar perfil primer login |
| PATCH | `/api/mi-contacto/` | El empleado actualiza su contacto |
| PATCH | `/api/mi-persona/` | El empleado actualiza sus datos personales |
| GET | `/api/mi-organigrama/` | Organigrama del empleado |
| GET/POST | `/api/mis-academicos/` · `/{id}/` | Datos académicos propios |
| GET/POST | `/api/mis-hijos/` · `/{id}/` | Hijos propios |
| POST/DELETE | `/api/mi-certificado-discapacidad/` | Certificado discapacidad |
| POST | `/api/habilitar-edicion/` | Habilitar edición individual |
| POST | `/api/habilitar-edicion-masiva/` | Habilitar edición masiva |
| POST | `/api/toggle-encargado-cursos/` | Toggle gestor de cursos |
| GET | `/api/actividad-reciente/` | Log de actividad reciente |

### Áreas · Cargos · SuperAdmins

| Método | Endpoint |
|---|---|
| GET/POST · PATCH/DELETE | `/api/areas/` · `/api/areas/{id}/` |
| GET/POST · PATCH/DELETE | `/api/cargos/` · `/api/cargos/{id}/` |
| GET/POST · PATCH/DELETE | `/api/superadmins/` · `/api/superadmins/{id}/` |

### Contratos y Seguridad Social

| Método | Endpoint | Descripción |
|---|---|---|
| GET/POST | `/api/contratos/` | Listar / crear |
| GET/PATCH | `/api/contratos/{id}/` | Detalle |
| POST | `/api/contratos/{id}/terminar/` | Terminar contrato |
| POST | `/api/contratos/{id}/renovar/` | Renovar contrato |
| GET | `/api/contratos/activo/{empleadoId}/` | Contrato activo de un empleado |
| GET/POST · PATCH | `/api/afiliaciones-ss/` · `/api/afiliaciones-ss/{id}/` | SS |
| GET | `/api/afiliaciones-ss/empleado/{id}/` | SS de un empleado |
| GET | `/api/entidades-eps/` · `/api/entidades-afp/` · `/api/entidades-arl/` · `/api/cajas-compensacion/` | Catálogos |

### Formación y Cursos

| Método | Endpoint | Descripción |
|---|---|---|
| GET/POST | `/api/cursos/` · `/{id}/` | CRUD cursos |
| POST | `/api/cursos/reordenar/` | Reordenar cursos |
| GET | `/api/cursos/mi-progreso-global/` | Progreso global del empleado |
| GET | `/api/cursos/{id}/mi-progreso/` | Progreso en un curso |
| POST | `/api/cursos/{id}/marcar-progreso/` | Marcar contenido completado |
| GET | `/api/cursos/por-area/` | Cursos de un área |
| GET | `/api/cursos/resumen-empleados/` | Resumen formación por empleado |
| GET | `/api/cursos/{id}/exportar-calificaciones/` | Export calificaciones |
| GET/POST | `/api/curso-modulos/` · `/{id}/` | CRUD módulos |
| POST | `/api/curso-modulos/{id}/reordenar/` | |
| GET/POST | `/api/curso-contenido/` · `/{id}/` | CRUD contenidos |
| POST | `/api/curso-contenido/reordenar/` | |
| POST | `/api/curso-contenido/{id}/enviar-respuestas/` | Respuestas cuestionario |
| GET | `/api/curso-contenido/{id}/mis-intentos/` | Mis intentos |
| GET | `/api/curso-contenido/{id}/resultados/` | Resultados (admin) |
| GET | `/api/curso-historial/` | Historial de cambios |
| GET/POST | `/api/asignaciones-formacion/toggle/` · `/batch-asignar/` · `/toggle-exclusion/` | |
| GET | `/api/asignaciones-formacion/resumen-area/` | |
| GET/POST | `/api/notificaciones-cursos/` · `/{id}/` | |
| POST | `/api/notificaciones-cursos/marcar-todas-leidas/` | |

### Onboarding

| Método | Endpoint |
|---|---|
| GET/POST | `/api/planes-onboarding/` · `/{id}/` |
| POST | `/api/planes-onboarding/{id}/pasos/` · `/{paso_id}/` |
| POST | `/api/planes-onboarding/{id}/reordenar/` |
| GET | `/api/planes-onboarding/mis-planes/` |
| POST | `/api/planes-onboarding/toggle/` · `/batch-asignar/` |
| GET | `/api/planes-onboarding/resumen-area/` |

### Reglamento · Tareas · Sugerencias

| Método | Endpoint |
|---|---|
| GET/POST · PATCH/DELETE | `/api/reglamento/` · `/{id}/` |
| POST | `/api/reglamento/{id}/mover/` |
| GET/POST · PATCH/DELETE | `/api/tareas/` · `/{id}/` |
| GET | `/api/tareas/resumen/` |
| POST | `/api/sugerencias/` |
| GET | `/api/sugerencias/mias/` · `/listado/` |
| POST | `/api/sugerencias/{id}/recibir/` · `/vista/` |

### Certificados de empleo

| Método | Endpoint |
|---|---|
| POST | `/api/enviar-certificado/` |
| POST | `/api/solicitudes-cert/crear/` |
| GET | `/api/solicitudes-cert/` |
| PATCH | `/api/solicitudes-cert/{id}/atender/` |
| GET | `/api/cert-permisos/` |
| POST | `/api/cert-permisos/set/` |

### Herramientas documentales

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/convertir-markdown/` | Archivo → Markdown (MarkItDown) |
| POST | `/api/convertir-archivo/` | PDF / Excel / Word entre formatos |
| POST | `/api/gestor-pdf/` | Fusionar, dividir, rotar PDFs |
| POST | `/api/descargar-archivo/` | Descarga desde SharePoint vía n8n |

### IA y n8n

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/gemini-chat/` | Proxy al asistente Google Gemini |
| GET | `/api/n8n-proxy/` | Proxy estado / ejecuciones n8n |
| GET | `/api/n8n-logs/` | Logs de flujos n8n |
| GET | `/api/alertas-recuperacion/` | Alertas de seguridad |
| POST | `/api/alertas-recuperacion/{id}/atender/` | Atender alerta |
| GET/POST | `/api/api-keys/` · `/{id}/` | Gestión API Keys |
| POST | `/api/api-keys/{id}/revoke/` · `/activate/` | |

### CRM Clientes (`/api/clientes/`)

| Método | Endpoint |
|---|---|
| GET/POST · PATCH/DELETE | `/api/clientes/empresas/` · `/{id}/` |
| GET | `/api/clientes/empresas/stats/` |
| GET | `/api/clientes/empresas/mis_clientes/` |
| GET | `/api/clientes/empresas/{id}/por_areas/` · `/contactos/` · `/servicios/` · `/equipo/` · `/bitacora/` |
| POST | `/api/clientes/empresas/from_sqf/` |
| GET/POST · PATCH/DELETE | `/api/clientes/contactos/` · `/{id}/` |
| GET/POST · PATCH/DELETE | `/api/clientes/servicios/` · `/{id}/` |
| POST | `/api/clientes/servicios/from_sqf/` |
| GET/POST · PATCH/DELETE | `/api/clientes/asignaciones/` · `/{id}/` |
| GET/POST | `/api/clientes/documentos/` · `/{id}/` |
| GET/POST · PATCH/DELETE | `/api/clientes/bitacora/` · `/{id}/` |
| GET/POST | `/api/clientes/facturacion/` |
| POST | `/api/clientes/facturacion/from_sqf/` |

---

## 9. Sistema de Autenticación

### Flujo Login (siempre con 2FA)

```
1. POST /api/login/ { email, password }
        └→ Genera código OTP → lo envía al email vía n8n (async)
           Retorna { requiere_verificacion: true }

2. POST /api/verificar-codigo/ { email, codigo }
        └→ Verifica OTP en cache (Redis, TTL 15 min)
           Retorna { accessToken, refreshToken, user, role }

3. Frontend guarda tokens → redirige según rol:
   superadmin → /admin
   id_permisos=1 → /admin2
   id_permisos=2 → /editor
   id_permisos=3 → /app

4. Si primer_login=True → redirige a /completar-perfil antes del dashboard
```

### Tokens JWT (HS256, custom — no SimpleJWT)

```json
{
  "sub": "<user_id>",
  "type": "superadmin | empleado",
  "token_type": "access | refresh",
  "exp": 1748000000,
  "iat": 1747999100
}
```

- **Access token:** TTL 15 minutos
- **Refresh token:** TTL 7 días
- **Auto-refresh:** `lib/api.js` intercepta 401 `TOKEN_EXPIRED` y renueva automáticamente con cola de requests pendientes

### API Key (`X-API-Key` header)

Solo SuperAdmin puede crear API Keys. Soportan IP whitelist y permisos granulares por key. Útiles para n8n, scripts e integraciones externas.

---

## 10. n8n Gateway

`backend/api/n8n_gateway.py` es la **única capa de comunicación entre Django y n8n**. Ningún view habla directamente con n8n.

### Flujos registrados

| Key | Workflow en n8n | Modo | Descripción |
|---|---|---|---|
| `bienvenida` | `bienvenida_nuevo_usuario` | Bloqueante + fallback SMTP | Email credenciales nuevo usuario |
| `login_codigo` | `login_codigo_verificacion` | Asíncrono | Código 2FA login |
| `recuperacion_pwd` | `recuperacion_password` | Bloqueante | Código recuperación contraseña |
| `pwd_restablecida` | `notificacion_password_restablecida` | Asíncrono | Notificación admin tras reset |
| `certificado_empleo` | `certificado_empleo` | Bloqueante | Certificado PDF adjunto por email |
| `descarga_intranet` | `descarga_intranet_sharepoint` | Bloqueante | Archivos desde SharePoint |

### Funciones públicas

```python
from api.n8n_gateway import (
    enviar_bienvenida,           # (email, codigo, password, nombre)
    enviar_codigo_login,         # (email, codigo, nombre) — async
    enviar_recuperacion_password,# (email, codigo, nombre)
    notificar_password_restablecida, # (email, nombre, area, cargo) — async
    enviar_certificado_empleo,   # (email, html, nombre, pdf_b64, pdf_nombre)
    descargar_intranet,          # (tipo, archivo) → Response
    sincronizar_ejecuciones_async,   # (executions) — persiste logs n8n
)
```

Cada llamada registra el resultado en `N8nLog` automáticamente.

---

## 11. Almacenamiento — Appwrite y Media

### Appwrite Storage (solo documentos de clientes)

`DocumentoCliente.archivo` usa `storage=AppwriteFileStorage()` definido en `rbgct/appwrite_storage.py`.

- **Subir:** `_save()` → `storage.create_file()` → path `bucket_id/file_id/nombre.ext`
- **URL:** `{endpoint}/storage/buckets/{bucket}/files/{file_id}/view?project={project}`
- **Eliminar:** `storage.delete_file()`

### Filesystem local (`backend/media/`)

Todos los demás `FileField` usan el disco local:

| Path | Contenido |
|---|---|
| `media/contratos/` | PDFs de contratos |
| `media/contratos/renovaciones/` | PDFs de renovaciones |
| `media/cursos/` | Archivos de contenidos de cursos |
| `media/cursos/imagenes/` | Portadas de cursos |
| `media/diplomas/` | Diplomas académicos |
| `media/discapacidad/` | Certificados de discapacidad |

---

## 12. Portal de Vacantes — Supabase

El módulo de vacantes usa **Supabase** independiente (no la BD principal):

- **Schema:** `rbgct`
- **Tablas:** `vacantes`, `postulaciones`
- **Cliente:** `lib/supabaseVacantes.js` → `@supabase/supabase-js`
- **Componentes:** `PortalVacantes.jsx` (público, `/vacantes`), `VacantesAdmin.jsx` (gestión), `VacantesResumen.jsx` (widget empleado)

Variables requeridas: `supabaseUrl` y `supabaseKey` (anon pública) hardcodeadas en `supabaseVacantes.js`.

---

## 13. Exportación de Datos

### Empleados — `lib/exportEmpleados.js`

```javascript
exportEmpleadosCSV(empleados, 'empleados_rrhh')
exportEmpleadosXLSX(empleados, 'empleados_rrhh')
```

Incluye: identidad, datos personales, contacto (con departamento/municipio), emergencia, laboral, rol, auditoría.

### Contratos — `lib/exportContratos.js`

```javascript
exportContratosExcel(filtrados, contratos, afiliaciones, 'contratos')
exportContratosPDF(filtrados, contratos, afiliaciones, 'contratos')
```

PDF genera 2 páginas: hoja 1 = contrato laboral, hoja 2 = seguridad social.

### Clientes — `lib/exportClientes.js`

```javascript
// Lista de clientes
exportClientesListaExcel(empresas)
exportClientesListaPDF(empresas)

// Ficha individual (multisheet: Info, Contactos, Servicios, Equipo)
exportClienteExcel(empresa)
exportClientePDF(empresa)

// Dashboard (KPIs, distribución, facturación, equipo)
exportDashboardExcel(stats, 'Mi Área')
exportDashboardPDF(stats, 'Mi Área')
```

---

## 14. Variables de Entorno

### Backend (`.env` / variables de Coolify)

```env
# ── Django ───────────────────────────────────────────────────────────
DJANGO_SECRET_KEY=clave-secreta-larga-aleatoria
DEBUG=False

# ── PostgreSQL ───────────────────────────────────────────────────────
DB_HOST=db
DB_PORT=5432
DB_NAME=rbgct
DB_USER=rbgct
DB_PASSWORD=tu_password

# ── Frontend ─────────────────────────────────────────────────────────
FRONTEND_URL=https://conecta.rbgct.cloud

# ── Email ────────────────────────────────────────────────────────────
EMAIL_HOST_USER=correo@gmail.com
EMAIL_HOST_PASSWORD=app_password_google
DEFAULT_FROM_EMAIL=noreply@rbgct.cloud
RESEND_API_KEY=re_xxxxx          # alternativa a Gmail

# ── n8n ──────────────────────────────────────────────────────────────
N8N_WEBHOOK_URL=https://n8n.rbgct.cloud/webhook/xxxxx
N8N_WEBHOOK_API_KEY=tu-api-key-n8n
N8N_SHAREPOINT_DOWNLOAD_WEBHOOK=https://n8n.rbgct.cloud/webhook/yyyyy

# ── Appwrite Storage ─────────────────────────────────────────────────
APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=xxxx
APPWRITE_BUCKET_ID=xxxx
APPWRITE_API_KEY=standard_xxxx

# ── Google Gemini ─────────────────────────────────────────────────────
GEMINI_API_KEY=AIzaxxxx

# ── Cache ─────────────────────────────────────────────────────────────
CACHE_BACKEND=redis            # o file, locmem
REDIS_URL=redis://redis:6379/0

# ── Gunicorn (producción) ─────────────────────────────────────────────
GUNICORN_WORKERS=4
GUNICORN_THREADS=4
GUNICORN_TIMEOUT=120
```

> **Nunca commitear `.env` con credenciales reales.** Usar `.env.docker.example` como plantilla.

---

## 15. Instalación Local

### Requisitos

- Python 3.11+
- Node.js 20+
- PostgreSQL 16+
- Redis (opcional en dev, recomendado)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux / macOS

pip install -r requirements.txt

cp .env.example .env
# Editar .env con credenciales locales

python manage.py migrate
python manage.py runserver     # http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

### Con Docker Compose (dev)

```bash
# Copiar y editar variables de entorno
cp .env.docker.example .env.docker

docker-compose up -d
# Frontend: http://localhost
# API:      http://localhost/api/
```

---

## 16. Docker y Producción

### Servicios del compose

| Servicio | Imagen | Puerto interno |
|---|---|---|
| `db` | postgres:16 | 5432 |
| `backend` | Dockerfile.backend | 8000 |
| `frontend` | Dockerfile.frontend | — (build estático) |
| `nginx` | Dockerfile.nginx | 80 |
| `redis` | redis:7 (solo prod) | 6379 |

### Deploy con Coolify

1. Coolify apunta a la rama `main` del repositorio.
2. Hacer push a `main` **no** dispara el deploy automáticamente — lanzarlo manualmente desde la UI de Coolify.
3. Traefik (proxy de Coolify) enruta `conecta.rbgct.cloud` → nginx interno del stack.

> **Label crítica en nginx:** `traefik.docker.network=hqso6bdpvt7izvvlu2fq541t`  
> No eliminarla — sin ella Traefik elige la IP de la red incorrecta y produce 504s intermitentes.

### Watchdog de auto-recuperación

`scripts/gct-watchdog.sh` corre cada minuto vía cron del host:
- Reinicia contenedores en estado `unhealthy`.
- Si la ruta externa Traefik→nginx falla 3 min pero la interna está sana → reinicia solo nginx.
- Health endpoint: `GET /api/health/` (verifica BD + cache).

```bash
# Ver logs del watchdog en VPS
tail -f /var/log/gct-watchdog.log
```

### Cambios en nginx en caliente

Usar `docker restart <contenedor-nginx>`, **no** `nginx -s reload` — un reload ha dejado conexiones colgadas con Traefik y generado 504s.

---

## 17. Migraciones Django

```bash
# Aplicar todas las migraciones (setup inicial)
python manage.py migrate

# Ver estado
python manage.py showmigrations

# Nuevo campo en un modelo
python manage.py makemigrations <app>
python manage.py migrate <app>

# Revertir a una migración específica
python manage.py migrate api 0003
```

### Apps y sus migraciones

| App | Schema | Migraciones destacadas |
|---|---|---|
| `api` | public | RRHH, contratos, cursos, tareas, seed áreas/cargos/EPS/AFP/ARL |
| `clientes` | clientes | Crea schema `clientes`, CRM completo |
| `empleados` | public | Persona extendida, DatosContacto, DatoAcademico, Hijo |
| `formacion` | public | Curso modular, módulos, progreso, cuestionarios |

> La primera migración de `clientes` ejecuta `CREATE SCHEMA IF NOT EXISTS clientes;` — si falla por permisos, verificar que el usuario de BD tiene `CREATE` sobre la base de datos.

---

## 18. Crear SuperAdmin

### Opción 1: Script dedicado

```bash
cd backend
venv\Scripts\activate
python create_superadmin.py
```

### Opción 2: Django shell

```python
import bcrypt
from api.models import SuperAdmin

email    = "admin@rbgcol.co"
password = "ContraseñaSegura123!"
hashed   = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

SuperAdmin.objects.create(
    email=email,
    password_hash=hashed,
    nombre="Admin",
    apellido="RBG",
    role="superadmin",
    estado="ACTIVA",
    is_staff=True,
    is_superuser=True,
)
```

### Cambiar contraseña de SuperAdmin

```python
import bcrypt
from api.models import SuperAdmin

admin = SuperAdmin.objects.get(email='admin@rbgcol.co')
admin.password_hash = bcrypt.hashpw(b'NuevaClave456!', bcrypt.gensalt()).decode()
admin.save()
```

---

## 19. Troubleshooting

### `could not connect to server` — PostgreSQL no responde

```bash
# Ver si el servicio corre (VPS / Linux)
systemctl status postgresql

# En Docker
docker-compose ps db
docker-compose logs db
```

### `relation "clientes.cli_empresa" does not exist`

El schema `clientes` no fue creado. Verificar permisos del usuario de BD y aplicar migración:

```bash
python manage.py migrate clientes
```

### `401 Unauthorized` en todos los endpoints

Access token expirado. El frontend debería renovarlo automáticamente. Verificar que `lib/api.js` detecta el código `TOKEN_EXPIRED` y llama a `POST /api/token/refresh/`.

### `504 Gateway Timeout` intermitentes en producción

Causa más común: Traefik elige la IP de la red `gct-network-prod` en lugar de la red de Coolify.  
Verificar que la label `traefik.docker.network=hqso6bdpvt7izvvlu2fq541t` está presente en el servicio nginx del compose. Ver también `/var/log/gct-watchdog.log`.

### `AppwriteException` al subir documentos

- Verificar las 4 variables `APPWRITE_*` en el entorno.
- Confirmar que el bucket existe en la consola de Appwrite.
- La API Key debe tener permiso `storage.files.write`.

### Código 2FA no llega al email

1. Verificar que n8n está activo: `GET /api/n8n-proxy/?action=status`
2. Si n8n está caído, el fallback SMTP (Gmail) solo aplica para emails de bienvenida, no para el código de login.
3. Revisar `N8nLog` en la UI admin para ver el error exacto.

### `bcrypt hash no coincide` — empleado no puede hacer login

```python
# Django shell — resetear contraseña
import bcrypt
from api.models import DatosEmpleado

emp = DatosEmpleado.objects.get(correo_corporativo='email@rbcol.co')
emp.password_hash = bcrypt.hashpw(b'nueva_clave_temporal', bcrypt.gensalt()).decode()
emp.save()
```

### `No module named 'django'`

El entorno virtual no está activado:

```bash
cd backend
venv\Scripts\activate   # Windows
source venv/bin/activate  # Linux / macOS
```

---

## Diseño — Sistema de Marca

### Tokens de color (`lib/brand.js` · `index.css`)

| Token | Hex | CSS var | Uso |
|---|---|---|---|
| Navy | `#001871` | `--rb-blue` | Color primario, sidebars, headers |
| Light Blue | `#00a9ce` | `--rb-light-blue` | Acentos, links |
| Purple | `#981d97` | `--rb-magenta` | Stripe Topbar, badges |
| Teal | `#00bfb3` | `--rb-turquoise` | Stripe Topbar, indicadores |
| Orange | `#ed8b00` | `--rb-orange` | Stripe Topbar, alertas |

### Clases CSS globales (definidas en `index.css`)

| Clase | Descripción |
|---|---|
| `.rb-card` | Card estilo corporativo |
| `.rb-title-gradient` | Título con gradiente navy→lightblue |
| `.rb-sidebar-item` | Item de navegación sidebar |
| `.rb-sidebar-item-active` | Item activo (gradiente navy) |
| `.input-modern` | Input estilizado |
| `.no-scrollbar` | Oculta scrollbar visualmente |
| `.no-upper` | Previene `text-transform: uppercase` |

---

© 2026 **Russell Bedford RBG S.A.S** — Uso interno.  
Versión 3.0.0 — Julio 2026 | Rama: `main`
