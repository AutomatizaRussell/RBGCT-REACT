import os, sys, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rbgct.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from sistema.models import SuperAdmin

EMAIL = os.getenv('SUPERADMIN_EMAIL')
if not EMAIL:
    raise ValueError("SUPERADMIN_EMAIL debe estar configurado en las variables de entorno")

PASSWORD = os.getenv('SUPERADMIN_PASSWORD')
if not PASSWORD:
    raise ValueError("SUPERADMIN_PASSWORD debe estar configurado en las variables de entorno")

if SuperAdmin.objects.filter(email=EMAIL).exists():
    print(f'SuperAdmin {EMAIL} ya existe')
else:
    SuperAdmin.objects.create_superuser(
        email=EMAIL,
        password=PASSWORD,
        nombre='Test',
        apellido='Admin',
        role='superadmin',
        estado='ACTIVA',
    )
    print(f'SuperAdmin creado: {EMAIL}')
