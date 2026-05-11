import os, sys, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rbgct.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from api.models import SuperAdmin

EMAIL = 'test-admin@rbcol.co'
PASSWORD = 'Admin1234!'

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
    print(f'SuperAdmin creado: {EMAIL} / {PASSWORD}')
