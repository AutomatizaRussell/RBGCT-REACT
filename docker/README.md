# Docker - GCT Sistema de Gestión de Capital de Talento

Esta guía explica cómo ejecutar el proyecto con Docker.

## 📋 Requisitos Previos

- Docker Desktop instalado ([descarga](https://www.docker.com/products/docker-desktop))
- Git

## 🚀 Inicio Rápido - Desarrollo

### 1. Clonar el proyecto
```bash
git clone <tu-repo>
cd GCT
```

### 2. Copiar archivo de configuración
```bash
# Windows
copy .env.docker .env

# Linux/Mac
cp .env.docker .env
```

### 3. Iniciar contenedores
```bash
# Linux/Mac
bash deploy.sh dev

# Windows
deploy.bat dev
```

### 4. Acceder a la aplicación
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api/
- **Admin Django**: http://localhost:8000/admin/
- **Nginx Reverse Proxy**: http://localhost

---

## 🐳 Estructura de Contenedores

```
┌──────────────────────────────────────────┐
│         Docker Compose (dev)              │
├──────────────────────────────────────────┤
│                                          │
│  ┌────────────┐  ┌──────────┐           │
│  │  Nginx     │  │ Frontend │           │
│  │  (Reverse  │  │ (React   │           │
│  │   Proxy)   │  │  + SPA)  │           │
│  └──────┬─────┘  └──────────┘           │
│         │                               │
│         │      ┌──────────┐             │
│         └─────→│ Backend  │             │
│                │ (Django) │             │
│                └────┬─────┘             │
│                     │                   │
│                     ↓                   │
│                ┌──────────┐             │
│                │PostgreSQL│             │
│                │   (DB)   │             │
│                └──────────┘             │
│                                          │
└──────────────────────────────────────────┘
```

### Servicios disponibles

| Servicio | Puerto | Función |
|----------|--------|---------|
| Nginx | 80 | Reverse proxy / balanceo |
| Frontend | 5173 | React SPA |
| Backend | 8000 | Django + DRF |
| PostgreSQL | 5432 | Base de datos |

---

## 📝 Comandos Disponibles

### Desarrollo
```bash
# Iniciar todos los contenedores
deploy.sh dev

# Ver logs en tiempo real
deploy.sh logs

# Ver logs específicos
deploy.sh logs-backend
deploy.sh logs-db

# Ejecutar migraciones
deploy.sh migrate

# Entrar a Django shell
deploy.sh shell-django

# Conectar a la base de datos
deploy.sh shell-db
```

### Base de Datos
```bash
# Hacer backup
deploy.sh backup-db

# Ver backups disponibles
ls docker/backup/

# Restaurar desde backup
deploy.sh restore-db docker/backup/rbgct_20250513_120000.sql
```

### Limpieza
```bash
# Detener contenedores
deploy.sh stop

# Eliminar todo (contenedores, volúmenes, datos)
deploy.sh clean
```

---

## ⚙️ Configuración

### Variables de Entorno

Edita `.env` o `.env.prod` según necesites:

```env
# Base de datos
DB_HOST=db
DB_PORT=5432
DB_NAME=rbgct
DB_USER=rbgct
DB_PASSWORD=rbgct123

# Django
DEBUG=True                    # Cambiar a False en producción
DJANGO_SECRET_KEY=tu-clave
ALLOWED_HOSTS=localhost,*

# Frontend
FRONTEND_URL=http://localhost

# Appwrite (almacenamiento)
APPWRITE_ENDPOINT=https://...
APPWRITE_PROJECT_ID=...
APPWRITE_API_KEY=...

# n8n Webhooks
N8N_WEBHOOK_URL=...
N8N_WEBHOOK_API_KEY=...

# Email (producción)
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=...
EMAIL_HOST_PASSWORD=...
```

### Modificar configuración de Nginx

- Desarrollo: `nginx/nginx.conf`
- Producción: `nginx/nginx-prod.conf`

---

## 🔧 Tareas Comunes

### Crear superadmin (primer usuario)

El script `entrypoint.sh` lo crea automáticamente:
- Email: `admin@rbgct.com`
- Contraseña: `admin123`

Para cambiar, edita `docker/entrypoint.sh`

### Acceder a la base de datos

```bash
# Opción 1: Con el script
deploy.sh shell-db

# Opción 2: Directamente
docker-compose exec db psql -U rbgct -d rbgct

# Comandos útiles en psql:
\dt              # Listar tablas
\dn              # Listar esquemas
\l               # Listar bases de datos
\du              # Listar usuarios
SELECT * FROM persona;  # Consultar tabla
```

### Ejecutar comando en el contenedor

```bash
# Django
docker-compose exec backend python manage.py <comando>

# Ejemplo: crear superadmin
docker-compose exec backend python manage.py createsuperuser

# Bash
docker-compose exec backend bash
```

### Ver uso de recursos

```bash
docker stats
```

---

## 🚀 Deployment a Producción

### 1. Preparar servidor

```bash
# En tu servidor (Linux)
apt-get update
apt-get install -y docker.io docker-compose

# Clonar código
git clone <tu-repo> /opt/gct
cd /opt/gct
```

### 2. Configurar variables de producción

```bash
# Crear .env.prod con valores reales
cp .env.docker .env.prod

# Editar con valores de producción
nano .env.prod
```

**Importante:**
- `DEBUG=False`
- `DJANGO_SECRET_KEY` segura y única
- `ALLOWED_HOSTS` con tu dominio
- Certificados SSL en `docker/ssl/`

### 3. Iniciar con producción

```bash
deploy.sh prod

# O directamente
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Configurar SSL con Let's Encrypt

```bash
# Instalar certbot
apt-get install -y certbot python3-certbot-nginx

# Generar certificados
certbot certonly --standalone -d tu-dominio.com

# Copiar a docker/ssl/
cp /etc/letsencrypt/live/tu-dominio.com/fullchain.pem docker/ssl/cert.pem
cp /etc/letsencrypt/live/tu-dominio.com/privkey.pem docker/ssl/key.pem

# Reiniciar nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

### 5. Renovación automática de certificados

```bash
# Crear cron job
crontab -e

# Agregar línea:
0 3 1 * * certbot renew --quiet && cp /etc/letsencrypt/live/tu-dominio.com/* /opt/gct/docker/ssl/ && docker-compose -f /opt/gct/docker-compose.prod.yml restart nginx
```

---

## 🐛 Troubleshooting

### Los contenedores no inician

```bash
# Revisar logs
docker-compose logs

# Verificar que los puertos no estén en uso
netstat -an | grep LISTEN
```

### Error de conexión a la BD

```bash
# Esperar a que PostgreSQL esté listo
docker-compose logs db

# Ejecutar migraciones manualmente
docker-compose exec backend python manage.py migrate
```

### Frontend no se actualiza

```bash
# Reconstruir sin cache
docker-compose build --no-cache frontend

# Reiniciar
docker-compose restart frontend
```

### Volumen de datos corrupto

```bash
# Hacer backup primero
deploy.sh backup-db

# Eliminar volumen
docker volume rm gct_postgres_data

# Reiniciar - recrea volumen
docker-compose up -d db
```

---

## 📊 Monitoreo

### Ver logs en tiempo real
```bash
# Todo
docker-compose logs -f

# Específico servicio
docker-compose logs -f backend
docker-compose logs -f db
```

### Estadísticas de recursos
```bash
docker stats
```

### Inspeccionar volúmenes
```bash
docker volume ls
docker volume inspect gct_postgres_data
```

---

## 🔐 Seguridad en Producción

### Checklist

- [ ] `DEBUG=False` en `.env.prod`
- [ ] `DJANGO_SECRET_KEY` regenerada y segura
- [ ] SSL/HTTPS configurado
- [ ] `ALLOWED_HOSTS` específicos (no `*`)
- [ ] Credenciales de BD complejas
- [ ] Backups automáticos configurados
- [ ] Firewall configurado (solo puertos 80, 443)
- [ ] Usuario no-root en contenedores
- [ ] Rate limiting en Nginx activado
- [ ] CORS restrictivo

### Renovación de secrets

```bash
# Generar nueva Django SECRET_KEY
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

---

## 📈 Escalado

Para producción con alto tráfico:

1. **Múltiples workers Gunicorn**
   - Aumentar en `docker-compose.prod.yml`: `--workers 16`

2. **Load Balancing**
   - Usar Docker Swarm o Kubernetes

3. **Caché**
   - Agregar Redis

4. **CDN**
   - Distribuir archivos estáticos

---

## 🆘 Soporte

Si tienes problemas:

1. Verifica los logs: `docker-compose logs`
2. Consulta el [README.md](../README.md) del proyecto
3. Revisa la documentación de Django/React/PostgreSQL

---

**Última actualización**: Mayo 2026
