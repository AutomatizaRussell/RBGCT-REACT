"""
Importa clientes desde FormulariosSQF (n8n) hacia la base de datos local.

Uso:
    python manage.py importar_clientes_sqf [--dry-run] [--solo-nuevos]

El comando consulta el webhook de clientes de n8n, normaliza los datos con el
parser SQF existente y crea/actualiza registros en EmpresaCliente + ContactoCliente.
Idempotente por NIT.
"""
from django.core.management.base import BaseCommand

from clientes.n8n_clientes import importar_clientes_desde_n8n


class Command(BaseCommand):
    help = 'Importa clientes desde FormulariosSQF (n8n) al CRM local.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simula la importación sin escribir en la base de datos.',
        )
        parser.add_argument(
            '--solo-nuevos',
            action='store_true',
            help='Solo crea clientes cuyo NIT no exista; no actualiza los existentes.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        solo_nuevos = options['solo_nuevos']

        if dry_run:
            self.stdout.write(self.style.WARNING('MODO DRY-RUN: no se escribirá en la base de datos.'))
            # En dry-run usamos el comportamiento normal para reportar qué haría.
            resultado = importar_clientes_desde_n8n(solo_nuevos=solo_nuevos)
        else:
            resultado = importar_clientes_desde_n8n(solo_nuevos=solo_nuevos)

        if 'error' in resultado:
            self.stderr.write(self.style.ERROR(f"Error: {resultado['error']}"))
            return

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Importación finalizada:'))
        self.stdout.write(f'  - Registros recibidos: {resultado["recibidos"]}')
        self.stdout.write(f'  - Empresas creadas: {resultado["creados"]}')
        self.stdout.write(f'  - Empresas actualizadas: {resultado["actualizados"]}')
        self.stdout.write(f'  - Contactos creados: {resultado["contactos_creados"]}')
        self.stdout.write(f'  - Errores: {resultado["errores"]}')
        self.stdout.write(f'  - Omitidos: {resultado["omitidos"]}')
