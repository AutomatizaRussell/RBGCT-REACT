# Variables de entorno

Este proyecto usa una convencion simple:

- Desarrollo Docker y Django local: `backend/.env`
- Produccion Docker/Coolify/VPS: `.env.prod`
- Frontend local opcional: `frontend/.env`
- Plantillas versionadas: `*.example`

## Archivos activos

### `backend/.env`

Archivo real para desarrollo. Lo carga Django con `python-dotenv` y tambien `docker-compose.yml` mediante:

```yaml
env_file:
  - ./backend/.env
```

Crealo desde:

```bash
cp backend/.env.example backend/.env
```

En Windows:

```bat
copy backend\.env.example backend\.env
```

### `.env.prod`

Archivo real para produccion. Lo usan `deploy.sh prod`, `deploy.bat prod`, `deploy-vps.bat` y `docker-compose.prod.yml` mediante `--env-file .env.prod`.

Crealo desde:

```bash
cp .env.production.example .env.prod
```

En Windows:

```bat
copy .env.production.example .env.prod
```

### `frontend/.env`

Opcional. Vite solo expone variables con prefijo `VITE_`. Si no existe, el codigo usa `http://localhost:8000/api` en desarrollo y Docker de produccion inyecta `VITE_API_URL=/api` durante el build.

No hay plantilla para esto; si lo necesitas, crea `frontend/.env` con:

```
VITE_API_URL=http://localhost:8000/api
```

## Plantillas

- `.env.production.example`: plantilla completa para `.env.prod`.
- `.env.docker.example`: referencia Docker historica/local.
- `backend/.env.example`: plantilla minima para backend en desarrollo.

## Archivos que no deben existir en git

No commitear `.env`, `.env.prod`, `backend/.env`, `frontend/.env`, backups como `*.save`, ni cualquier variante con secretos reales.