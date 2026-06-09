# GCT — Sistema de Gestión de Capital de Talento

## Identidad del Proyecto

**GCT** es el sistema integral de gestión interna para **Russell Bedford RBG S.A.S**, una empresa colombiana de servicios profesionales. Es una plataforma HR + CRM que centraliza empleados, contratos, seguridad social, clientes, capacitación, tareas y herramientas documentales.

- **Dominio producción:** `conecta.rbgct.cloud`
- **Correo:** AUTOMATIZACIONMEDELLIN@rbcol.co
- **Rama activa:** `ui/redesign-rb` (migración UI a estilo corporativo Russell Bedford)

---

## Stack Tecnológico

### Frontend
- **React 19** + **Vite 8** (bundler/dev server, sin Next.js)
- **React Router DOM 7** (SPA routing)
- **Tailwind CSS 4** (utilidades)
- **Recharts 3** (gráficos/dashboards)
- **jsPDF + jspdf-autotable** (PDF generation)
- **SheetJS (xlsx)** (Excel export)
- **react-pdf 10** + **pdfjs-dist** (PDF viewer)
- **Lucide React** (icons)
- **html2canvas** (screenshots)
- **clsx** (class composition)
- **Package name:** `rg-conectar`

### Backend
- **Python 3.11** + **Django 4.2** + **Django REST Framework 3.15**
- **PostgreSQL 16** (2 schemas: `public` para RRHH, `clientes` para CRM)
- **JWT HS256** (custom, no SimpleJWT) + **API Key** auth
- **Gunicorn** (production WSGI: 4 workers, 4 threads, 120s timeout)
- **django-cors-headers**, **PyJWT**, **bcrypt**
- **Appwrite SDK 6.1** (almacenamiento documentos clientes)
- **Document tools:** markitdown, pdf2docx, pypdf, reportlab, openpyxl, Pillow
- **Cache:** redis, file, o locmem
- **Email:** Gmail SMTP + Resend.com

### Infraestructura
- **Docker Compose** (4 servicios: db, backend, frontend, nginx)
- **Nginx** reverse proxy (routes `/api/` → Django:8000, `/` → React)
- **n8n** (`n8n.rbgct.cloud`) — automatización (onboarding, certificados, notificaciones)
- **Redis 7** (producción, cache)
- **Appwrite** (almacenamiento cloud documentos)
- **Google Gemini API** (asistente IA integrado)

---

## Estructura de Directorios

```
/home/gct/
├── backend/                    # Django REST API
│   ├── api/                    # App RRHH (core)
│   │   ├── models.py           # SuperAdmin, DatosEmpleado, Empleado, Tarea, Curso, etc.
│   │   ├── views.py            # ViewSets (DRF)
│   │   ├── urls.py             # Router RRHH
│   │   ├── serializers.py       # Serializers
│   │   ├── permissions.py       # Custom permissions
│   │   ├── authentication.py    # JWT + API Key
│   │   ├── jwt_utils.py         # Token generation
│   │   ├── middleware.py        # JWT middleware
│   │   └── management/          # Commands (migrate_from_sqlite)
│   ├── clientes/               # App CRM
│   │   ├── models.py           # EmpresaCliente, ContactoCliente, ServicioCliente, DocumentoCliente
│   │   ├── views.py            # ViewSets CRM
│   │   └── urls.py             # Router Clientes
│   ├── rbgct/                  # Django project config
│   │   ├── settings.py         # Settings (DB, auth, Appwrite, n8n, Gemini)
│   │   ├── urls.py             # Root URL router
│   │   ├── wsgi.py             # WSGI entrypoint
│   │   ├── asgi.py             # ASGI entrypoint
│   │   └── appwrite_storage.py # Custom Appwrite storage backend
│   ├── manage.py               # Django management CLI
│   ├── requirements.txt         # Dependencies
│   ├── create_superadmin.py    # Utility: create first admin
│   ├── set_admin_password.py   # Utility: set admin password
│   └── migrate_from_sqlite.py  # Utility: SQLite → PostgreSQL migration
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── main.jsx            # React entry point
│   │   ├── App.jsx             # Router root + protected route logic
│   │   ├── index.css           # Global styles + Tailwind import + CSS vars
│   │   ├── App.css             # (Vite scaffold, mostly unused)
│   │   ├── pages/
│   │   │   ├── Login.jsx                   # Public login
│   │   │   ├── CompleteProfile.jsx         # First login profile
│   │   │   ├── VerifyCode.jsx              # Email code verification
│   │   │   ├── AdminDashboard.jsx          # superadmin only
│   │   │   ├── Admin2Dashboard.jsx         # superadmin + admin
│   │   │   ├── EditorDashboard.jsx         # editor + admin + superadmin
│   │   │   ├── UserDashboard.jsx           # all roles (employee portal)
│   │   │   └── FormulariosSQF.css
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── SidebarShell.jsx       # Shared sidebar wrapper
│   │   │   │   ├── Sidebar.jsx            # SuperAdmin sidebar
│   │   │   │   ├── Admin2Sidebar.jsx      # Admin sidebar
│   │   │   │   ├── EditorSidebar.jsx      # Editor sidebar
│   │   │   │   ├── UserSidebar.jsx        # Employee sidebar
│   │   │   │   └── Topbar.jsx             # Sticky header (4-color brand stripe)
│   │   │   ├── auth/
│   │   │   │   └── ProtectedRoute.jsx
│   │   │   ├── ui/
│   │   │   │   ├── StatCard.jsx
│   │   │   │   ├── ActionButton.jsx
│   │   │   │   └── RecentUserRow.jsx
│   │   │   ├── admin/
│   │   │   │   └── ApiKeyManager.jsx
│   │   │   ├── admin2/
│   │   │   │   ├── GeminiChat.jsx
│   │   │   │   ├── CursosSection.jsx
│   │   │   │   ├── UtilidadesSection.jsx
│   │   │   │   ├── ClientesSection.jsx
│   │   │   │   ├── ContratosSection.jsx
│   │   │   │   └── CertificadoSection.jsx
│   │   │   ├── users/
│   │   │   │   ├── UserTable.jsx
│   │   │   │   ├── UserProfile.jsx
│   │   │   │   ├── CreateUserPage.jsx
│   │   │   │   ├── AutoGestion.jsx
│   │   │   │   ├── MisClientes.jsx
│   │   │   │   ├── MisClienteDetalle.jsx
│   │   │   │   ├── ManualesCargo.jsx
│   │   │   │   ├── ComunicadosInternos.jsx
│   │   │   │   ├── N8nLogs.jsx
│   │   │   │   ├── SystemSettings.jsx
│   │   │   │   ├── RoleModal.jsx
│   │   │   │   └── UserTableadm2.jsx
│   │   │   ├── tasks/
│   │   │   │   ├── TaskManager.jsx
│   │   │   │   ├── TaskDashboard.jsx
│   │   │   │   └── TaskCalendar.jsx
│   │   │   ├── editor/
│   │   │   │   ├── EditorCursos.jsx
│   │   │   │   └── EditorHistorial.jsx
│   │   │   └── tools/
│   │   │       ├── LimpiadorMetadatos.jsx
│   │   │       ├── GestorPDF.jsx
│   │   │       └── ConvertidorArchivos.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # User, token, role state
│   │   │   └── DataCacheContext.jsx # Cached API responses
│   │   ├── hooks/
│   │   │   └── useAuth.js
│   │   ├── lib/
│   │   │   ├── api.js              # Axios instance + all API calls
│   │   │   ├── brand.js            # BRAND tokens + RB_STYLES
│   │   │   ├── cn.js               # clsx wrapper
│   │   │   ├── exportEmpleados.js  # Employee Excel export
│   │   │   ├── exportClientes.js   # Client Excel export
│   │   │   └── exportContratos.js  # Contract Excel export
│   │   └── assets/
│   │       ├── russell-bedford-logo.png
│   │       ├── hero.png
│   │       ├── vite.svg
│   │       └── react.svg
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── nginx/                      # Nginx reverse proxy
│   ├── nginx.conf              # Dev config
│   ├── nginx-proxy.conf        # Proxy layer config
│   └── nginx-prod.conf         # Production config
│
├── docker/                     # Database init + backups
│   ├── init-db.sql             # Creates schemas + tables
│   └── backup-*.sh             # Backup scripts
│
├── docker-compose.yml          # Dev: db, backend, frontend, nginx
├── docker-compose.prod.yml     # Prod: + Redis, stricter healthchecks
├── Dockerfile.backend          # Multi-stage Python build
├── Dockerfile.frontend         # React build
├── Dockerfile.nginx            # Nginx image
├── .env.docker                 # Dev env vars
├── .env.example                # Env template
├── .env.production.example     # Prod env template
├── Makefile                    # Build/deploy shortcuts
├── deploy.sh                   # VPS deployment script
├── README.md                   # Original docs (puede estar outdated)
└── CLAUDE.md                   # THIS FILE — contexto para agentes
```

---

## Routing y Control de Roles (Frontend)

El `App.jsx` define rutas protegidas basadas en rol:

| Path | Rol requerido | Componente | Propósito |
|------|---|---|---|
| `/` | Público | Login | Autenticación |
| `/completar-perfil` | Nuevo usuario | CompleteProfile | Setup inicial |
| `/verify-code` | Login flow | VerifyCode | 2FA por email |
| `/admin` | `superadmin` | AdminDashboard | Panel de control (gestión de todo) |
| `/admin2` | `superadmin`, `admin` | Admin2Dashboard | Panel operacional |
| `/editor` | `editor`, `admin`, `superadmin` | EditorDashboard | Gestión de contenido |
| `/app` | Todos autenticados | UserDashboard | Portal empleado |

**Estructura sidebar por rol:**
- **SuperAdmin** (Sidebar.jsx): Panel General, Personal, Tareas, n8n Logs, Ajustes, API Keys
- **Admin** (Admin2Sidebar.jsx): Resumen Equipo, Colaboradores, Calendario, Auto Gestión, Utilidades, Certificados
- **Editor** (EditorSidebar.jsx): Dashboard, Tareas, Cursos, Historial, Herramientas, Perfil
- **Employee** (UserSidebar.jsx): Mi resumen, Auto gestión, Mis clientes, Mi perfil, Cursos, Reglamento, Herramientas, SQF

---

## Sistema de Diseño (Brand)

### Tokens de Color
Centralizados en `frontend/src/lib/brand.js`:

```js
export const BRAND = {
  navy: '#001871',      // Azul corporativo RB
  lightBlue: '#00a9ce', // Cyan
  purple: '#981d97',    // Magenta/púrpura
  teal: '#00bfb3',      // Turquesa
  orange: '#ed8b00',    // Naranja
  card: '#f8fafc',      // Gris claro (fondos)
  text: '#1e293b',      // Gris oscuro (texto)
  border: '#dce3e8',    // Gris neutro (bordes)
};

export const RB_STYLES = {
  page: 'min-h-screen bg-gray-50',
  container: 'max-w-7xl mx-auto px-4 py-6',
  card: 'bg-white rounded-lg shadow-sm border border-gray-200',
  title: 'text-2xl font-bold text-gray-900',
  sectionTitle: 'text-xl font-semibold text-gray-800',
  // ...más patrones
};
```

### CSS Variables
En `frontend/src/index.css`:

```css
--rb-blue: #001871;
--rb-light-blue: #00a9ce;
--rb-magenta: #981d97;
--rb-turquoise: #00bfb3;
--rb-orange: #ed8b00;
```

### Clases Globales Importantes
- `.rb-card` — card con estilo RB
- `.rb-title-gradient` — título con gradiente
- `.rb-sidebar-item` — nav item
- `.rb-sidebar-item-active` — nav item activo (gradiente navy)
- `.rb-sidebar-badge` — badge en sidebar
- `.input-modern` — input estilizado
- `.no-scrollbar` — oculta scrollbar
- `.no-upper` — previene mayúsculas en text-transform

### Animaciones
- `rb-slide-up` — slide in desde abajo
- `rb-panel-swap` — transición panel
- Respetan `prefers-reduced-motion`

**Logo:** `frontend/src/assets/russell-bedford-logo.png` (render en SidebarShell, `w-[240px]`)  
**Topbar:** 4-color stripe bottom (purple, teal, navy, orange) en todos los dashboards

---

## API Endpoints (Backend)

### Autenticación
```
POST   /api/login/                     # Login con email/password
POST   /api/token/refresh/             # Refresh JWT token
POST   /api/enviar-codigo/             # Send 2FA email code
POST   /api/verificar-codigo/          # Verify login code
POST   /api/recuperar-password/        # Request password recovery
POST   /api/verificar-codigo-recuperacion/  # Verify recovery code
POST   /api/restablecer-password/      # Reset password
```

### RRHH (App `api`)
```
GET/POST/PATCH/DELETE   /api/empleados/                    # Employees
GET/POST/PATCH/DELETE   /api/contratos/                    # Contracts
GET/POST/PATCH/DELETE   /api/cursos/                       # Courses
GET/POST/PATCH/DELETE   /api/tareas/                       # Tasks
GET/POST/PATCH/DELETE   /api/areas/                        # Work areas
GET/POST/PATCH/DELETE   /api/cargos/                       # Job positions
GET/POST/PATCH/DELETE   /api/afiliaciones-ss/              # Social security
GET/POST/PATCH/DELETE   /api/contratos-renovaciones/       # Contract renewals
GET                     /api/actividad-reciente/           # Recent activity
POST                    /api/convertir-markdown/           # File to Markdown
POST                    /api/convertir-archivo/            # Convert PDF/Excel/Word
POST                    /api/gestor-pdf/                   # PDF merge/split/rotate
POST                    /api/enviar-certificado/           # Send cert via n8n
GET/POST                /api/solicitudes-cert/             # Certificate requests
GET/POST                /api/n8n-logs/                     # n8n automation logs
GET/POST                /api/api-keys/                     # API key management
```

### CRM (App `clientes`)
```
GET/POST/PATCH/DELETE   /api/clientes/empresas/            # Client companies
GET/POST/PATCH/DELETE   /api/clientes/contactos/           # Contacts
GET/POST/PATCH/DELETE   /api/clientes/servicios/           # Services
GET/POST/PATCH/DELETE   /api/clientes/asignaciones/        # Team assignments
GET/POST/PATCH/DELETE   /api/clientes/documentos/          # Documents (Appwrite-backed)
GET                     /api/clientes/bitacora/            # Activity log
```

### Herramientas Especiales
```
POST    /api/gemini-chat/               # AI chat (Google Gemini proxy)
POST    /api/n8n-proxy/                 # n8n webhook proxy
GET     /api/ping/                      # Health check
```

---

## Autenticación y Autorización

### Estrategias
1. **JWT Bearer Token**
   - Emisión en `POST /api/login/`
   - Header: `Authorization: Bearer <token>`
   - Payload: `{ "sub": user_id, "type": "superadmin"|"empleado", "token_type": "access", ... }`
   - TTL: 15 minutos (access), 7 días (refresh)
   - Secreto: `DJANGO_SECRET_KEY`
   - Algoritmo: HS256

2. **API Key**
   - Header: `X-API-Key: <key>`
   - Almacenado en modelo `ApiKey`
   - Soporta permisos por-key y IP whitelist

3. **Email 2FA**
   - Código de 6 dígitos enviado por email
   - Verificado con `POST /api/verificar-codigo/`
   - Almacenado en Django cache (TTL configurable)

### Modelos de Usuario
- **SuperAdmin** — extends Django `AbstractUser`, UUID PK, email login
- **DatosEmpleado** — empleado con `id_permisos` (1=Admin, 2=Editor, 3=User)

### Permisos Custom
- `IsSuperAdminUser` — solo SuperAdmin
- `IsAdminOrSuperAdmin` — SuperAdmin o DatosEmpleado con `id_permisos == 1`

**Middleware:** `JWTMiddleware` en `api/middleware.py` valida tokens en cada request.

---

## Variables de Entorno

### Críticas
```bash
DJANGO_SECRET_KEY=<random-secret>
DEBUG=False  # True en dev

# Database
DB_HOST=db
DB_PORT=5432
DB_NAME=rbgct
DB_USER=rbgct
DB_PASSWORD=<password>

# Frontend
FRONTEND_URL=http://localhost:5173  # dev, o https://conecta.rbgct.cloud prod

# Email
EMAIL_HOST_USER=<gmail-address>
EMAIL_HOST_PASSWORD=<gmail-app-password>
DEFAULT_FROM_EMAIL=noreply@rbgct.cloud
RESEND_API_KEY=<resend-key>  # alternativo a Gmail

# Appwrite
APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=<project-id>
APPWRITE_BUCKET_ID=<bucket-id>
APPWRITE_API_KEY=<api-key>

# n8n
N8N_WEBHOOK_URL=https://n8n.rbgct.cloud/webhook/...
N8N_WEBHOOK_API_KEY=<api-key>

# Gemini AI
GEMINI_API_KEY=<google-gemini-api-key>

# Cache
CACHE_BACKEND=redis  # o file, locmem
REDIS_URL=redis://redis:6379/0
CACHE_DIR=/tmp/django_cache  # si CACHE_BACKEND=file

# Gunicorn (prod)
GUNICORN_WORKERS=4
GUNICORN_THREADS=4
GUNICORN_TIMEOUT=120
```

---

## Servicios Externos e Integraciones

| Servicio | Endpoint | Propósito | Config |
|---|---|---|---|
| **Appwrite** | `https://nyc.cloud.appwrite.io/v1` | Almacenamiento documentos clientes + contratos | `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_BUCKET_ID`, `APPWRITE_API_KEY` |
| **n8n** | `https://n8n.rbgct.cloud` | Automatización workflows (onboarding usuarios, envío certificados, notificaciones) | `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_API_KEY` |
| **Google Gemini** | `generativelanguage.googleapis.com` | Asistente IA integrado en Admin2Dashboard | `GEMINI_API_KEY` |
| **Gmail SMTP** | `smtp.gmail.com:587` | Email transaccional (2FA, recuperación password, notificaciones) | `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` |
| **Resend** | `api.resend.com` | Email transaccional alternativa (producción) | `RESEND_API_KEY` |
| **PostgreSQL** | `postgres://` | Base de datos (schemas: `public` RRHH, `clientes` CRM) | `DB_*` vars |
| **Redis** | `redis://redis:6379` | Cache distribuida (producción) | `REDIS_URL` |

---

## Flujos Principales

### Login + Onboarding
1. Usuario accede `/` (Login)
2. Envía email + password → `POST /api/login/`
3. Backend envía código 2FA por email
4. Usuario entra código → `POST /api/verificar-codigo/`
5. Backend retorna JWT token
6. Frontend guarda en localStorage, redirige a `/completar-perfil`
7. Usuario llena datos iniciales → `POST /api/completar-datos/`
8. Redirige a dashboard según rol

### Flujo Recuperación de Contraseña
1. Usuario click "Olvidé contraseña" en Login
2. `POST /api/recuperar-password/` con email
3. Backend envía código de recuperación
4. Usuario entra código → `POST /api/verificar-codigo-recuperacion/`
5. `POST /api/restablecer-password/` con nueva password

### Documento en Clientes
1. Admin/usuario sube documento → `POST /api/clientes/documentos/`
2. Backend guarda en Appwrite (via custom storage)
3. Appwrite retorna file_id
4. File_id almacenado en `DocumentoCliente.archivo`
5. Frontend descarga via presigned URL desde Appwrite

### Automatización n8n
1. Sistema dispara webhook → `N8N_WEBHOOK_URL`
2. n8n recibe y ejecuta workflow (ej: enviar email)
3. Resultado se registra en `N8nLog`
4. Admin ve en `/admin2/n8n-logs`

---

## Desarrollo Local

### Setup
```bash
# Clone
git clone <repo>
cd /home/gct

# .env dev
cp .env.docker .env

# Docker compose
docker-compose up -d

# Frontend (si quieres dev HMR)
cd frontend
npm install
npm run dev  # Vite dev server en :5173

# Backend (si quieres desarrollo)
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### URLs Dev
- Frontend: `http://localhost:5173` (Vite) o `http://localhost` (nginx)
- Backend API: `http://localhost:8000/api/`
- Nginx: `http://localhost` (proxy)

### Comandos Django Útiles
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser  # O usar create_superadmin.py
python manage.py shell
python manage.py dumpdata > backup.json
python manage.py loaddata backup.json
```

### Deployment
```bash
# Build
docker-compose -f docker-compose.prod.yml build

# Push to registry (si aplica)
docker tag gct-backend:latest <registry>/gct-backend:latest
docker push <registry>/gct-backend:latest

# Deploy to VPS
./deploy.sh

# Or manual compose on VPS
docker-compose -f docker-compose.prod.yml up -d
```

---

## Testing

- **Frontend:** No hay test suite explícito (validar manualmente en navegador)
- **Backend:** DRF + Django test framework (ubicación: `backend/api/tests.py` si existe)
- **Integración:** Validar flujos end-to-end en `localhost` antes de push

---

## Contexto Actual (Rama `ui/redesign-rb`)

El proyecto está en transición: **migración UI al estilo corporativo Russell Bedford**.

Cambios recientes (últimos 8 commits):
- Integración logo RB en SidebarShell
- Refactor Topbar (4-color stripe, layout mejorado)
- Tokens visuales centralizados (`brand.js`)
- Estilo Sidebar consistente con RB palette
- Mejoras en StatCard y UserCard

**Trabajo siguiente:** Finalizar migración de todos los componentes al nuevo design system.

---

## Notas Importantes

1. **Monorepo structure:** NO es monorepo con workspaces. `frontend/` y `backend/` son apps independientes orquestadas por Docker Compose.

2. **Auth custom:** JWT HS256 hecho a mano (no SimpleJWT). Revisar `api/jwt_utils.py` y `api/authentication.py` antes de cambios.

3. **Appwrite storage:** Documentos de clientes se guardan en Appwrite cloud. Custom Django storage backend en `rbgct/appwrite_storage.py`.

4. **2FA en cache:** Códigos 2FA se guardan en Django cache (configurable: file, Redis, locmem). En prod debe ser Redis.

5. **n8n workflows:** Los workflows viven en `n8n.rbgct.cloud`, NO en código. Webhooks hardcodeados en backend (`N8N_WEBHOOK_URL`).

6. **Gemini proxy:** Frontend nunca llama Gemini directo. Siempre via `POST /api/gemini-chat/`.

7. **SQL Migrations:** Usar Django migrations (`python manage.py makemigrations`), no SQL directo.

8. **Secretos:** Nunca commitear `.env` reales. Usar `.env.example` como template.

---

## Links Útiles

- **Repos externos (si aplica):** Ver `requirements.txt`, `package.json`
- **Appwrite docs:** https://appwrite.io/docs
- **n8n docs:** https://docs.n8n.io
- **Django REST:** https://www.django-rest-framework.org
- **React Router:** https://reactrouter.com
- **Tailwind CSS:** https://tailwindcss.com

---

## Cómo Usar Este Archivo

Este `CLAUDE.md` es la **fuente de verdad** para cualquier agente que ayude en el proyecto. Antes de sugerir cambios, un agente debe:

1. **Leerlo completo** para entender estructura, stack, roles, API
2. **Referenciarse a secciones específicas** cuando clarificar contexto (ej: "ver sección API Endpoints")
3. **Mantenerlo actualizado** si encuentra cambios importantes en el proyecto

---

**Última actualización:** 2026-06-09  
**Rama:** `ui/redesign-rb`  
**Estado:** En migración UI corporativa
