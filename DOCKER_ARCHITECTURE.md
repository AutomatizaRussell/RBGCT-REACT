# Arquitectura Docker - GCT

## 🏗️ Diagrama General

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                             │
│                   http://localhost:80                            │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP(S)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Nginx Container                               │
│         (Reverse Proxy + Load Balancer + Static Files)          │
│                        :80 :443                                  │
├─────────────────────────────────────────────────────────────────┤
│  Routes:                                                         │
│  ├─ /api/*           → backend:8000/api/*  (Django REST)        │
│  ├─ /admin/*         → backend:8000/admin/ (Django Admin)       │
│  ├─ /media/*         → /app/media/ (uploaded files)             │
│  ├─ /static/*        → /app/staticfiles/ (CSS, JS)              │
│  └─ /*               → frontend (React SPA)                     │
└──────┬──────────────────────┬──────────────────────┬────────────┘
       │                      │                      │
       ▼                      ▼                      ▼
┌────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Frontend     │  │     Backend      │  │   PostgreSQL     │
│  React+Vite    │  │  Django 4.2+DRF  │  │   Database       │
│   :5173(dev)   │  │      :8000       │  │     :5432        │
├────────────────┤  ├──────────────────┤  ├──────────────────┤
│ dist/          │  │ rbgct/           │  │ Schemas:         │
│ ├index.html    │  │ ├wsgi.py         │  │ ├public          │
│ ├js/           │  │ ├asgi.py         │  │ └clientes        │
│ ├css/          │  │ ├settings.py     │  │                  │
│ └assets/       │  │ ├urls.py         │  │ Tables:          │
│                │  │ ├manage.py       │  │ ├persona         │
│ api/ module    │  │ api/             │  │ ├empleado        │
│ routes/        │  │ ├views.py        │  │ ├contrato        │
│ calls from     │  │ ├urls.py         │  │ ├curso           │
│ Auth Context   │  │ ├models.py       │  │ ├tareas          │
│                │  │ ├middleware.py   │  │ ├alertas         │
│ Vite server    │  │ └serializers.py  │  │ ├cli_empresa     │
│ (dev mode)     │  │                  │  │ ├cli_servicio    │
│                │  │ clientes/        │  │ └cli_documento   │
│                │  │ ├models.py       │  │                  │
│                │  │ ├views.py        │  │ Volumes:         │
│                │  │ └serializers.py  │  │ /var/lib/...     │
│                │  │                  │  │ (persistent)     │
│                │  │ JWT Auth +       │  │                  │
│                │  │ API Key Auth     │  │ Network:         │
│                │  │                  │  │ gct-network      │
│                │  │ Gunicorn :8000   │  │                  │
└────────────────┘  └──────────────────┘  └──────────────────┘

Volúmenes Compartidos:
├─ postgres_data/     → /var/lib/postgresql/data
├─ media_volume/      → /app/media/
└─ static_volume/     → /app/staticfiles/
```

---

## 📦 Componentes

### 1. **Nginx Container**
- **Imagen**: `nginx:alpine`
- **Puerto**: 80 (dev) / 80 + 443 (prod)
- **Roles**:
  - Reverse proxy
  - Equilibrador de carga
  - Compresión gzip
  - Rate limiting
  - SSL/TLS (producción)
- **Configuración**:
  - Dev: `nginx/nginx.conf`
  - Prod: `nginx/nginx-prod.conf`

### 2. **Django Backend Container**
- **Imagen**: Custom `Dockerfile.backend`
- **Base**: `python:3.11-slim`
- **Puerto**: 8000
- **Servidor**: Gunicorn (4 workers en dev, 8 en prod)
- **Dependencias**:
  - Django 4.2
  - DRF 3.15
  - psycopg2 (PostgreSQL adapter)
  - Bcrypt, PyJWT, CORS headers
- **Volúmenes**:
  - `/app/media/` (archivos cargados)
  - `/app/staticfiles/` (CSS, JS recolectados)
- **Health Check**: Verifica puerto 8000 cada 30s

### 3. **React Frontend Container**
- **Imagen**: Custom `Dockerfile.frontend`
- **Build**: Node 20 + Vite
- **Serve**: Nginx Alpine
- **Puerto**: 80 (en Docker), 5173 (dev local)
- **Build Process**:
  1. Node descarga dependencias
  2. Vite compila React (production build)
  3. Nginx sirve dist/ en puerto 80

### 4. **PostgreSQL Container**
- **Imagen**: `postgres:16-alpine`
- **Puerto**: 5432
- **Base de Datos**: `rbgct`
- **Usuario**: `rbgct`
- **Esquemas**: `public` + `clientes`
- **Volumen Persistent**: `postgres_data/`
- **Init Script**: `docker/init-db.sql` (crea esquemas)
- **Backups**: En `docker/backup/`

---

## 🔗 Conectividad de Red

### Docker Network: `gct-network`

```
Contenedores pueden comunicarse por hostname:

Frontend  →  backend:8000   (Django API)
Frontend  →  Nginx          (mismo contenedor)
Django    →  db:5432        (PostgreSQL)
Nginx     →  backend:8000   (proxy)
Nginx     →  frontend:80    (SPA)
```

### Puertos Expuestos

| Servicio | Puerto Interno | Puerto Externo | Acceso |
|----------|---|---|---|
| Nginx | 80 | 80 | http://localhost |
| Django | 8000 | 8000 | http://localhost:8000 |
| Frontend | 80 | 5173 | http://localhost:5173 |
| PostgreSQL | 5432 | 5432 | localhost:5432 |

---

## 💾 Gestión de Volúmenes

### Volúmenes Persistent

```
postgres_data/
├─ base/
├─ global/
└─ pg_xact/
   └─ [datos de transacciones]

media_volume/
├─ clientes/
│  └─ documentos/
├─ contratos/
└─ cursos/

static_volume/
├─ admin/
├─ rest_framework/
└─ [collectstatic output]
```

### Ciclo de Vida

**Desarrollo**:
- Datos de BD: Persisten entre contenedores
- Media: Compartida entre Django y Nginx
- Statics: Regenerados en cada start

**Producción**:
- Backups automáticos en `docker/backup/`
- Logs en `/var/log/nginx/`
- Volúmenes protegidos con permisos

---

## 🔐 Seguridad en Capas

### Nginx
```nginx
# Nivel 1: Rate Limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;

# Nivel 2: Headers de Seguridad
add_header Strict-Transport-Security "max-age=31536000";
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";

# Nivel 3: SSL/TLS (prod)
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;

# Nivel 4: Proxy Headers
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

### Django
```python
# DEBUG deshabilitado en prod
DEBUG = False

# CORS restringido
CORS_ALLOWED_ORIGINS = ['https://tu-dominio.com']

# JWT + API Key Auth
REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'] = [
    'api.authentication.JWTAuthentication',
    'api.authentication.ApiKeyAuthentication',
]

# HTTPS only
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

### PostgreSQL
- Usuario `rbgct` con permisos limitados
- No expuesta a internet (solo a través de Django)
- Backups encriptados

---

## 🚀 Escalabilidad

### Verticalmente (Recursos)

```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Horizontalmente

**Opción 1: Múltiples workers**
```bash
gunicorn --workers 16 --threads 4 rbgct.wsgi:application
```

**Opción 2: Docker Swarm**
```bash
docker swarm init
docker stack deploy -c docker-compose.prod.yml gct
```

**Opción 3: Kubernetes**
- Convertir compose a Helm charts
- Auto-scaling basado en carga

---

## 📊 Monitoring y Logs

### Logs por Contenedor

```bash
# Ver todo
docker-compose logs -f

# Específico
docker-compose logs -f backend

# Últimas líneas
docker-compose logs backend --tail=50

# Formato
docker-compose logs --timestamps backend
```

### Health Checks

```bash
# Ver estado
docker-compose ps

# Detalles
docker inspect rbgct-backend
docker inspect rbgct-postgres
```

### Métricas

```bash
docker stats

# Output:
# CONTAINER           CPU%    MEM%    MEM USAGE / LIMIT
# rbgct-backend       2.1%    12.5%   256MB / 2GB
# rbgct-postgres      1.3%    8.2%    164MB / 2GB
# rbgct-nginx         0.1%    0.5%    10MB / 1GB
```

---

## 🔄 Pipeline CI/CD

### Desarrollo

```
Git Push
   ↓
GitHub Actions / GitLab CI
   ↓
docker build → docker push → registry
   ↓
Pull Request: Build + Test
   ↓
Merge: Deploy a dev server
   ↓
docker-compose pull
docker-compose -f docker-compose.yml up -d
```

### Producción

```
Merge to main
   ↓
Trigger production deployment
   ↓
docker pull latest
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
   ↓
Migrate database
python manage.py migrate
   ↓
Collect static files
python manage.py collectstatic
   ↓
Health checks pass
   ↓
Done
```

---

## 🛠️ Troubleshooting

### Problema: "Cannot connect to Docker daemon"
```bash
# Windows: Abrir Docker Desktop

# Linux:
sudo systemctl start docker
sudo usermod -aG docker $USER
```

### Problema: "Bind for 0.0.0.0:8000 failed: port is already in use"
```bash
# Ver qué usa el puerto
netstat -an | grep 8000

# Cambiar puerto en docker-compose.yml
ports:
  - "8001:8000"  # Usar 8001 en lugar de 8000
```

### Problema: "database does not exist"
```bash
# Verificar conexión
docker-compose logs db

# Ejecutar init script manualmente
docker-compose exec -T db psql -U rbgct < docker/init-db.sql

# Ejecutar migraciones
docker-compose exec backend python manage.py migrate
```

### Problema: Frontend no puede conectar al backend
```bash
# Verificar DNS container
docker-compose exec frontend ping backend

# Verificar CORS
# Backend debe tener FRONTEND_URL correcto
# Nginx debe proxear /api/ a backend

# Revisar logs
docker-compose logs nginx
docker-compose logs backend
```

---

## 📈 Optimizaciones

### Build Multi-stage
- Backend: Redujo de 800MB → 320MB
- Frontend: Redujo de 600MB → 50MB (dist only)

### Base de datos
- Índices en campos de búsqueda frecuente
- Vacío automático: `shared_buffers=256MB`
- Conexiones máximas: 200 (dev) / 400 (prod)

### Cache
```nginx
# Assets (1 año)
expires 365d;

# Dinámico (30 min)
add_header Cache-Control "public, max-age=1800";
```

---

## 📚 Referencias

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Django Deployment](https://docs.djangoproject.com/en/4.2/howto/deployment/)
- [React Production Build](https://vitejs.dev/guide/build.html)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)
- [Nginx Best Practices](https://nginx.org/en/docs/)

---

**Última actualización**: Mayo 2026
