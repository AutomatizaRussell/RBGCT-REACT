"""
Helpers para normalizar y validar payloads que llegan desde FormulariosSQF vía n8n.

El objetivo es centralizar el parseo de datos SQF para que los endpoints
`/from_sqf/` sean robustos, idempotentes y seguros.
"""
import json
import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.core.validators import validate_email


# ── Constantes ───────────────────────────────────────────────────────────────

MAX_RAZON_SOCIAL = 255
MAX_NIT = 20
MAX_NOMBRE = 150
MAX_EMAIL = 254
MAX_TELEFONO = 20
MAX_DIRECCION = 255
MAX_OBSERVACIONES = 2000
MAX_SQFI_D = 30

# Mapeo de centros/códigos SQF a nombres de área normalizados.
# Se usa como fallback cuando no se encuentra un área exacta por nombre.
CENTRO_SQF_A_AREA = {
    'REVISORIA FISCAL': 'Revisoría Fiscal y Auditoría',
    'AUDITORIA EXTERNA': 'Revisoría Fiscal y Auditoría',
    'CONTABILIDAD': 'Contabilidad',
    'BPO': 'BPO',
    'SERVICIOS LEGALES': 'Legal',
    'IMPUESTOS': 'Impuestos',
    'CONSULTORIA FINANCIERA': 'Financiera',
    'ADMON': 'Administración',
}

# Mapeo de descripciones de servicio SQF a nombres de área.
SERVICIO_SQF_A_AREA = {
    'DECLARACION DE RENTA': 'Impuestos',
    'DECLARACIÓN DE RENTA': 'Impuestos',
    'ACTUALIZACION RIT': 'Impuestos',
    'ACTUALIZACIÓN RIT': 'Impuestos',
    'SALDO A FAVOR': 'Contabilidad',
    'SALDO A FAVOR - CONT': 'Contabilidad',
    'SALDO A FAVOR - IMP': 'Impuestos',
    'SALDOS A FAVOR - IMP': 'Impuestos',
    'SOLICITUD SALDO A FAVOR': 'Impuestos',
    'ASESORIA PERMANENTE': 'Impuestos',
    'ASESORÍA PERMANENTE': 'Impuestos',
    'ACOMPAÑAMIENTO TRIBUTARIO': 'Impuestos',
    'ACOMPAÑMIENTO TRIBUTARIO': 'Impuestos',
    'CONSTITUCION DE SOCIEDADES': 'Legal',
    'CONSTITUCIÓN DE SOCIEDADES': 'Legal',
    'INFORMACION EXOGENA': 'Impuestos',
    'INFORMACIÓN EXOGENA': 'Impuestos',
    'SG-SST': 'Legal',
    'SGSST': 'Legal',
    'TOMAS FISICAS DE INVENTARIO': 'Revisoría Fiscal y Auditoría',
    'TOMAS FÍSICAS DE INVENTARIO': 'Revisoría Fiscal y Auditoría',
    'PROTECCION DE DATOS': 'Legal',
    'PROTECCIÓN DE DATOS': 'Legal',
    'VALORACION DE LA COMPAÑIA': 'Financiera',
    'VALORACIÓN DE LA COMPAÑIA': 'Financiera',
    'PRECIOS DE TRANSFERENCIA': 'Impuestos',
    'OUTSOURCING DE NOMINA': 'BPO',
    'OUTSOURCING DE NÓMINA': 'BPO',
    'OUTSOURCING CONTABLE': 'Contabilidad',
    'PLANEACION ADUANERA': 'Impuestos',
    'PLANEACIÓN ADUANERA': 'Impuestos',
    'DICTAMEN PERICIAL': 'Contabilidad',
    'DUE DILLIGENCE': 'Contabilidad',
    'DUE DILIGENCE': 'Contabilidad',
    'REPORTE SGSST': 'Legal',
    'ESTRUCTURACION': 'Legal',
    'ESTRUCTURACIÓN': 'Legal',
    'INFORME': 'Legal',
}

TIPO_CONTRATO_SQF = {
    'mensual': 'mensual',
    'proyecto': 'proyecto',
    'horas trabajadas': 'otro',
    'fee mensual': 'mensual',
    'fee mensual cruzado': 'mensual',
    'proyecto cruzado': 'proyecto',
}

PERIODICIDAD_SQF = {
    'mensual': 'mensual',
    'proyecto': 'unico',
    'horas trabajadas': 'unico',
    'fee mensual': 'mensual',
    'fee mensual cruzado': 'mensual',
    'proyecto cruzado': 'unico',
}


# ── Sanitización básica ──────────────────────────────────────────────────────

def _strip_control_chars(value: str) -> str:
    """Elimina caracteres de control y retornos de carro/saltos de línea sueltos."""
    if not value:
        return ''
    # Conserva espacios normales y saltos de línea explícitos, quita control chars.
    value = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]', '', value)
    return value.strip()


def clean_string(value, max_length: int = 255, default: str | None = None) -> str | None:
    """Limpia y trunca un string de forma segura."""
    if value is None:
        return default
    value = str(value)
    value = _strip_control_chars(value)
    value = value.replace('\r', ' ').replace('\n', ' ')
    value = re.sub(r'\s+', ' ', value).strip()
    if not value:
        return default
    return value[:max_length]


def clean_nit(value, separar_dv: bool = False) -> tuple | str | None:
    """
    Normaliza un NIT: solo dígitos, máximo 20 caracteres.
    Si `separar_dv=True`, intenta separar el último dígito como DV cuando el
    valor contiene un guión. Devuelve (nit, dv).
    """
    if value is None:
        return (None, None) if separar_dv else None
    s = str(value).strip()
    if not s:
        return (None, None) if separar_dv else None

    dv = None
    if '-' in s:
        parte_nit, parte_dv = s.rsplit('-', 1)
        dv_clean = re.sub(r'[^0-9]', '', parte_dv)
        if dv_clean:
            dv = dv_clean[-1]
        s = parte_nit

    nit = re.sub(r'[^0-9]', '', s).strip()
    if not nit:
        return (None, None) if separar_dv else None

    if separar_dv:
        return nit[:MAX_NIT], dv
    return nit[:MAX_NIT]


def clean_email(value) -> str | None:
    """Valida y normaliza un email."""
    value = clean_string(value, max_length=MAX_EMAIL)
    if not value:
        return None
    try:
        validate_email(value)
        return value.lower()
    except ValidationError:
        return None


def clean_phone(value) -> str | None:
    """Normaliza un teléfono: dígitos, espacios, +, -, paréntesis y extensión."""
    value = clean_string(value, max_length=MAX_TELEFONO)
    if not value:
        return None
    value = re.sub(r'[^0-9+()\-\s]', '', value)
    value = re.sub(r'\s+', ' ', value).strip()
    return value or None


def clean_decimal(value) -> Decimal | None:
    """Convierte un valor monetario a Decimal."""
    if value is None:
        return None
    if isinstance(value, Decimal):
        return value
    s = str(value).strip()
    if not s:
        return None
    # Soporta '$ 15.000.000' o '15000000,00'
    s = s.replace('$', '').replace('.', '').replace(',', '.').strip()
    try:
        return Decimal(s)
    except (InvalidOperation, ValueError):
        return None


def clean_integer(value) -> int:
    """Convierte un valor a entero positivo o 0."""
    if value is None:
        return 0
    s = str(value).replace('.', '').replace(',', '').replace('$', '').strip()
    try:
        return max(0, int(s))
    except (ValueError, TypeError):
        return 0


def parse_date(value) -> date | None:
    """Parsea una fecha ISO o None."""
    if value is None or value == '':
        return None
    if isinstance(value, date):
        return value
    try:
        return datetime.fromisoformat(str(value)).date()
    except (ValueError, TypeError):
        return None


def parse_json_list(value) -> list:
    """Parsea un campo que puede venir como list o como string JSON."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return []
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except json.JSONDecodeError:
            return []
    return []


def parse_json_dict(value) -> dict:
    """Parsea un campo que puede venir como dict o como string JSON."""
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return {}
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


# ── Parseo de empresa ────────────────────────────────────────────────────────

def parse_empresa(data: dict) -> dict:
    """
    Extrae y sanitiza los datos de empresa desde un payload SQF.
    Levanta ValidationError si faltan datos obligatorios.
    """
    raw_document = (
        data.get('document') or data.get('nit') or data.get('clientDocument')
        or data.get('Documento') or data.get('documento')
    )
    nit, dv = clean_nit(raw_document, separar_dv=True)
    razon_social = clean_string(
        data.get('name') or data.get('razon_social') or data.get('clientName')
        or data.get('Nombre') or data.get('razonSocial'),
        max_length=MAX_RAZON_SOCIAL
    )

    if not nit:
        raise ValidationError('El NIT/documento es obligatorio.')
    if not razon_social:
        raise ValidationError('La razón social/nombre es obligatoria.')

    tipo_cliente = clean_string(
        data.get('clientType') or data.get('tipo_cliente') or data.get('tipoCliente'),
        max_length=10
    )
    if tipo_cliente and tipo_cliente not in ('natural', 'juridica'):
        # Intentar inferir por tipo de documento (campos español/inglés).
        tipo_doc = clean_string(
            data.get('Tipodocumento') or data.get('tipo_documento') or data.get('documentType'),
            max_length=20
        )
        tipo_doc_upper = (tipo_doc or '').upper()
        if tipo_doc_upper == 'NIT':
            tipo_cliente = 'juridica'
        elif tipo_doc_upper in ('CC', 'CE', 'PASAPORTE', 'PASSPORT', 'TI', 'RC'):
            tipo_cliente = 'natural'
        else:
            tipo_cliente = None

    dv_explicito = clean_string(
        data.get('documentDv') or data.get('digito_verificacion') or data.get('documentdv')
        or data.get('DV') or data.get('Dv') or data.get('DigitoVerificacion'),
        max_length=1
    )

    return {
        'nit': nit,
        'razon_social': razon_social,
        'digito_verificacion': dv_explicito or dv,
        'tipo_cliente': tipo_cliente,
        'tipo_empresa': 'pyme',
        'grupo_economico': clean_string(
            data.get('economicGroup') or data.get('grupo_economico') or data.get('GrupoEconomico'),
            max_length=150
        ),
        'direccion': clean_string(
            data.get('address') or data.get('direccion') or data.get('Direccion') or data.get('dirección'),
            max_length=MAX_DIRECCION
        ),
        'telefono': clean_phone(
            data.get('phone') or data.get('telefono') or data.get('Telefono') or data.get('teléfono')
        ),
        'email_principal': clean_email(
            data.get('email') or data.get('correo') or data.get('CorreoElectronico') or data.get('correo_electronico')
        ),
        'sqf_id': clean_string(data.get('id') or data.get('sqf_id'), max_length=MAX_SQFI_D),
        'sqf_status': 'pendiente',
        'estado': 'prospecto',
        'fecha_inicio_relacion': parse_date(data.get('fecha_inicio_relacion') or data.get('startDate')),
    }


def parse_contacto(data: dict) -> dict | None:
    """Extrae datos de contacto principal desde un payload SQF."""
    nombre = clean_string(
        data.get('contactName') or data.get('NombreContacto') or data.get('nombre_contacto'),
        max_length=MAX_NOMBRE
    )
    if not nombre:
        return None

    cargo_raw = clean_string(
        data.get('contactRole') or data.get('CargoContacto') or data.get('cargo_contacto'),
        max_length=50
    ) or 'otro'
    cargo = 'otro'
    for code, _ in [
        ('representante_legal', 'Representante Legal'),
        ('gerente', 'Gerente General'),
        ('contador', 'Contador'),
        ('auxiliar_contable', 'Auxiliar Contable'),
        ('abogado', 'Abogado'),
        ('tesoreria', 'Tesorería'),
        ('rrhh', 'RRHH'),
        ('revisor_fiscal', 'Revisor Fiscal'),
        ('otro', 'Otro'),
    ]:
        if cargo_raw.lower() in (code, code.replace('_', ' ')):
            cargo = code
            break

    return {
        'nombre': nombre,
        'cargo': cargo,
        'email': clean_email(data.get('email')),
        'telefono': clean_phone(data.get('phone') or data.get('telefono')),
        'es_principal': True,
        'activo': True,
        'notas': clean_string(data.get('info') or data.get('observaciones'), max_length=MAX_OBSERVACIONES),
    }


# ── Parseo de áreas / servicios ──────────────────────────────────────────────

def normalizar_area(nombre_area: str) -> str:
    """Normaliza el nombre de un área para comparación flexible."""
    nombre = clean_string(nombre_area, max_length=100) or ''
    return re.sub(r'\s+', ' ', nombre.upper())


def buscar_area_por_nombre(nombre_area: str, area_qs):
    """
    Busca un área por nombre (insensible a tildes, mayúsculas y espacios).
    `area_qs` debe ser el queryset de empleados.DatosArea.
    """
    if not nombre_area:
        return None
    target = normalizar_area(nombre_area)
    # Primero comparación exacta normalizada.
    for area in area_qs:
        if normalizar_area(area.nombre_area) == target:
            return area
    # Luego contiene.
    for area in area_qs:
        if target in normalizar_area(area.nombre_area) or normalizar_area(area.nombre_area) in target:
            return area
    return None


def mapear_centro_a_area(centro: str, area_qs):
    """
    Dado un centro de facturación SQF, intenta devolver el objeto DatosArea.
    Usa el mapa CENTRO_SQF_A_AREA como fallback.
    """
    if not centro:
        return None

    # 1. Intentar por nombre exacto del centro.
    area = buscar_area_por_nombre(centro, area_qs)
    if area:
        return area

    # 2. Intentar por mapa de sinónimos.
    centro_norm = normalizar_area(centro)
    for key, area_nombre in CENTRO_SQF_A_AREA.items():
        if centro_norm == normalizar_area(key):
            area = buscar_area_por_nombre(area_nombre, area_qs)
            if area:
                return area

    return None


def mapear_servicio_a_area(nombre_servicio: str, area_qs):
    """
    Dado el nombre de un servicio/contrato SQF, intenta devolver el objeto DatosArea.
    Primero busca por nombre exacto; luego por palabras clave del mapa SERVICIO_SQF_A_AREA.
    """
    if not nombre_servicio:
        return None

    # 1. Nombre exacto (Revisoría Fiscal y Auditoría, Legal, etc.).
    area = buscar_area_por_nombre(nombre_servicio, area_qs)
    if area:
        return area

    # 2. Mapa de sinónimos por contención.
    servicio_norm = normalizar_area(nombre_servicio)
    for key, area_nombre in SERVICIO_SQF_A_AREA.items():
        key_norm = normalizar_area(key)
        if key_norm in servicio_norm or servicio_norm in key_norm:
            area = buscar_area_por_nombre(area_nombre, area_qs)
            if area:
                return area

    # 3. Fallback por palabras sueltas.
    palabras_clave = {
        'REVISORIA': 'Revisoría Fiscal y Auditoría',
        'AUDITORIA': 'Revisoría Fiscal y Auditoría',
        'LEGAL': 'Legal',
        'LEG': 'Legal',
        'IMPUESTOS': 'Impuestos',
        'TRIBUTARIO': 'Impuestos',
        'RENTA': 'Impuestos',
        'RIT': 'Impuestos',
        'IVA': 'Impuestos',
        'CONTABLE': 'Contabilidad',
        'CONTABILIDAD': 'Contabilidad',
        'NOMINA': 'BPO',
        'NÓMINA': 'BPO',
        'BPO': 'BPO',
        'FINANCIERA': 'Financiera',
        'FINANCIERO': 'Financiera',
        'VALORACION': 'Financiera',
        'VALORACIÓN': 'Financiera',
        'ADMINISTRACION': 'Administración',
        'ADMINISTRACIÓN': 'Administración',
    }
    for palabra, area_nombre in palabras_clave.items():
        if normalizar_area(palabra) in servicio_norm:
            area = buscar_area_por_nombre(area_nombre, area_qs)
            if area:
                return area

    return None


def parse_areas_facturacion(data: dict, area_qs):
    """
    Parsea el campo `areas` de una solicitud de facturación SQF y devuelve
    una lista de dicts con: area (objeto), centro, concepto, valor.
    """
    areas_raw = data.get('areas') or data.get('areas_json') or []
    areas_list = parse_json_list(areas_raw)
    resultado = []

    for item in areas_list:
        if not isinstance(item, dict):
            continue

        centro = clean_string(item.get('centro') or item.get('area') or item.get('nombre'), max_length=100)
        concepto = clean_string(item.get('concepto') or item.get('producto'), max_length=255)
        valor = clean_decimal(item.get('valor')) or Decimal('0')

        area = mapear_centro_a_area(centro, area_qs)

        resultado.append({
            'area': area,
            'centro': centro,
            'concepto': concepto,
            'valor': valor,
            'codigo_centro': clean_string(item.get('codigoCentro'), max_length=50),
            'codigo_producto': clean_string(item.get('codigoProducto'), max_length=50),
        })

    return resultado


def tipo_contrato_desde_modality(modality: str) -> str:
    """Deriva tipo_contrato/periodicidad desde la modalidad de facturación SQF."""
    modality = (modality or '').lower()
    if 'proyecto' in modality:
        return 'proyecto', 'unico'
    if 'mensual' in modality:
        return 'mensual', 'mensual'
    return 'otro', 'mensual'


# ── Validación de payload ────────────────────────────────────────────────────

def validar_payload_facturacion(data: dict) -> None:
    """Valida campos mínimos de una solicitud de facturación SQF."""
    sqf_id = clean_string(data.get('id') or data.get('sqf_id'), max_length=MAX_SQFI_D)
    if not sqf_id:
        raise ValidationError('Se requiere el campo id (BIL-XXX / NC-XXX).')

    nit = clean_nit(data.get('nit') or data.get('clientDocument') or data.get('documento'))
    if not nit and not clean_string(data.get('clientName') or data.get('name')):
        raise ValidationError('Se requiere NIT o nombre de cliente.')

    areas = parse_json_list(data.get('areas') or data.get('areas_json'))
    if not areas:
        raise ValidationError('Se requiere al menos un área en la facturación.')
