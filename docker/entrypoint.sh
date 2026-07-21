#!/bin/bash
set -e

# =============================================================================
# Entrypoint para Django en contenedores Docker
# =============================================================================
# Este script se ejecuta al iniciar el contenedor backend. Sus tareas:
#   1. Esperar a que PostgreSQL esté disponible.
#   2. Ejecutar migraciones.
#   3. Crear SuperAdmin inicial si no existe (usando create_superadmin.py).
#   4. Recolectar archivos estáticos.
#   5. Iniciar gunicorn.
#
# NOTA: docker-compose.prod.yml realiza los mismos pasos directamente en su
# clave `command:`. Este entrypoint queda disponible para despliegues que
# sobrescriban el CMD (p. ej. Coolify con comando personalizado).
# =============================================================================

echo "[entrypoint] Esperando a PostgreSQL en ${DB_HOST:-db}:${DB_PORT:-5432}..."

# Espera a PostgreSQL usando Python (netcat no está en python:3.11-slim)
python - <<PY
import os, socket, time
host = os.getenv('DB_HOST', 'db')
port = int(os.getenv('DB_PORT', '5432'))
for i in range(60):
    try:
        with socket.create_connection((host, port), timeout=1):
            print(f'[entrypoint] PostgreSQL disponible en {host}:{port}')
            break
    except OSError:
        time.sleep(1)
else:
    raise SystemExit(f'[entrypoint] No se pudo conectar a PostgreSQL en {host}:{port}')
PY

echo "[entrypoint] Ejecutando migraciones Django..."
python manage.py migrate --noinput

echo "[entrypoint] Creando SuperAdmin inicial si no existe..."
# create_superadmin.py falla si SUPERADMIN_EMAIL o SUPERADMIN_PASSWORD no están
# configurados, evitando crear un admin con credenciales por defecto.
python create_superadmin.py || true

echo "[entrypoint] Recolectando archivos estáticos..."
python manage.py collectstatic --noinput

echo "[entrypoint] Iniciando gunicorn..."
exec gunicorn \
  --bind 0.0.0.0:8000 \
  --workers "${GUNICORN_WORKERS:-4}" \
  --timeout "${GUNICORN_TIMEOUT:-120}" \
  rbgct.wsgi:application
