import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rbgct.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from api.models import SuperAdmin

superadmin, created = SuperAdmin.objects.get_or_create(
    id='1233c9d3-b99f-475b-a754-e61c42e313b5',
    defaults={
        'email': 'test-admin@rbcol.co',
        'password_hash': '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'nombre': 'Test',
        'apellido': 'Admin',
        'role': 'superadmin',
        'estado': 'ACTIVA'
    }
)

if created:
    print('✅ Superadmin creado exitosamente')
else:
    print('ℹ️ Superadmin ya existía')
