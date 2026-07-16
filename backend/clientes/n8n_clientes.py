"""
Utilidades para importar clientes desde el webhook de n8n.
"""
import logging
import requests
from django.conf import settings
from django.db import transaction

from . import sqf_parser
from .models import EmpresaCliente, ContactoCliente

logger = logging.getLogger(__name__)

WEBHOOK_PATH = '/webhook/clientes-crud'


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


def importar_clientes_desde_n8n(solo_nuevos=False):
    """
    Consulta el webhook de clientes de n8n y crea/actualiza registros locales.

    Args:
        solo_nuevos (bool): Si es True, solo crea empresas cuyo NIT no exista.
                            Si es False, actualiza campos vacíos de empresas existentes.

    Returns:
        dict: estadísticas de la importación.
    """
    url = _webhook_url()
    logger.info(f'Consultando clientes n8n: {url}')

    try:
        resp = requests.get(url, timeout=(5, 30))
        resp.raise_for_status()
    except requests.RequestException as e:
        logger.error(f'Error consultando n8n: {e}')
        return {'error': str(e), 'recibidos': 0, 'creados': 0, 'actualizados': 0, 'contactos_creados': 0, 'errores': 1, 'omitidos': 0}

    data = resp.json()
    if not isinstance(data, list):
        data = [data] if isinstance(data, dict) else []

    creados = 0
    actualizados = 0
    contactos_creados = 0
    errores = 0
    omitidos = 0

    for idx, raw in enumerate(data, start=1):
        if not isinstance(raw, dict):
            omitidos += 1
            continue

        try:
            parsed = sqf_parser.parse_empresa(raw)
        except Exception as e:
            nombre = raw.get('Nombre') or raw.get('name') or f'#fila-{idx}'
            logger.warning(f'Fila {idx} ({nombre}): {e}')
            errores += 1
            continue

        nit = parsed['nit']

        try:
            with transaction.atomic():
                if solo_nuevos:
                    if EmpresaCliente.objects.filter(nit=nit).exists():
                        omitidos += 1
                        continue
                    empresa = EmpresaCliente.objects.create(
                        nit=nit,
                        razon_social=parsed['razon_social'],
                        tipo_cliente=parsed['tipo_cliente'],
                        tipo_empresa=parsed['tipo_empresa'],
                        grupo_economico=parsed['grupo_economico'],
                        digito_verificacion=parsed['digito_verificacion'],
                        direccion=parsed['direccion'],
                        telefono=parsed['telefono'],
                        email_principal=parsed['email_principal'],
                        sqf_id=parsed['sqf_id'],
                        sqf_status=parsed['sqf_status'] or 'pendiente',
                        estado=parsed['estado'] or 'prospecto',
                        fecha_inicio_relacion=parsed['fecha_inicio_relacion'],
                    )
                    creados += 1
                else:
                    empresa, created = EmpresaCliente.objects.get_or_create(
                        nit=nit,
                        defaults={
                            'razon_social': parsed['razon_social'],
                            'tipo_cliente': parsed['tipo_cliente'],
                            'tipo_empresa': parsed['tipo_empresa'],
                            'grupo_economico': parsed['grupo_economico'],
                            'digito_verificacion': parsed['digito_verificacion'],
                            'direccion': parsed['direccion'],
                            'telefono': parsed['telefono'],
                            'email_principal': parsed['email_principal'],
                            'sqf_id': parsed['sqf_id'],
                            'sqf_status': parsed['sqf_status'],
                            'estado': parsed['estado'],
                            'fecha_inicio_relacion': parsed['fecha_inicio_relacion'],
                        },
                    )
                    if created:
                        creados += 1
                    else:
                        updates = {}
                        for field in (
                            'sqf_id', 'tipo_cliente', 'grupo_economico',
                            'digito_verificacion', 'direccion', 'telefono',
                            'email_principal', 'fecha_inicio_relacion',
                        ):
                            if parsed[field] and not getattr(empresa, field, None):
                                updates[field] = parsed[field]
                        if not empresa.sqf_status:
                            updates['sqf_status'] = 'pendiente'
                        if updates:
                            EmpresaCliente.objects.filter(pk=empresa.pk).update(**updates)
                            actualizados += 1

                contacto = sqf_parser.parse_contacto(raw)
                if contacto:
                    _, c_created = ContactoCliente.objects.get_or_create(
                        empresa=empresa,
                        nombre=contacto['nombre'],
                        defaults={
                            'cargo': contacto['cargo'],
                            'notas': contacto['notas'],
                            'email': contacto['email'],
                            'telefono': contacto['telefono'],
                            'es_principal': contacto['es_principal'],
                            'activo': contacto['activo'],
                        },
                    )
                    if c_created:
                        contactos_creados += 1
        except Exception as e:
            logger.error(f'Fila {idx} (NIT {nit}): {e}')
            errores += 1

    return {
        'recibidos': len(data),
        'creados': creados,
        'actualizados': actualizados,
        'contactos_creados': contactos_creados,
        'errores': errores,
        'omitidos': omitidos,
    }
