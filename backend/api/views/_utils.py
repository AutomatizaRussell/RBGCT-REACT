"""
Utilidades compartidas para todos los módulos de views.
Contiene helpers, constantes y funciones auxiliares.
"""
import jwt as pyjwt
import uuid
import os
import hashlib
from datetime import datetime

from django.db import models as django_models
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from rest_framework.response import Response
from django.db.models import Q, Count
import bcrypt
import json
import logging
import random
from django.conf import settings
from django.core.cache import cache

from ..models import (
    DatosArea, DatosCargo, SuperAdmin, Persona, DatosContacto, DatosEmpleado,
    TareasCalendario, SolicitudesPassword, ReglamentoItem, SugerenciaEmpleado,
    Curso, CursoContenido, CursoHistorial, Alerta, N8nLog, ApiKey,
    EntidadEPS, EntidadAFP, EntidadARL, CajaCompensacion,
    Contrato, AfiliacionSeguridadSocial, ContratoRenovacion,
)
from ..jwt_utils import generate_tokens, decode_token, build_superadmin_payload, build_empleado_payload, jwt_required
from ..permissions import IsSuperAdminUser, IsAdminOrSuperAdmin

logger = logging.getLogger(__name__)

# Cache keys para endpoints consultados frecuentemente por dashboards
CACHE_KEY_ACTIVIDAD_RECIENTE = 'api:actividad_reciente:v1'
CACHE_KEY_ALERTAS_RECUPERACION = 'api:alertas_recuperacion:v1'


def _safe_env_int(name, default, min_value=1, max_value=3600):
    """Lee entero de entorno con límites seguros."""
    try:
        value = int(os.getenv(name, default))
    except (TypeError, ValueError):
        value = default
    return max(min_value, min(max_value, value))


ACTIVIDAD_RECIENTE_MAX_ITEMS = _safe_env_int('ACTIVIDAD_RECIENTE_MAX_ITEMS', 150, 20, 500)
ALERTAS_RECIENTES_MAX_ITEMS = _safe_env_int('ALERTAS_RECIENTES_MAX_ITEMS', 200, 20, 1000)
N8N_STATUS_CACHE_TTL = _safe_env_int('N8N_STATUS_CACHE_TTL', 20, 5, 300)
N8N_EXECUTIONS_CACHE_TTL = _safe_env_int('N8N_EXECUTIONS_CACHE_TTL', 15, 5, 180)
N8N_FAILURE_COOLDOWN = _safe_env_int('N8N_FAILURE_COOLDOWN', 20, 5, 300)

def get_usuario_nombre(user):
    """Obtiene el nombre del usuario (Django User o DatosEmpleado)"""
    if not user or not hasattr(user, 'is_authenticated') or not user.is_authenticated:
        return ''
    # Intentar username (Django User)
    if hasattr(user, 'username') and user.username:
        return user.username
    # Intentar correo_electronico (DatosEmpleado)
    if hasattr(user, 'correo_electronico') and user.correo_electronico:
        return user.correo_electronico
    # Intentar nombre completo
    nombre = getattr(user, 'primer_nombre', '') or ''
    apellido = getattr(user, 'primer_apellido', '') or ''
    full = f"{nombre} {apellido}".strip()
    return full or 'Usuario'

# Función para generar código de verificación
def generar_codigo_verificacion():
    """Genera código aleatorio de 6 dígitos"""
    return str(random.randint(100000, 999999))

def _run_in_thread(fn, *args):
    """
    Lanza fn(*args) en un hilo daemon.
    Cierra las conexiones DB heredadas antes de empezar y al finalizar,
    para que cada hilo use su propia conexión y no agote max_connections.
    """
    import threading
    from django.db import close_old_connections

    def _wrapper(*a):
        close_old_connections()
        try:
            fn(*a)
        finally:
            close_old_connections()

    t = threading.Thread(target=_wrapper, args=args, daemon=True)
    t.start()


def _convertir_tabla_a_markdown(headers, rows):
    """Convierte una tabla simple a markdown sin dependencias externas."""
    headers = [str(h) if h is not None else '' for h in headers]
    md = [
        '| ' + ' | '.join(headers) + ' |',
        '| ' + ' | '.join(['---'] * len(headers)) + ' |',
    ]
    for row in rows:
        vals = [str(v) if v is not None else '' for v in row]
        md.append('| ' + ' | '.join(vals) + ' |')
    return '\n'.join(md)


def _extraer_html_texto_simple(html_content):
    from html.parser import HTMLParser

    class _HTMLTextExtractor(HTMLParser):
        def __init__(self):
            super().__init__()
            self.parts = []

        def handle_starttag(self, tag, attrs):
            if tag in ('p', 'div', 'h1', 'h2', 'h3', 'h4', 'li', 'br'):
                self.parts.append('\n')

        def handle_data(self, data):
            text = (data or '').strip()
            if text:
                self.parts.append(text)

    parser = _HTMLTextExtractor()
    parser.feed(html_content)
    txt = ' '.join(parser.parts)
    txt = '\n'.join([line.strip() for line in txt.split('\n') if line.strip()])
    return txt


def _convertir_markdown_fallback(tmp_input_path, ext):
    """
    Fallback sin MarkItDown para tipos comunes.
    Retorna texto markdown.
    """
    ext = (ext or '').lower()

    if ext == '.txt':
        with open(tmp_input_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()

    if ext == '.json':
        with open(tmp_input_path, 'r', encoding='utf-8', errors='ignore') as f:
            data = json.load(f)
        return '```json\n' + json.dumps(data, ensure_ascii=False, indent=2) + '\n```'

    if ext == '.xml':
        import xml.dom.minidom as minidom
        with open(tmp_input_path, 'r', encoding='utf-8', errors='ignore') as f:
            raw = f.read()
        try:
            pretty = minidom.parseString(raw).toprettyxml(indent='  ')
            return '```xml\n' + pretty + '\n```'
        except Exception:
            return '```xml\n' + raw + '\n```'

    if ext == '.html':
        with open(tmp_input_path, 'r', encoding='utf-8', errors='ignore') as f:
            html = f.read()
        return _extraer_html_texto_simple(html)

    if ext == '.pdf':
        try:
            from pypdf import PdfReader
        except ImportError as e:
            raise RuntimeError('pypdf no instalado para fallback PDF') from e

        reader = PdfReader(tmp_input_path)
        chunks = []
        for i, page in enumerate(reader.pages, start=1):
            text = (page.extract_text() or '').strip()
            if not text:
                continue
            chunks.append(f'## Página {i}\n\n{text}')
        return '\n\n'.join(chunks).strip() or 'No se pudo extraer texto del PDF.'

    if ext in ('.docx', '.doc'):
        try:
            from docx import Document
        except ImportError as e:
            raise RuntimeError('python-docx no instalado para fallback DOCX') from e

        doc = Document(tmp_input_path)
        parts = []
        for para in doc.paragraphs:
            txt = (para.text or '').strip()
            if txt:
                parts.append(txt)
        return '\n\n'.join(parts).strip() or 'No se encontró texto en el documento.'

    if ext in ('.xlsx', '.xls'):
        try:
            import pandas as pd
        except ImportError as e:
            raise RuntimeError('pandas/openpyxl no instalado para fallback XLSX') from e

        xls = pd.ExcelFile(tmp_input_path)
        secciones = []
        for sheet_name in xls.sheet_names:
            df = pd.read_excel(tmp_input_path, sheet_name=sheet_name)
            if df.empty:
                continue
            headers = list(df.columns)
            rows = df.fillna('').astype(str).values.tolist()
            secciones.append(f'## Hoja: {sheet_name}\n\n' + _convertir_tabla_a_markdown(headers, rows[:500]))
        return '\n\n'.join(secciones).strip() or 'No se encontró contenido en el archivo Excel.'

    if ext == '.csv':
        try:
            import pandas as pd
        except ImportError as e:
            raise RuntimeError('pandas no instalado para fallback CSV') from e

        df = pd.read_csv(tmp_input_path)
        if df.empty:
            return 'CSV vacío.'
        headers = list(df.columns)
        rows = df.fillna('').astype(str).values.tolist()
        return _convertir_tabla_a_markdown(headers, rows[:1000])

    raise RuntimeError(f'Fallback no soporta extensión {ext}')


def _es_superadmin(user):
    return isinstance(user, SuperAdmin) or getattr(user, '_is_superadmin', False)


def _es_empleado(user):
    return isinstance(user, DatosEmpleado) or getattr(user, '_is_empleado', False)


def _es_admin_empleado(user):
    if not _es_empleado(user):
        return False
    return getattr(user, 'estado', None) == 'ACTIVA' and int(getattr(user, 'id_permisos', 0) or 0) == 1


def _es_admin_operativo(user):
    return _es_superadmin(user) or _es_admin_empleado(user)


def _empleado_activo_con_permiso_cert(user):
    if not _es_empleado(user):
        return False
    if getattr(user, 'estado', None) != 'ACTIVA':
        return False
    permisos = {str(x) for x in _leer_cert_permisos()}
    return str(user.id_empleado) in permisos


def _puede_gestionar_certificados(user):
    return _es_superadmin(user) or _empleado_activo_con_permiso_cert(user)


def enviar_email_verificacion(email, codigo, password=None, nombre=None):
    """Deprecated — usar n8n_gateway directamente."""
    from ..n8n_gateway import enviar_bienvenida
    return enviar_bienvenida(email, codigo, password, nombre)


# ── Certificado helpers (needed here because _empleado_activo_con_permiso_cert uses them) ──

from django.conf import settings as _settings

_MEDIA_DIR = os.path.join(_settings.MEDIA_ROOT, 'cert_data')
_CERT_PERMISOS_FILE = os.path.join(_MEDIA_DIR, 'cert_permisos.json')


def _ensure_cert_dir():
    os.makedirs(_MEDIA_DIR, exist_ok=True)


def _leer_cert_permisos():
    _ensure_cert_dir()
    if not os.path.exists(_CERT_PERMISOS_FILE):
        return []
    try:
        with open(_CERT_PERMISOS_FILE, 'r', encoding='utf-8') as f:
            try:
                import fcntl
                fcntl.flock(f, fcntl.LOCK_SH)
            except ImportError:
                pass  # fcntl not available on Windows
            data = json.load(f)
            try:
                import fcntl
                fcntl.flock(f, fcntl.LOCK_UN)
            except ImportError:
                pass
            return data
    except Exception:
        return []
