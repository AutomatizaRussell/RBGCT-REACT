"""
Certificados de empleo: envío por correo, solicitudes y permisos.
"""
import os
import json
import uuid
import logging
from datetime import datetime

try:
    import fcntl
    _HAS_FCNTL = True
except ImportError:
    # fcntl is not available on Windows; file locking is skipped there.
    fcntl = None  # type: ignore
    _HAS_FCNTL = False

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings

from ..models import DatosEmpleado

from ._utils import (
    _puede_gestionar_certificados,
    _es_empleado,
    _es_superadmin,
    _ensure_cert_dir,
    _leer_cert_permisos,
)
from ..n8n_gateway import enviar_certificado_empleo as gw_certificado_empleo

logger = logging.getLogger(__name__)

# Rutas en volumen persistente (media_volume_prod) para sobrevivir reinicios
_MEDIA_DIR = os.path.join(settings.MEDIA_ROOT, 'cert_data')
_SOLICITUDES_FILE = os.path.join(_MEDIA_DIR, 'solicitudes_cert.json')
_CERT_PERMISOS_FILE = os.path.join(_MEDIA_DIR, 'cert_permisos.json')


def _flock_sh(f):
    if _HAS_FCNTL:
        fcntl.flock(f, fcntl.LOCK_SH)

def _flock_ex(f):
    if _HAS_FCNTL:
        fcntl.flock(f, fcntl.LOCK_EX)

def _flock_un(f):
    if _HAS_FCNTL:
        fcntl.flock(f, fcntl.LOCK_UN)


def _leer_solicitudes():
    _ensure_cert_dir()
    if not os.path.exists(_SOLICITUDES_FILE):
        return []
    try:
        with open(_SOLICITUDES_FILE, 'r', encoding='utf-8') as f:
            _flock_sh(f)
            data = json.load(f)
            _flock_un(f)
            return data
    except Exception:
        return []


def _guardar_solicitudes(data):
    _ensure_cert_dir()
    try:
        with open(_SOLICITUDES_FILE, 'w', encoding='utf-8') as f:
            _flock_ex(f)
            json.dump(data, f, ensure_ascii=False, indent=2)
            _flock_un(f)
    except Exception as e:
        logger.error(f'[solicitudes_cert] Error al guardar: {e}')
        raise


def _guardar_cert_permisos(data):
    _ensure_cert_dir()
    try:
        with open(_CERT_PERMISOS_FILE, 'w', encoding='utf-8') as f:
            _flock_ex(f)
            json.dump(data, f, ensure_ascii=False)
            _flock_un(f)
    except Exception as e:
        logger.error(f'[cert_permisos] Error al guardar: {e}')
        raise


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enviar_certificado_empleo(request):
    """
    Recibe los datos del certificado desde el frontend,
    genera el HTML y lo envía por correo usando el flujo n8n existente.
    NO modifica ningún flujo existente — usa workflow_name propio.
    """
    if not _puede_gestionar_certificados(request.user):
        return Response({'error': 'No tienes permisos para expedir certificados.'}, status=403)

    data            = request.data
    email_destino   = data.get('email_destino', '').strip()
    nombre_empleado = data.get('nombre_empleado', '')
    tipo_doc        = data.get('tipo_documento', '')
    num_doc         = data.get('numero_documento', '')
    cargo           = data.get('cargo', '')
    fecha_ingreso   = data.get('fecha_ingreso', '')
    tipo_contrato   = data.get('tipo_contrato', '')
    salario         = data.get('salario', '')
    ingresos_adic   = data.get('ingresos_adicionales', '')
    destinatario    = data.get('destinatario', '')
    fecha_cert      = data.get('fecha', '')
    consecutivo     = data.get('consecutivo', '')
    firmante_nombre = data.get('firmante_nombre', '')
    firmante_cc     = data.get('firmante_cc', '')
    firmante_cargo  = data.get('firmante_cargo', '')

    if not email_destino:
        return Response({'error': 'El campo email_destino es requerido.'}, status=400)

    # ── Construir HTML del certificado ─────────────────────────────────────
    salario_resumen = ""
    if salario:
        salario_resumen = salario if not ingresos_adic else f"{salario} + {ingresos_adic}"
    fecha_row_html = (
        f"""
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:12px;">Fecha emisión</td>
          <td style="padding:8px;border:1px solid #e2e8f0;color:#0f172a;font-size:12px;">{fecha_cert}</td>
        </tr>
        """
        if fecha_cert else ""
    )
    destinatario_row_html = (
        f"""
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:12px;">Destinatario</td>
          <td style="padding:8px;border:1px solid #e2e8f0;color:#0f172a;font-size:12px;">{destinatario}</td>
        </tr>
        """
        if destinatario else ""
    )
    contrato_row_html = (
        f"""
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:12px;">Tipo contrato</td>
          <td style="padding:8px;border:1px solid #e2e8f0;color:#0f172a;font-size:12px;">{tipo_contrato}</td>
        </tr>
        """
        if tipo_contrato else ""
    )
    firmado_por = ""
    if firmante_nombre:
        firmado_por = firmante_nombre
        if firmante_cargo:
            firmado_por = f"{firmado_por} ({firmante_cargo})"
        if firmante_cc:
            firmado_por = f"{firmado_por} - C.C. {firmante_cc}"
    firma_row_html = (
        f"""
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:12px;">Firmado por</td>
          <td style="padding:8px;border:1px solid #e2e8f0;color:#0f172a;font-size:12px;">{firmado_por}</td>
        </tr>
        """
        if firmado_por else ""
    )
    salario_row_html = (
        f"""
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:12px;">Salario</td>
          <td style="padding:8px;border:1px solid #e2e8f0;color:#0f172a;font-size:12px;">{salario_resumen}</td>
        </tr>
        """
        if salario_resumen else ""
    )

    html_email = f"""
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:620px;margin:0 auto;background:#f8fafc;padding:18px;">
  <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
    <div style="background:#001e33;padding:14px 18px;">
      <p style="margin:0;color:#ffffff;font-size:17px;font-weight:700;">Certificado de Empleo</p>
      <p style="margin:6px 0 0;color:#cbd5e1;font-size:12px;">{nombre_empleado}</p>
    </div>

    <div style="padding:18px;">
      <p style="margin:0 0 10px;color:#334155;font-size:14px;">Hola,</p>
      <p style="margin:0 0 14px;color:#334155;font-size:13px;line-height:1.55;">
        Adjuntamos el certificado de empleo solicitado para
        <strong>{nombre_empleado}</strong>.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 14px;">
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:12px;">Documento</td>
          <td style="padding:8px;border:1px solid #e2e8f0;color:#0f172a;font-size:12px;">{tipo_doc} {num_doc}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:12px;">Cargo</td>
          <td style="padding:8px;border:1px solid #e2e8f0;color:#0f172a;font-size:12px;">{cargo}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:12px;">Fecha ingreso</td>
          <td style="padding:8px;border:1px solid #e2e8f0;color:#0f172a;font-size:12px;">{fecha_ingreso}</td>
        </tr>
        <tr>
          <td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:12px;">Consecutivo</td>
          <td style="padding:8px;border:1px solid #e2e8f0;color:#0f172a;font-size:12px;">{consecutivo or '-'}</td>
        </tr>
        {fecha_row_html}
        {destinatario_row_html}
        {contrato_row_html}
        {firma_row_html}
        {salario_row_html}
      </table>

      <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">
        Si no puedes visualizar el contenido del correo, descarga el archivo PDF adjunto.
      </p>
    </div>
  </div>
</div>"""

    pdf_base64 = data.get('pdf_base64', '')
    pdf_nombre = data.get('pdf_nombre', f'Certificado_{nombre_empleado}.pdf')

    ok, result = gw_certificado_empleo(email_destino, html_email, nombre_empleado, pdf_base64, pdf_nombre)

    if ok:
        return Response({'status': 'enviado', 'detalle': result})
    return Response({'error': 'No se pudo enviar el correo.', 'detalle': result}, status=502)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def crear_solicitud_cert(request):
    try:
        if not _es_empleado(request.user) or getattr(request.user, 'estado', None) != 'ACTIVA':
            return Response({'error': 'Solo empleados activos pueden crear solicitudes.'}, status=403)

        d = request.data
        id_solicitante = str(request.user.id_empleado)
        id_payload = str(d.get('id_empleado', '')).strip()
        if id_payload and id_payload != id_solicitante:
            return Response({'error': 'No puedes crear solicitudes para otro empleado.'}, status=403)

        solicitud = {
            'id':         str(uuid.uuid4())[:8],
            'estado':     'pendiente',
            'creado_en':  datetime.now().isoformat(),
            'datos': {
                'fecha':              d.get('fecha', ''),
                'tipo_entidad':       d.get('tipo_entidad', ''),
                'nombre_entidad':     d.get('nombre_entidad', ''),
                'incluir_salario':    d.get('incluir_salario', 'Sí'),
                'auxilio_transporte': d.get('auxilio_transporte', 'No'),
                'asunto':             d.get('asunto', ''),
                'nombre_empleado':    d.get('nombre_empleado', ''),
                'tipo_documento':     d.get('tipo_documento', ''),
                'numero_documento':   d.get('numero_documento', ''),
                'nombre_cargo':       d.get('nombre_cargo', ''),
                'fecha_ingreso':      d.get('fecha_ingreso', ''),
                'correo_corporativo': d.get('correo_corporativo') or request.user.correo_corporativo,
                'id_empleado':        id_solicitante,
            },
        }
        lista = _leer_solicitudes()
        lista.append(solicitud)
        _guardar_solicitudes(lista)
        return Response({'id': solicitud['id'], 'ok': True})
    except Exception as e:
        logger.error(f'[solicitudes_cert] Error al crear: {e}')
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listar_solicitudes_cert(request):
    if not _puede_gestionar_certificados(request.user):
        return Response({'error': 'No tienes permisos para ver solicitudes de certificado.'}, status=403)

    lista = _leer_solicitudes()
    pendientes = [s for s in lista if s.get('estado') == 'pendiente']
    return Response({'solicitudes': pendientes, 'total': len(pendientes)})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def atender_solicitud_cert(request, solicitud_id):
    try:
        if not _puede_gestionar_certificados(request.user):
            return Response({'error': 'No tienes permisos para gestionar solicitudes de certificado.'}, status=403)

        accion = request.data.get('accion', 'rechazar')
        lista  = _leer_solicitudes()
        for s in lista:
            if s['id'] == solicitud_id:
                s['estado'] = 'aceptada' if accion == 'aceptar' else 'rechazada'
                break
        _guardar_solicitudes(lista)
        return Response({'ok': True})
    except Exception as e:
        logger.error(f'[solicitudes_cert] Error al atender {solicitud_id}: {e}')
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_cert_permisos(request):
    lista = [str(x) for x in _leer_cert_permisos()]

    # SuperAdmin puede administrar toda la lista.
    if _es_superadmin(request.user):
        return Response({'permisos': lista})

    # Empleados solo conocen su propio permiso.
    if _es_empleado(request.user):
        mi_id = str(request.user.id_empleado)
        return Response({'permisos': [mi_id] if mi_id in lista else []})

    return Response({'permisos': []})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_cert_permiso(request):
    try:
        if not _es_superadmin(request.user):
            return Response({'error': 'Solo SuperAdmin puede modificar permisos de certificado.'}, status=403)

        id_empleado = request.data.get('id_empleado')
        value = request.data.get('value', False)
        if id_empleado is None:
            return Response({'error': 'id_empleado requerido'}, status=400)

        try:
            emp = DatosEmpleado.objects.only('id_empleado').get(id_empleado=id_empleado)
        except DatosEmpleado.DoesNotExist:
            return Response({'error': 'Empleado no encontrado'}, status=404)

        lista = [str(x) for x in _leer_cert_permisos()]
        id_str = str(emp.id_empleado)

        if isinstance(value, str):
            habilitar = value.strip().lower() in {'1', 'true', 't', 'si', 'sí', 'yes', 'on'}
        else:
            habilitar = bool(value)

        if habilitar:
            if id_str not in lista:
                lista.append(id_str)
        else:
            lista = [x for x in lista if x != id_str]

        _guardar_cert_permisos(lista)
        return Response({'ok': True, 'permisos': lista})
    except Exception as e:
        logger.error(f'[cert_permisos] Error: {e}')
        return Response({'error': str(e)}, status=500)
