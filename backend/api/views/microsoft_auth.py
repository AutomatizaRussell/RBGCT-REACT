"""
Autenticación OAuth con Microsoft Azure AD.
Recibe el code del frontend, lo intercambia con Microsoft, valida el email
contra DatosEmpleado y emite el JWT de GCT.
"""
import logging
import urllib.request
import urllib.parse
import json

from django.conf import settings
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from django.db import transaction
from ..models import DatosEmpleado, SuperAdmin, Persona, DatosContacto
from ..jwt_utils import generate_tokens, build_empleado_payload, build_superadmin_payload, ROLE_MAP

DOMINIOS_PERMITIDOS = {'rbcol.co', 'russellbedford.com'}

logger = logging.getLogger(__name__)


def _exchange_code(code: str, redirect_uri: str) -> dict:
    """Intercambia el authorization code con Microsoft y retorna el id_token decodificado."""
    tenant_id = settings.AZURE_TENANT_ID
    client_id = settings.AZURE_CLIENT_ID
    client_secret = settings.AZURE_CLIENT_SECRET

    token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"

    payload = urllib.parse.urlencode({
        "grant_type": "authorization_code",
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "redirect_uri": redirect_uri,
        "scope": "openid email profile User.Read",
    }).encode("utf-8")

    req = urllib.request.Request(token_url, data=payload, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


def _decode_id_token(ms_response: dict) -> dict:
    """Decodifica el payload del id_token de Microsoft y retorna los campos útiles."""
    import base64
    id_token = ms_response.get("id_token", "")
    if not id_token:
        raise ValueError("Microsoft no retornó id_token")

    parts = id_token.split(".")
    if len(parts) != 3:
        raise ValueError("id_token con formato inválido")

    padded = parts[1] + "=" * (4 - len(parts[1]) % 4)
    payload = json.loads(base64.urlsafe_b64decode(padded))

    email = (
        payload.get("preferred_username")
        or payload.get("email")
        or payload.get("upn")
        or ""
    ).strip().lower()

    if not email:
        raise ValueError("No se pudo obtener el email del token de Microsoft")

    return {
        "email": email,
        "nombre": payload.get("given_name") or payload.get("name", "").split()[0] or "",
        "apellido": payload.get("family_name") or (payload.get("name", "").split()[-1] if payload.get("name") else "") or "",
    }


@api_view(["GET"])
@permission_classes([AllowAny])
def microsoft_auth_url(request):
    """
    GET /api/auth/microsoft/url/?redirect_uri=...
    Devuelve la URL de autorización de Microsoft para que el frontend redirija.
    """
    tenant_id = getattr(settings, "AZURE_TENANT_ID", "")
    client_id = getattr(settings, "AZURE_CLIENT_ID", "")

    if not tenant_id or not client_id:
        return Response(
            {"error": "Login con Microsoft no está configurado"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    redirect_uri = request.query_params.get("redirect_uri", "")
    if not redirect_uri:
        return Response(
            {"error": "redirect_uri requerido"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    scope = "openid email profile User.Read"
    url = (
        f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize"
        f"?client_id={urllib.parse.quote(client_id)}"
        f"&response_type=code"
        f"&redirect_uri={urllib.parse.quote(redirect_uri)}"
        f"&scope={urllib.parse.quote(scope)}"
        f"&response_mode=query"
        f"&prompt=select_account"
    )
    return Response({"url": url})


@api_view(["POST"])
@permission_classes([AllowAny])
def microsoft_auth_callback(request):
    """
    POST /api/auth/microsoft/
    Body: { code, redirect_uri }
    Retorna JWT de GCT si el email de Microsoft está registrado como empleado.
    """
    code = request.data.get("code", "").strip()
    redirect_uri = request.data.get("redirect_uri", "").strip()

    if not code or not redirect_uri:
        return Response(
            {"error": "Faltan parámetros: code y redirect_uri son requeridos"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Verificar que las credenciales de Azure estén configuradas
    if not all([
        getattr(settings, "AZURE_TENANT_ID", None),
        getattr(settings, "AZURE_CLIENT_ID", None),
        getattr(settings, "AZURE_CLIENT_SECRET", None),
    ]):
        logger.error("[MICROSOFT AUTH] Variables de Azure no configuradas")
        return Response(
            {"error": "Login con Microsoft no está configurado en el servidor"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # 1. Intercambiar código con Microsoft
    try:
        ms_response = _exchange_code(code, redirect_uri)
    except Exception as e:
        logger.warning(f"[MICROSOFT AUTH] Error al intercambiar code: {e}")
        return Response(
            {"error": "No se pudo verificar la identidad con Microsoft. Intenta de nuevo."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # 2. Extraer email y nombre del id_token
    try:
        ms_user = _decode_id_token(ms_response)
    except Exception as e:
        logger.warning(f"[MICROSOFT AUTH] Error extrayendo email: {e}")
        return Response(
            {"error": "No se pudo obtener el email de tu cuenta Microsoft."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    email = ms_user["email"]

    # 3a. Buscar SuperAdmin
    try:
        admin = SuperAdmin.objects.get(email=email)
        if admin.estado != "ACTIVA":
            return Response(
                {"error": "Tu cuenta está inactiva. Contacta al administrador."},
                status=status.HTTP_403_FORBIDDEN,
            )
        from django.utils import timezone as tz
        admin.last_login = tz.now()
        admin.save(update_fields=["last_login"])
        tokens = generate_tokens(build_superadmin_payload(admin))
        return Response({
            "access_token": tokens["accessToken"],
            "refresh_token": tokens["refreshToken"],
            "role": "superadmin",
            "primer_login": False,
            "type": "superadmin",
            "user": {
                "id": str(admin.id),
                "email": admin.email,
                "nombre": admin.nombre,
            },
        })
    except SuperAdmin.DoesNotExist:
        pass

    # 3b. Buscar empleado por correo corporativo
    try:
        empleado = DatosEmpleado.objects.select_related("persona", "area", "cargo").get(
            correo_corporativo=email
        )
    except DatosEmpleado.DoesNotExist:
        # Auto-registro si el dominio es corporativo
        dominio = email.split("@")[-1].lower()
        if dominio not in DOMINIOS_PERMITIDOS:
            logger.warning(f"[MICROSOFT AUTH] Dominio no permitido: {email}")
            return Response(
                {"error": f"La cuenta {email} no está autorizada para acceder a GCT."},
                status=status.HTTP_403_FORBIDDEN,
            )

        logger.info(f"[MICROSOFT AUTH] Auto-registrando nuevo usuario: {email}")
        with transaction.atomic():
            persona = Persona.objects.create(
                primer_nombre=ms_user["nombre"] or email.split("@")[0],
                primer_apellido=ms_user["apellido"] or "",
            )
            DatosContacto.objects.create(persona=persona)
            empleado = DatosEmpleado.objects.create(
                persona=persona,
                correo_corporativo=email,
                primer_login=True,
                id_permisos=3,
                estado="ACTIVA",
            )

    # 4. Verificar que la cuenta esté activa
    if empleado.estado != "ACTIVA":
        return Response(
            {"error": "Tu cuenta está inactiva. Contacta al administrador."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # 5. Actualizar última actividad
    empleado.ultima_actividad = timezone.now()
    empleado.save(update_fields=["ultima_actividad"])

    # 6. Emitir JWT de GCT
    tokens = generate_tokens(build_empleado_payload(empleado))
    role = ROLE_MAP.get(empleado.id_permisos, "usuario")

    return Response({
        "access_token": tokens["accessToken"],
        "refresh_token": tokens["refreshToken"],
        "role": role,
        "primer_login": empleado.primer_login,
        "type": "empleado",
        "user": {
            "id_empleado": empleado.id_empleado,
            "correo_corporativo": empleado.correo_corporativo,
            "id_permisos": empleado.id_permisos,
            "primer_login": empleado.primer_login,
            "datos_completados": not empleado.primer_login,
            "primer_nombre": empleado.persona.primer_nombre if empleado.persona else "",
            "primer_apellido": empleado.persona.primer_apellido if empleado.persona else "",
            "estado": empleado.estado,
            "area_id": empleado.area_id,
            "cargo_id": empleado.cargo_id,
            "nombre_area": empleado.area.nombre_area if empleado.area else "",
            "nombre_cargo": empleado.cargo.nombre_cargo if empleado.cargo else "",
            "cargo_nivel": empleado.cargo.nivel if empleado.cargo else "",
            "acceso_formularios_sqf": empleado.acceso_formularios_sqf,
            "acceso_sqf_clientes": empleado.acceso_sqf_clientes,
            "acceso_sqf_contratos": empleado.acceso_sqf_contratos,
            "acceso_sqf_facturacion": empleado.acceso_sqf_facturacion,
            "acceso_sqf_auditoria": empleado.acceso_sqf_auditoria,
        },
    })
