import os
import requests
from django.conf import settings
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible

# Mapea el upload_to de cada modelo al tipo que enruta el Switch de n8n
_TIPO_MAP = {
    'clientes/documentos/':    'clientes',          # → PERSONAL/CLIENTES
    'cursos/':                 'cursos',            # → PERSONAL/CURSOS
    'reglamento/':             'reglamento',        # → PERSONAL/REGLAMENTO
    'contratos/renovaciones/': 'contratos',         # → PERSONAL/CONTRATOS
    'contratos/':              'contratos',         # → PERSONAL/CONTRATOS
    'datos_academicos/':       'datos_academicos',  # → PERSONAL/DATOS ACADEMICOS
}

# Carpeta SharePoint correspondiente a cada tipo
_TIPO_TO_FOLDER = {
    'clientes':          'CLIENTES',
    'cursos':            'CURSOS',
    'reglamento':        'REGLAMENTO',
    'contratos':         'CONTRATOS',
    'datos_academicos':  'DATOS%20ACADEMICOS',
}

_SHAREPOINT_SITE = '/sites/AREASRUSSELLGCT/TECNOLOGIA/Tecnologia/CONECTA/PERSONAL'


def _get_tipo(name):
    for prefix, tipo in _TIPO_MAP.items():
        if name.startswith(prefix):
            return tipo
    return 'clientes'  # fallback seguro


def _build_sharepoint_url(tipo, filename):
    """Construye la URL de SharePoint cuando n8n no la devuelve en el cuerpo."""
    from urllib.parse import quote
    base = os.getenv('SHAREPOINT_BASE_URL', 'https://dsasas.sharepoint.com')
    folder = _TIPO_TO_FOLDER.get(tipo, 'CLIENTES')
    return f"{base}{_SHAREPOINT_SITE}/{folder}/{quote(filename)}"


@deconstructible
class SharePointN8nStorage(Storage):
    """
    Django Storage que sube archivos a SharePoint a través del webhook de n8n.
    Reemplaza AppwriteFileStorage — los modelos con FileField no necesitan cambios lógicos.
    """

    def _save(self, name, content):
        tipo = _get_tipo(name)
        filename = os.path.basename(name)
        mime = getattr(content, 'content_type', 'application/octet-stream')

        try:
            resp = requests.post(
                settings.N8N_SHAREPOINT_WEBHOOK,
                headers={'X-API-Key': settings.N8N_WEBHOOK_API_KEY},
                files={'data': (filename, content.read(), mime)},
                data={'tipo': tipo},
                timeout=30,
            )
            resp.raise_for_status()
        except requests.exceptions.HTTPError as e:
            raise Exception(f"Error al subir archivo a SharePoint via n8n ({e.response.status_code}): {e.response.text[:200]}")
        except requests.exceptions.ConnectionError:
            raise Exception("No se pudo conectar con n8n. Verifica que el flujo esté activado.")

        try:
            result = resp.json()
            sharepoint_url = result.get('url', '')
        except Exception:
            sharepoint_url = ''

        # Si n8n no devolvió la URL, la construimos a partir del tipo y nombre de archivo
        if not sharepoint_url:
            sharepoint_url = _build_sharepoint_url(tipo, filename)

        return sharepoint_url

    def url(self, name):
        return name  # name ya es la URL completa de SharePoint

    def exists(self, name):
        return False  # siempre permite sobreescritura

    def _open(self, name, mode='rb'):
        from io import BytesIO
        from urllib.parse import urlparse, unquote

        path = unquote(urlparse(name).path)
        parts = path.split('/')
        try:
            idx = parts.index('PERSONAL')
            folder = parts[idx + 1].upper()
            archivo = parts[idx + 2]
        except (ValueError, IndexError):
            raise Exception(f'URL de SharePoint no reconocida: {name}')

        folder_to_tipo = {
            'DATOS ACADEMICOS': 'datos_academicos',
            'CONTRATOS': 'contratos',
            'REGLAMENTO': 'reglamento',
            'CLIENTES': 'clientes',
            'CURSOS': 'cursos',
        }
        tipo = folder_to_tipo.get(folder)
        if not tipo:
            raise Exception(f'Carpeta SharePoint no reconocida: {folder}')

        resp = requests.post(
            settings.N8N_SHAREPOINT_DOWNLOAD_WEBHOOK,
            headers={'X-API-Key': settings.N8N_WEBHOOK_API_KEY},
            json={'tipo': tipo, 'archivo': archivo},
            timeout=30,
        )
        resp.raise_for_status()
        return BytesIO(resp.content)

    def delete(self, name):
        pass  # implementar con flujo n8n adicional si se requiere

    def size(self, name):
        return 0
