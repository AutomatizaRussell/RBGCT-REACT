import os
from django.core.management.base import BaseCommand
from api.models import SuperAdmin


class Command(BaseCommand):
    help = 'Crea el superadmin inicial si no existe'

    def handle(self, *args, **options):
        email = os.environ.get('SUPERADMIN_EMAIL')
        if not email:
            self.stderr.write(
                self.style.ERROR(
                    'SUPERADMIN_EMAIL no está configurado. '
                    'Ejecuta: export SUPERADMIN_EMAIL=admin@ejemplo.com'
                )
            )
            return

        password = os.environ.get('SUPERADMIN_PASSWORD')
        if not password:
            self.stderr.write(
                self.style.ERROR(
                    'SUPERADMIN_PASSWORD no está configurado. '
                    'Ejecuta: export SUPERADMIN_PASSWORD=tu_clave_segura'
                )
            )
            return

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
