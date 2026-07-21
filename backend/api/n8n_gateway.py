"""
n8n Gateway — Estación central de todos los flujos n8n del proyecto GCT.

Arquitectura:
    views/ ──► n8n_gateway.dispatch_*(…) ──► n8n (webhooks)

Regla: ningún view/service habla directamente con n8n.
Todo flujo de salida o entrada pasa por este módulo.

Para agregar un flujo nuevo:
  1. Añadir su key en WORKFLOWS.
  2. Escribir la función pública correspondiente.
  3. Importarla en el view que la necesite.
"""

import json
import logging
import threading
from datetime import datetime

import requests
from django.conf import settings
from django.core.cache import cache
from django.db import close_old_connections

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Catálogo de flujos
# Cambiar un nombre de workflow en n8n → solo editar aquí.
# ─────────────────────────────────────────────────────────────────────────────
WORKFLOWS = {
    # Autenticación / onboarding
    'bienvenida':           'bienvenida_nuevo_usuario',
    'login_codigo':         'login_codigo_verificacion',

    # Seguridad
    'recuperacion_pwd':     'recuperacion_password',
    'pwd_restablecida':     'notificacion_password_restablecida',

    # Documentos / RRHH
    'certificado_empleo':   'certificado_empleo',

    # Intranet / SharePoint
    'descarga_intranet':    'descarga_intranet_sharepoint',
}


# ─────────────────────────────────────────────────────────────────────────────
# Transporte interno — privado, no importar fuera de este módulo
# ─────────────────────────────────────────────────────────────────────────────

def _url_principal():
    return getattr(settings, 'N8N_WEBHOOK_URL', '') or ''


def _headers():
    return {
        'Content-Type': 'application/json',
        'X-API-Key': getattr(settings, 'N8N_WEBHOOK_API_KEY', ''),
    }


def _registrar_log(workflow_name, destinatario, status, message, response_data=''):
    """Persiste resultado en N8nLog sin abortar el flujo si falla."""
    try:
        from .models import N8nLog  # evitar import circular al nivel de módulo
    except ImportError:
        from api.models import N8nLog
    try:
        N8nLog.objects.create(
            workflow_name=workflow_name,
            status=status,
            message=message[:300],
            destinatario=destinatario,
            tipo_evento=workflow_name,
            response_data=response_data[:500] if response_data else '',
        )
    except Exception as err:
        logger.warning(f"[GW] No se pudo guardar N8nLog: {err}")


def _dispatch(workflow_key, destinatario, payload, *, url_override=None):
    """
    Envía el payload al webhook de n8n y registra el resultado.
    Retorna (bool, resultado).
    Bloqueante — usar _dispatch_async si no debe bloquear el request.
    """
    workflow_name = WORKFLOWS.get(workflow_key, workflow_key)
    url = url_override or _url_principal()

    if not url:
        logger.error(f"[GW] URL no configurada para flujo '{workflow_key}'")
        _registrar_log(workflow_name, destinatario, 'ERROR', 'URL de webhook no configurada')
        return False, 'URL de webhook no configurada'

    try:
        response = requests.post(url, json=payload, headers=_headers(), timeout=5)

        if response.status_code == 200:
            logger.info(f"[GW] '{workflow_key}' → {destinatario} OK")
            try:
                resp_json = json.dumps(response.json())
            except Exception:
                resp_json = response.text[:500]
            _registrar_log(workflow_name, destinatario, 'SUCCESS',
                           f"Enviado a {destinatario}", resp_json)
            return True, response.json() if response.text else {}

        logger.error(f"[GW] '{workflow_key}' HTTP {response.status_code}")
        _registrar_log(workflow_name, destinatario, 'ERROR',
                       f"HTTP {response.status_code}: {response.text[:200]}")
        return False, f"HTTP {response.status_code}"

    except Exception as exc:
        logger.error(f"[GW] Error en '{workflow_key}': {exc}")
        _registrar_log(workflow_name, destinatario, 'ERROR', str(exc))
        return False, str(exc)


def _dispatch_async(workflow_key, destinatario, payload, *, url_override=None):
    """Lanza _dispatch en hilo daemon para no bloquear el request."""
    def _run():
        close_old_connections()
        try:
            _dispatch(workflow_key, destinatario, payload, url_override=url_override)
        finally:
            close_old_connections()

    t = threading.Thread(target=_run, daemon=True)
    t.start()


# ─────────────────────────────────────────────────────────────────────────────
# Flujos públicos — un flujo = una función con nombre descriptivo
# ─────────────────────────────────────────────────────────────────────────────

def enviar_bienvenida(email: str, codigo: str, password: str | None, nombre: str | None):
    """
    Bienvenida a nuevo usuario: envía credenciales + código de primer acceso.
    Fallback automático a SMTP si n8n no está disponible.
    """
    nombre_usuario = nombre or 'Usuario'
    html_email = f"""<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#F8F9FA;">
  <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.05);">
    <div style="text-align:center;padding:30px 20px 20px;">
      <img src="https://raw.githubusercontent.com/AutomatizaRussell/Resourse_GestionHumana/main/Logo_RB2021.png" alt="Russell Bedford" style="height:50px;margin-bottom:15px;">
    </div>
    <div style="height:4px;background:linear-gradient(to right,#001871 50%,#00a9ce 50%,#00a9ce 75%,#ed8b00 75%,#ed8b00 100%);"></div>
    <div style="padding:40px 30px;">
      <h2 style="color:#001871;font-size:24px;margin-top:0;">Bienvenido al Portal de Usuarios</h2>
      <p style="font-size:16px;color:#4A5568;line-height:1.6;">Hola <strong>{nombre_usuario}</strong>,</p>
      <p style="font-size:16px;color:#4A5568;line-height:1.6;">Tu cuenta ha sido creada exitosamente. A continuación tus credenciales de acceso:</p>
      <div style="background:#F8F9FA;padding:25px;border-radius:8px;margin:20px 0;border-left:4px solid #ed8b00;">
        <p style="margin:0 0 10px;color:#4A5568;font-size:15px;"><strong>Usuario / Correo:</strong> <span style="color:#001871;">{email}</span></p>
        <p style="margin:0 0 20px;color:#4A5568;font-size:15px;"><strong>Contraseña temporal:</strong> <span style="color:#001871;">{password or '—'}</span></p>
        <p style="margin:0 0 10px;color:#4A5568;font-size:14px;text-transform:uppercase;font-weight:bold;letter-spacing:.5px;">Código de verificación:</p>
        <div style="background:#001871;color:#fff;padding:12px 20px;border-radius:6px;display:inline-block;font-size:24px;font-weight:bold;letter-spacing:3px;">{codigo}</div>
      </div>
      <p style="font-size:14px;color:#718096;line-height:1.5;"><strong style="color:#e53e3e;">Nota:</strong> Este código expira en 15 minutos.</p>
    </div>
    <div style="background:#001871;color:#fff;padding:20px;text-align:center;font-size:12px;line-height:1.6;">
      <p style="margin:0;font-size:14px;"><strong>GCT - Sistema de Gestión</strong></p>
      <p style="margin:5px 0 0;color:#e2e8f0;">Russell Bedford Colombia</p>
      <p style="margin:10px 0 0;"><a href="https://conecta-gct.rbgct.cloud" style="color:#00a9ce;text-decoration:none;font-size:13px;font-weight:bold;">🌐 conecta-gct.rbgct.cloud</a></p>
    </div>
  </div>
</div>"""

    payload = {
        'tipo': WORKFLOWS['bienvenida'],
        'destinatario': email,
        'asunto': 'Bienvenido a GCT - Credenciales de acceso',
        'html_email': html_email,
        'datos_sensibles': {'correo_login': email},
        'datos_usuario': {'nombre': nombre_usuario, 'expira_en': '15 minutos'},
        'plantilla': 'bienvenida_rbgct',
    }
    ok, result = _dispatch('bienvenida', email, payload)
    if not ok:
        return _fallback_smtp_bienvenida(email, codigo)
    return True, {'status': 'webhook_sent', 'n8n_response': result}


def enviar_codigo_login(email: str, codigo: str, nombre: str | None = None):
    """
    Código de verificación en el flujo de login 2FA.
    Se lanza en hilo para no bloquear la respuesta de login.
    """
    nombre_usuario = nombre or 'Usuario'
    payload = {
        'tipo': WORKFLOWS['login_codigo'],
        'destinatario': email,
        'asunto': 'Código de verificación - GCT',
        'codigo': codigo,
        'datos_usuario': {'nombre': nombre_usuario, 'expira_en': '15 minutos'},
    }
    _dispatch_async('login_codigo', email, payload)


def enviar_recuperacion_password(email: str, codigo: str, nombre: str | None = None):
    """
    Código de recuperación de contraseña.
    Retorna (bool, resultado) — el view decide si mostrar error.
    """
    nombre_usuario = nombre or 'Usuario'
    html_email = f"""<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#F8F9FA;">
  <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.05);">
    <div style="text-align:center;padding:30px 20px 20px;">
      <img src="https://raw.githubusercontent.com/AutomatizaRussell/Resourse_GestionHumana/main/Logo_RB2021.png" alt="Russell Bedford" style="height:50px;margin-bottom:15px;">
    </div>
    <div style="height:4px;background:linear-gradient(to right,#001871 50%,#00a9ce 50%,#00a9ce 75%,#ed8b00 75%,#ed8b00 100%);"></div>
    <div style="padding:40px 30px;">
      <h2 style="color:#001871;font-size:24px;margin-top:0;">Recuperación de Contraseña</h2>
      <p style="font-size:16px;color:#4A5568;line-height:1.6;">Hola <strong>{nombre_usuario}</strong>,</p>
      <p style="font-size:16px;color:#4A5568;line-height:1.6;">Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Usa el siguiente código:</p>
      <div style="background:#F8F9FA;padding:35px 20px;border-radius:8px;margin:30px 0;border:1px solid #e2e8f0;border-top:4px solid #00a9ce;text-align:center;">
        <p style="margin:0 0 15px;color:#4A5568;font-size:14px;text-transform:uppercase;font-weight:bold;letter-spacing:.5px;">Código de verificación</p>
        <div style="color:#001871;font-size:40px;font-weight:bold;letter-spacing:12px;margin:0;">{codigo}</div>
      </div>
      <p style="font-size:14px;color:#718096;line-height:1.5;"><strong style="color:#e53e3e;">Importante:</strong> Este código expira en 15 minutos. Si no solicitaste este cambio, ignora este mensaje.</p>
    </div>
    <div style="background:#001871;color:#fff;padding:20px;text-align:center;font-size:12px;line-height:1.6;">
      <p style="margin:0;font-size:14px;"><strong>GCT - Sistema de Gestión</strong></p>
      <p style="margin:5px 0 0;color:#e2e8f0;">Russell Bedford Colombia</p>
      <p style="margin:10px 0 0;"><a href="https://conecta-gct.rbgct.cloud" style="color:#00a9ce;text-decoration:none;font-size:13px;font-weight:bold;">🌐 conecta-gct.rbgct.cloud</a></p>
    </div>
  </div>
</div>"""
    payload = {
        'tipo': WORKFLOWS['recuperacion_pwd'],
        'destinatario': email,
        'asunto': 'Recuperación de Contraseña - GCT',
        'html_email': html_email,
        'datos_sensibles': {'correo_login': email, 'codigo_verificacion': codigo},
        'datos_usuario': {'nombre': nombre_usuario, 'expira_en': '15 minutos'},
    }
    return _dispatch('recuperacion_pwd', email, payload)


def notificar_password_restablecida(email: str, nombre: str, area: str = '', cargo: str = ''):
    """
    Notificación admin cuando un empleado restablece su contraseña.
    Siempre asíncrono — nunca bloquea.
    """
    payload = {
        'tipo': WORKFLOWS['pwd_restablecida'],
        'evento': 'password_restablecida',
        'datos_empleado': {
            'nombre': nombre,
            'email': email,
            'area': area or 'Sin área',
            'cargo': cargo or 'Sin cargo',
        },
        'mensaje': f"El empleado {nombre} ha restablecido su contraseña",
        'timestamp': str(datetime.now()),
    }
    _dispatch_async('pwd_restablecida', email, payload)


def enviar_certificado_empleo(email_destino: str, html_email: str,
                               nombre_empleado: str,
                               pdf_base64: str = '', pdf_nombre: str = ''):
    """
    Envía certificado de empleo adjunto en PDF vía n8n.
    Retorna (bool, resultado).
    """
    payload = {
        'tipo': WORKFLOWS['certificado_empleo'],
        'destinatario': email_destino,
        'asunto': f'Certificado de Empleo — {nombre_empleado}',
        'html_email': html_email,
        'plantilla': 'certificado_empleo',
        'attachment_base64': pdf_base64,
        'attachment_name': pdf_nombre or f'Certificado_{nombre_empleado}.pdf',
        'attachment_type': 'application/pdf',
    }
    return _dispatch('certificado_empleo', email_destino, payload)


def subir_intranet_async(tipo: str, nombre_archivo: str, contenido_bytes: bytes, content_type: str = 'application/octet-stream'):
    """Sube un archivo a SharePoint vía n8n en hilo daemon (no bloquea el request)."""
    def _run():
        close_old_connections()
        try:
            url = getattr(settings, 'N8N_SHAREPOINT_WEBHOOK', '')
            if not url:
                logger.error('[GW] N8N_SHAREPOINT_WEBHOOK no configurado')
                return
            resp = requests.post(
                url,
                headers={'X-API-Key': getattr(settings, 'N8N_WEBHOOK_API_KEY', '')},
                files={'data': (nombre_archivo, contenido_bytes, content_type)},
                data={'tipo': tipo},
                timeout=30,
            )
            if resp.ok:
                logger.info(f'[GW] subir_intranet {tipo}/{nombre_archivo} OK')
            else:
                logger.error(f'[GW] subir_intranet {tipo}/{nombre_archivo} HTTP {resp.status_code}')
        except Exception as exc:
            logger.error(f'[GW] subir_intranet error: {exc}')
        finally:
            close_old_connections()

    threading.Thread(target=_run, daemon=True).start()


def descargar_intranet(tipo: str, archivo: str):
    """
    Descarga un archivo desde SharePoint vía n8n.
    Usa un webhook diferente al principal (N8N_SHAREPOINT_DOWNLOAD_WEBHOOK).
    Retorna el objeto Response de requests o lanza excepción.
    """
    url = getattr(settings, 'N8N_SHAREPOINT_DOWNLOAD_WEBHOOK', '')
    if not url:
        raise RuntimeError('N8N_SHAREPOINT_DOWNLOAD_WEBHOOK no configurado')

    resp = requests.post(
        url,
        headers={'X-API-Key': getattr(settings, 'N8N_WEBHOOK_API_KEY', '')},
        json={'tipo': tipo, 'archivo': archivo},
        timeout=30,
    )
    resp.raise_for_status()
    return resp


# ─────────────────────────────────────────────────────────────────────────────
# Utilidades de monitoreo (usadas por el proxy de ia.py)
# ─────────────────────────────────────────────────────────────────────────────

def _duracion_segundos(execution: dict):
    started_at = execution.get('startedAt')
    stopped_at = execution.get('stoppedAt')
    if not started_at or not stopped_at:
        return None
    try:
        s = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
        e = datetime.fromisoformat(stopped_at.replace('Z', '+00:00'))
        return max(0, round((e - s).total_seconds()))
    except Exception:
        return None


def sincronizar_ejecuciones(executions: list):
    """
    Persiste ejecuciones recibidas desde la API de n8n en N8nLog.
    Usa cache para deduplicar por execution id.
    """
    try:
        from .models import N8nLog
    except ImportError:
        from api.models import N8nLog

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
            duracion = _duracion_segundos(ex)
            msg = f"Duración: {duracion}s" if duracion is not None else ex.get('status', '')
            N8nLog.objects.create(
                workflow_name=wf_name,
                status='SUCCESS' if ok else 'ERROR',
                message=msg,
                tipo_evento=ex.get('mode', 'webhook'),
                response_data=json.dumps({'exec_id': exec_id})[:200],
            )
            cache.set(dedupe_key, True, timeout=86400)
        except Exception as err:
            logger.warning(f"[GW SYNC] No se pudo persistir ejecución: {err}")


def sincronizar_ejecuciones_async(executions: list):
    """Lanza sincronizar_ejecuciones en hilo daemon."""
    def _run():
        close_old_connections()
        try:
            sincronizar_ejecuciones(executions)
        finally:
            close_old_connections()
    threading.Thread(target=_run, daemon=True).start()


# ─────────────────────────────────────────────────────────────────────────────
# Fallback SMTP — solo para bienvenida cuando n8n no responde
# ─────────────────────────────────────────────────────────────────────────────

def _fallback_smtp_bienvenida(email: str, codigo: str):
    try:
        from django.core.mail import send_mail
        subject = 'Código de verificación - GCT'
        message = (
            f"Tu código de verificación es: {codigo}\n\n"
            "Este código expira en 15 minutos.\n\n"
            "GCT - Sistema de Gestión | Russell Bedford Colombia"
        )
        send_mail(
            subject, message,
            getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@rbgct.cloud'),
            [email],
            fail_silently=False,
        )
        return True, {'status': 'smtp_fallback', 'email': email}
    except Exception as smtp_err:
        logger.error(f"[GW SMTP FALLBACK] Error: {smtp_err}")
        return False, str(smtp_err)
