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
import requests
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

def _post_n8n(destinatario, payload, workflow_name):
    """Base: POST a n8n, registra en N8nLog, retorna (bool, resultado)."""
    n8n_url = settings.N8N_WEBHOOK_URL
    if not n8n_url:
        logger.error("[N8N] N8N_WEBHOOK_URL no configurado")
        return False, "N8N_WEBHOOK_URL no configurado"
    try:
        response = requests.post(
            n8n_url,
            json=payload,
            headers={'Content-Type': 'application/json', 'X-API-Key': settings.N8N_WEBHOOK_API_KEY},
            timeout=5
        )
        if response.status_code == 200:
            logger.info(f"[N8N] {workflow_name} enviado a {destinatario}")
            try:
                N8nLog.objects.create(
                    workflow_name=workflow_name, status='SUCCESS',
                    message=f"Enviado a {destinatario}", destinatario=destinatario,
                    tipo_evento=workflow_name, response_data=json.dumps(response.json())[:500],
                )
            except Exception as log_err:
                logger.warning(f"[N8N] No se pudo guardar log: {log_err}")
            return True, response.json()
        else:
            logger.error(f"[N8N] {workflow_name} error {response.status_code}")
            try:
                N8nLog.objects.create(
                    workflow_name=workflow_name, status='ERROR',
                    message=f"HTTP {response.status_code}: {response.text[:200]}",
                    destinatario=destinatario, tipo_evento=workflow_name,
                )
            except Exception:
                pass
            return False, f"HTTP {response.status_code}"
    except Exception as e:
        logger.error(f"[N8N] Error en {workflow_name}: {e}")
        try:
            N8nLog.objects.create(
                workflow_name=workflow_name, status='ERROR',
                message=str(e)[:300], destinatario=destinatario,
            )
        except Exception:
            pass
        return False, str(e)


def _post_n8n_async(destinatario, payload, workflow_name):
    """Lanza _post_n8n en hilo daemon para no bloquear el request."""
    import threading
    t = threading.Thread(
        target=_post_n8n,
        args=(destinatario, payload, workflow_name),
        daemon=True,
    )
    t.start()


def _duracion_ejecucion_segundos(execution):
    """Calcula duración de ejecución n8n de forma segura."""
    started_at = execution.get('startedAt')
    stopped_at = execution.get('stoppedAt')
    if not started_at or not stopped_at:
        return None
    try:
        started_dt = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
        stopped_dt = datetime.fromisoformat(stopped_at.replace('Z', '+00:00'))
        return max(0, round((stopped_dt - started_dt).total_seconds()))
    except Exception:
        return None


def _persistir_ejecuciones_n8n(executions):
    """
    Persiste ejecuciones de n8n sin bloquear el request principal.
    Usa cache para deduplicar por execution id y evitar consultas SQL costosas.
    """
    for ex in executions:
        try:
            exec_id = str(ex.get('id') or '')
            if not exec_id:
                continue

            dedupe_key = f'api:n8n:exec-sync:{exec_id}'
            if cache.get(dedupe_key):
                continue

            wf_name = ex.get('workflowData', {}).get('name') or f"Workflow #{ex.get('workflowId', '?')}"
            ok = ex.get('status') in ('success',)
            duracion = _duracion_ejecucion_segundos(ex)
            msg = f"Duración: {duracion}s" if duracion is not None else ex.get('status', '')

            N8nLog.objects.create(
                workflow_name=wf_name,
                status='SUCCESS' if ok else 'ERROR',
                message=msg,
                tipo_evento=ex.get('mode', 'webhook'),
                response_data=json.dumps({'exec_id': exec_id})[:200],
            )
            # Dedupe temporal en cache compartido.
            cache.set(dedupe_key, True, timeout=86400)
        except Exception as log_err:
            logger.warning(f"[N8N SYNC] No se pudo persistir ejecución: {log_err}")


def _persistir_ejecuciones_n8n_async(executions):
    import threading
    t = threading.Thread(
        target=_persistir_ejecuciones_n8n,
        args=(executions,),
        daemon=True,
    )
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
    """Envía credenciales de bienvenida vía n8n; fallback SMTP si falla."""
    if not settings.N8N_WEBHOOK_URL:
        return _enviar_email_smtp_fallback(email, codigo)
    nombre_usuario = nombre or 'Usuario'
    html_email = f"""<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #F8F9FA;">
  <div style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">

    <div style="text-align: center; padding: 30px 20px 20px 20px;">
      <img src="https://raw.githubusercontent.com/AutomatizaRussell/Resourse_GestionHumana/main/Logo_RB2021.png" alt="Russell Bedford" style="height: 50px; margin-bottom: 15px;">
    </div>
    <div style="height: 4px; background: linear-gradient(to right, #001871 50%, #00a9ce 50%, #00a9ce 75%, #ed8b00 75%, #ed8b00 100%);"></div>

    <div style="padding: 40px 30px;">
      <h2 style="color: #001871; font-size: 24px; margin-top: 0; margin-bottom: 20px;">Bienvenido al Portal de Usuarios</h2>
      <p style="font-size: 16px; color: #4A5568; margin-bottom: 20px; line-height: 1.6;">Hola <strong>{nombre_usuario}</strong>,</p>
      <p style="font-size: 16px; color: #4A5568; margin-bottom: 25px; line-height: 1.6;">Tu cuenta ha sido creada exitosamente. A continuación, encontrarás tus credenciales de acceso para ingresar a la plataforma:</p>

      <div style="background-color: #F8F9FA; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ed8b00;">
        <p style="margin: 0 0 10px 0; color: #4A5568; font-size: 15px;"><strong>Usuario / Correo:</strong> <span style="color: #001871;">{email}</span></p>
        <p style="margin: 0 0 20px 0; color: #4A5568; font-size: 15px;"><strong>Contraseña temporal:</strong> <span style="color: #001871;">{password}</span></p>

        <p style="margin: 0 0 10px 0; color: #4A5568; font-size: 14px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Tu código de verificación:</p>
        <div style="background-color: #001871; color: #ffffff; padding: 12px 20px; border-radius: 6px; display: inline-block; font-size: 24px; font-weight: bold; letter-spacing: 3px;">
          {codigo}
        </div>
      </div>

      <p style="font-size: 14px; color: #718096; margin-top: 25px; line-height: 1.5;">
        <strong style="color: #e53e3e;">Nota importante:</strong> Este código expira en 15 minutos. Por motivos de seguridad, el sistema te solicitará cambiar tu contraseña la primera vez que ingreses.
      </p>
    </div>

    <div style="background-color: #001871; color: #ffffff; padding: 20px; text-align: center; font-size: 12px; line-height: 1.6;">
      <p style="margin: 0; font-size: 14px;"><strong>GCT - Sistema de Gestión</strong></p>
      <p style="margin: 5px 0 0 0; color: #e2e8f0;">Russell Bedford Colombia</p>
      <p style="margin: 10px 0 0 0;"><a href="https://conecta.rbgct.cloud" style="color: #00a9ce; text-decoration: none; font-size: 13px; font-weight: bold;">🌐 conecta.rbgct.cloud</a></p>
      <p style="margin: 10px 0 0 0; font-size: 11px; color: #a0aec0;">Si no solicitaste esta cuenta, por favor ignora este correo o contacta al equipo de TI y Proyectos.</p>
    </div>

  </div>
</div>"""
    payload = {
        'tipo': 'bienvenida_nuevo_usuario',
        'destinatario': email,
        'asunto': 'Bienvenido a GCT - Credenciales de acceso',
        'html_email': html_email,
        'datos_sensibles': {'correo_login': email, 'password_temporal': password, 'codigo_verificacion': codigo},
        'datos_usuario': {'nombre': nombre_usuario, 'expira_en': '15 minutos'},
        'plantilla': 'bienvenida_rbgct',
    }
    ok, result = _post_n8n(email, payload, 'bienvenida_nuevo_usuario')
    if not ok:
        return _enviar_email_smtp_fallback(email, codigo)
    return True, {"status": "webhook_sent", "n8n_response": result}


def _enviar_email_smtp_fallback(email, codigo):
    """Función fallback que envía email directo por SMTP si n8n falla"""
    try:
        from django.core.mail import send_mail

        subject = 'Código de verificación - GCT'
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
            <div style="background: #001e33; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">GCT</h2>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Código de verificación</p>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                    Tu código de verificación es:
                </p>
                <div style="background: #001e33; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0;">
                    {codigo}
                </div>
                <p style="font-size: 14px; color: #666; margin-top: 20px;">
                    Este código expira en 15 minutos. No lo compartas con nadie.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="font-size: 12px; color: #999; text-align: center;">
                    Si no solicitaste este código, ignora este mensaje.<br>
                    GCT - Sistema de Gestión
                </p>
            </div>
        </div>
        """

        send_mail(
            subject=subject,
            message=f'Tu código de verificación es: {codigo}. Expira en 15 minutos.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
            html_message=html_content
        )

        logger.info(f"[EMAIL FALLBACK] Código enviado a {email} por SMTP")
        return True, {"status": "sent_via_smtp_fallback"}

    except Exception as e:
        logger.error(f"[EMAIL FALLBACK] Error: {str(e)}")
        return False, str(e)


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
