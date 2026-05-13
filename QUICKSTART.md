# 🚀 Docker Quick Start - 5 Minutos

## 📦 Requisitos

- Docker Desktop instalado → https://www.docker.com/products/docker-desktop
- Git

## ▶️ Iniciar en 3 pasos

### 1. Clonar y configurar
```bash
git clone <tu-repo>
cd GCT
copy .env.docker .env
```

### 2. Iniciar contenedores
```bash
# Windows
deploy.bat dev

# Linux/Mac
bash deploy.sh dev
```

### 3. Acceder
```
Frontend:  http://localhost:5173
Backend:   http://localhost:8000
Admin:     http://localhost:8000/admin/
```

---

## 🔑 Credenciales Iniciales

```
Email:    admin@rbgct.com
Password: admin123
```

---

## 📚 Comandos Esenciales

```bash
# Ver logs
docker-compose logs -f

# Ejecutar migraciones
docker-compose exec backend python manage.py migrate

# Crear superadmin
docker-compose exec backend python manage.py createsuperuser

# Conectar a BD
docker-compose exec db psql -U rbgct -d rbgct

# Detener
docker-compose stop

# Eliminar todo
docker-compose down -v
```

---

## 🆘 Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| Puerto 8000 en uso | `docker-compose ps` → `docker kill <ID>` |
| BD no responde | `docker-compose restart db` |
| Frontend no carga | `docker-compose logs frontend` |
| Media no se ve | `docker-compose exec backend python manage.py collectstatic` |

---

## 📖 Documentación Completa

- **[docker/README.md](docker/README.md)** - Guía detallada
- **[DOCKER_ARCHITECTURE.md](DOCKER_ARCHITECTURE.md)** - Arquitectura
- **[DOCKER_CHECKLIST.md](DOCKER_CHECKLIST.md)** - Checklist pre-prod

---

**Listo para desarrollar! 🎉**
