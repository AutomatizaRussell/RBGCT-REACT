import os
from django.core.management.base import BaseCommand
from api.models import SuperAdmin


class Command(BaseCommand):
    help = 'Crea el superadmin inicial si no existe'

    def handle(self, *args, **options):
        email = os.environ.get('SUPERADMIN_EMAIL', 'admin@rbgct.com')
        password = os.environ.get('SUPERADMIN_PASSWORD', 'admin123')

        if SuperAdmin.objects.filter(email=email).exists():
            self.stdout.write(f'Superadmin ya existe: {email}')
            return

        SuperAdmin.objects.create_superuser(
            email=email,
            password=password,
            nombre='Administrador',
            apellido='Sistema',
        )
        self.stdout.write(self.style.SUCCESS(f'Superadmin creado: {email}'))
