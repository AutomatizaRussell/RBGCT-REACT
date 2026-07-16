"""
Validación segura de archivos subidos.

El objetivo es no confiar ni en la extensión ni en el content_type enviado por
el cliente. Se usa python-magic para leer los magic bytes reales del archivo y
se compara contra una lista blanca de tipos MIME.
"""
import os
import re
from pathlib import PurePath

from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.utils.http import content_disposition_header


def sanitize_filename(filename: str) -> str:
    """
    Devuelve un nombre de archivo seguro para usar en headers y almacenamiento:
      - Solo el nombre base (sin path traversal).
      - Elimina caracteres de control, comillas, retornos de carro y saltos de línea.
      - Acorta nombres excesivamente largos.
    """
    if not filename:
        return 'archivo'

    # Solo nombre base; descarta cualquier intento de path traversal.
    nombre = PurePath(filename).name

    # Elimina caracteres peligrosos para headers y sistemas de archivos.
    nombre = re.sub(r'[\\"\r\n\x00-\x1f\x7f]', '_', nombre)

    # Evita nombres vacíos o solo puntos.
    nombre = nombre.strip('. ')
    if not nombre:
        return 'archivo'

    # Longitud máxima razonable.
    max_len = 200
    if len(nombre) > max_len:
        base, ext = os.path.splitext(nombre)
        nombre = base[:max_len - len(ext)] + ext

    return nombre


def safe_content_disposition(filename: str, inline: bool = False) -> str:
    """Genera un header Content-Disposition seguro usando helpers de Django."""
    nombre_seguro = sanitize_filename(filename)
    return content_disposition_header(inline, nombre_seguro)


# Mapa de tipos MIME permitidos por categoría de uso.
# Se puede ampliar o restringir según necesidades del negocio.
ALLOWED_MIME_TYPES = {
    # Documentos de oficina
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    # Texto
    'text/plain': ['.txt'],
    'text/csv': ['.csv'],
    'text/html': ['.html', '.htm'],
    'application/json': ['.json'],
    'application/xml': ['.xml'],
    'text/xml': ['.xml'],
    # Imágenes
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/svg+xml': ['.svg'],
}


def validate_uploaded_file(
    archivo,
    max_size_mb: int = 50,
    allowed_mimetypes: dict | None = None,
    allowed_extensions: list | None = None,
) -> None:
    """
    Valida un archivo subido usando magic bytes, extensión y tamaño.

    Levanta ValidationError si el archivo no cumple la política.
    """
    if archivo is None:
        raise ValidationError('No se recibió ningún archivo.')

    if not hasattr(archivo, 'name'):
        raise ValidationError('El objeto recibido no es un archivo válido.')

    allowed_mimetypes = allowed_mimetypes or ALLOWED_MIME_TYPES

    # 1. Validar tamaño.
    max_size_bytes = max_size_mb * 1024 * 1024
    if hasattr(archivo, 'size') and archivo.size > max_size_bytes:
        raise ValidationError(
            f'El archivo excede el tamaño máximo permitido de {max_size_mb} MB.'
        )

    # 2. Validar extensión si se proporciona lista blanca.
    extension = os.path.splitext(archivo.name.lower())[1]
    if allowed_extensions and extension not in allowed_extensions:
        raise ValidationError(
            f'Extensión no permitida: {extension}. Extensiones permitidas: '
            f'{", ".join(allowed_extensions)}'
        )

    # 3. Validar magic bytes con python-magic.
    try:
        import magic
    except ImportError:
        # Fallback: si python-magic no está disponible, solo validamos extensión.
        if allowed_extensions:
            return
        raise ValidationError(
            'No se puede verificar el tipo de archivo. Instala python-magic.'
        )

    # Leer el inicio del archivo para detectar MIME real.
    archivo.seek(0)
    mime = magic.from_buffer(archivo.read(4096), mime=True)
    archivo.seek(0)

    if mime not in allowed_mimetypes:
        raise ValidationError(
            f'Tipo de archivo no permitido ({mime}).'
        )

    # 4. Validar que la extensión coincida con el MIME detectado.
    extensiones_esperadas = allowed_mimetypes.get(mime, [])
    if extensiones_esperadas and extension not in extensiones_esperadas:
        raise ValidationError(
            f'La extensión {extension} no coincide con el tipo de archivo detectado ({mime}).'
        )


# Validadores preconfigurados para reutilizar en modelos y vistas.
validate_pdf_image = lambda f: validate_uploaded_file(
    f,
    max_size_mb=50,
    allowed_mimetypes={
        'application/pdf': ['.pdf'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
        'image/webp': ['.webp'],
    },
    allowed_extensions=['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'],
)

validate_office_document = lambda f: validate_uploaded_file(
    f,
    max_size_mb=50,
    allowed_extensions=[
        '.pdf', '.docx', '.doc', '.xlsx', '.xls',
        '.pptx', '.ppt', '.txt', '.csv', '.html', '.json', '.xml',
    ],
)
