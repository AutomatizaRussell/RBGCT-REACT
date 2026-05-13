#!/bin/bash
set -e

echo "Esperando a PostgreSQL..."
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 1
done

echo "PostgreSQL está disponible"

echo "Ejecutando migraciones Django..."
python manage.py migrate --noinput

echo "Creando superadmin si no existe..."
python manage.py shell << END
from api.models import SuperAdmin
import os

email = os.environ.get('SUPERADMIN_EMAIL', 'admin@rbgct.com')
password = os.environ.get('SUPERADMIN_PASSWORD', 'admin123')

if not SuperAdmin.objects.filter(email=email).exists():
    SuperAdmin.objects.create_superuser(
        email=email,
        password=password,
        nombre='Administrador',
        apellido='Sistema'
    )
    print(f"✓ Superadmin creado: {email}")
else:
    print(f"✓ Superadmin ya existe: {email}")
END

echo "Recolectando archivos estáticos..."
python manage.py collectstatic --noinput

echo "✓ Inicialización completada"

# Ejecutar gunicorn
exec gunicorn --bind 0.0.0.0:8000 --workers 4 --timeout 120 rbgct.wsgi:application
