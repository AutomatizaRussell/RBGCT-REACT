"""
Importa contratos/servicios desde FormulariosSQF (n8n) hacia la base de datos local.

Uso:
    python manage.py importar_contratos_sqf [--dry-run]

El comando consulta el webhook de contratos de n8n, busca la empresa por nombre,
resuelve el área por el nombre del servicio y crea/actualiza ServicioContratado.
Idempotente por sqf_id.
"""
import requests
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from clientes import sqf_parser
from clientes.models import EmpresaCliente, ServicioContratado
from empleados.models import DatosArea


WEBHOOK_PATH = '/webhook/contratos-crud'


def _webhook_url():
    base = getattr(settings, 'N8N_BASE_URL', '') or ''
    if not base:
        parsed = getattr(settings, 'N8N_WEBHOOK_URL', '') or ''
        if parsed:
            from urllib.parse import urlparse
            p = urlparse(parsed)
            base = f'{p.scheme}://{p.netloc}' if p.netloc else ''
    if not base:
        base = 'https://n8n.rbgct.cloud'
    return f'{base.rstrip("/")}{WEBHOOK_PATH}'


class Command(BaseCommand):
    help = 'Importa contratos/servicios desde FormulariosSQF (n8n) al CRM local.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simula la importación sin escribir en la base de datos.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        url = _webhook_url()

        self.stdout.write(f'Consultando contratos SQF: {url}')
        try:
            resp = requests.get(url, timeout=(5, 45))
            resp.raise_for_status()
        except requests.RequestException as e:
            self.stderr.write(self.style.ERROR(f'Error consultando n8n: {e}'))
            return

        data = resp.json()
        if not isinstance(data, list):
            data = [data] if isinstance(data, dict) else []

        self.stdout.write(f'Recibidos {len(data)} registros.')

        area_qs = list(DatosArea.objects.all())
        empresas_cache = {}

        creados = 0
        actualizados = 0
        sin_empresa = 0
        sin_area = 0
        omitidos = 0
        errores = 0

        for idx, raw in enumerate(data, start=1):
            if not isinstance(raw, dict):
                omitidos += 1
                continue

            sqf_id = sqf_parser.clean_string(raw.get('id') or raw.get('sqf_id'), max_length=30)
            if not sqf_id:
                omitidos += 1
                continue

            cliente_nombre = sqf_parser.clean_string(
                raw.get('Cliente') or raw.get('clientName') or raw.get('cliente'),
                max_length=255
            )
            if not cliente_nombre:
                omitidos += 1
                continue

            # Buscar empresa por nombre (insensible a espacios y mayúsculas)
            empresa = empresas_cache.get(cliente_nombre.upper())
            if not empresa:
                try:
                    empresa = EmpresaCliente.objects.get(razon_social__iexact=cliente_nombre)
                except EmpresaCliente.DoesNotExist:
                    # Intentar buscar conteniendo el nombre.
                    candidatas = EmpresaCliente.objects.filter(razon_social__icontains=cliente_nombre[:30])
                    if candidatas.count() == 1:
                        empresa = candidatas.first()
                    else:
                        candidatas = EmpresaCliente.objects.filter(razon_social__icontains=cliente_nombre.split()[0])
                        if candidatas.count() == 1:
                            empresa = candidatas.first()

                if empresa:
                    empresas_cache[cliente_nombre.upper()] = empresa

            if not empresa:
                self.stderr.write(self.style.WARNING(f'Fila {idx}: no se encontró empresa "{cliente_nombre}"'))
                sin_empresa += 1
                continue

            # Resolver área por nombre del servicio.
            servicio_nombre = sqf_parser.clean_string(
                raw.get('Servicio') or raw.get('servicio') or raw.get('service'),
                max_length=100
            )
            area = None
            if servicio_nombre:
                area = sqf_parser.mapear_servicio_a_area(servicio_nombre, area_qs)

            if not area:
                self.stderr.write(self.style.WARNING(f'Fila {idx}: no se encontró área para "{servicio_nombre}" ({cliente_nombre})'))
                sin_area += 1
                continue

            tipo_contrato = sqf_parser.clean_string(
                raw.get('TipoContrato') or raw.get('tipoContrato') or raw.get('contractType'),
                max_length=15
            )
            tipo_contrato = sqf_parser.TIPO_CONTRATO_SQF.get((tipo_contrato or '').lower()) or 'otro'

            periodicidad = sqf_parser.PERIODICIDAD_SQF.get((tipo_contrato or '').lower()) or 'mensual'

            nombre = sqf_parser.clean_string(
                raw.get('Nombre') or raw.get('nombre') or raw.get('name'),
                max_length=255
            ) or f'{cliente_nombre} - {servicio_nombre}'

            valor = sqf_parser.clean_decimal(raw.get('PrecioMensual') or raw.get('precioMensual') or raw.get('value'))

            fecha_inicio = sqf_parser.parse_date(raw.get('FechaInicio') or raw.get('fechaInicio') or raw.get('startDate'))
            if not fecha_inicio:
                from datetime import date
                fecha_inicio = date.today()

            fecha_fin = sqf_parser.parse_date(raw.get('FechaFin') or raw.get('fechaFin') or raw.get('endDate'))

            estado_raw = sqf_parser.clean_string(raw.get('Estado') or raw.get('estado') or raw.get('status'), max_length=20)
            estado = 'activo' if (estado_raw or '').lower() == 'activo' else 'terminado'

            coordinador = sqf_parser.clean_string(raw.get('Coordinador') or raw.get('coordinador') or raw.get('manager'), max_length=150)
            posiciones = sqf_parser.clean_string(raw.get('Posiciones') or raw.get('posiciones') or raw.get('roles'), max_length=2000)

            if dry_run:
                self.stdout.write(f'[DRY-RUN] {nombre} — {cliente_nombre} / {area.nombre_area}')
                continue

            try:
                with transaction.atomic():
                    servicio, created = ServicioContratado.objects.update_or_create(
                        sqf_id=sqf_id,
                        defaults={
                            'empresa': empresa,
                            'area': area,
                            'nombre': nombre,
                            'descripcion': nombre,
                            'tipo_contrato': tipo_contrato,
                            'periodicidad': periodicidad,
                            'grupo_economico': empresa.grupo_economico,
                            'responsable': coordinador,
                            'roles_json': posiciones,
                            'valor_mensual': valor,
                            'fecha_inicio': fecha_inicio,
                            'fecha_fin': fecha_fin,
                            'estado': estado,
                            'sqf_status': 'validado' if estado == 'activo' else 'inactivo',
                        },
                    )
                    if created:
                        creados += 1
                    else:
                        actualizados += 1
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'Fila {idx} ({nombre}): {e}'))
                errores += 1

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Importación finalizada:'))
        self.stdout.write(f'  - Registros recibidos: {len(data)}')
        self.stdout.write(f'  - Servicios creados: {creados}')
        self.stdout.write(f'  - Servicios actualizados: {actualizados}')
        self.stdout.write(f'  - Sin empresa encontrada: {sin_empresa}')
        self.stdout.write(f'  - Sin área encontrada: {sin_area}')
        self.stdout.write(f'  - Errores: {errores}')
        self.stdout.write(f'  - Omitidos (formato inválido): {omitidos}')
