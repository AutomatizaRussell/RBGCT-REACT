"""
Backend de almacenamiento personalizado para Django que usa Appwrite Storage.
Reemplaza el almacenamiento local (media/) de forma transparente:
los modelos con FileField no necesitan ningún cambio.
"""
import os
import uuid
from io import BytesIO

from django.conf import settings
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible

from appwrite.client import Client
from appwrite.services.storage import Storage as AppwriteStorage
from appwrite.input_file import InputFile
from appwrite.exception import AppwriteException


def _get_client():
    client = Client()
    client.set_endpoint(settings.APPWRITE_ENDPOINT)
    client.set_project(settings.APPWRITE_PROJECT_ID)
    client.set_key(settings.APPWRITE_API_KEY)
    return client


@deconstructible
class AppwriteFileStorage(Storage):
    """
    Django Storage backend que sube archivos a Appwrite Storage.
    Compatible con todos los FileField/ImageField existentes.
    """

    def __init__(self):
        self.bucket_id = settings.APPWRITE_BUCKET_ID

    # ── Operaciones obligatorias ───────────────────────────────────────────────

    def _save(self, name, content):
        client = _get_client()
        storage = AppwriteStorage(client)

        # Appwrite requiere un ID único (máx 36 chars, solo alfanumérico y guión)
        file_id = str(uuid.uuid4()).replace('-', '')[:36]

        # Leer contenido
        data = content.read()
        mime = getattr(content, 'content_type', 'application/octet-stream')

        input_file = InputFile.from_bytes(data, filename=os.path.basename(name), mime_type=mime)

        storage.create_file(
            bucket_id=self.bucket_id,
            file_id=file_id,
            file=input_file,
        )

        # Guardamos "bucket_id/file_id/nombre_original" como path
        return f"{self.bucket_id}/{file_id}/{os.path.basename(name)}"

    def _open(self, name, mode='rb'):
        client = _get_client()
        storage = AppwriteStorage(client)
        file_id = self._parse_file_id(name)
        data = storage.get_file_download(bucket_id=self.bucket_id, file_id=file_id)
        return BytesIO(data)

    def delete(self, name):
        try:
            client = _get_client()
            storage = AppwriteStorage(client)
            file_id = self._parse_file_id(name)
            storage.delete_file(bucket_id=self.bucket_id, file_id=file_id)
        except AppwriteException:
            pass

    def exists(self, name):
        try:
            client = _get_client()
            storage = AppwriteStorage(client)
            file_id = self._parse_file_id(name)
            storage.get_file(bucket_id=self.bucket_id, file_id=file_id)
            return True
        except AppwriteException:
            return False

    def url(self, name):
        """Devuelve la URL pública de descarga del archivo."""
        file_id = self._parse_file_id(name)
        endpoint = settings.APPWRITE_ENDPOINT.rstrip('/')
        project  = settings.APPWRITE_PROJECT_ID
        bucket   = self.bucket_id
        return f"{endpoint}/storage/buckets/{bucket}/files/{file_id}/view?project={project}"

    def size(self, name):
        try:
            client = _get_client()
            storage = AppwriteStorage(client)
            file_id = self._parse_file_id(name)
            info = storage.get_file(bucket_id=self.bucket_id, file_id=file_id)
            # Appwrite SDK v18 devuelve objetos Pydantic (atributos, no dict)
            return getattr(info, 'size_original', 0) or getattr(info, 'sizeOriginal', 0) or 0
        except AppwriteException:
            return 0

    # ── Helper ─────────────────────────────────────────────────────────────────

    def _parse_file_id(self, name):
        """
        Extrae el file_id del path guardado.
        Formato: "bucket_id/file_id/nombre.ext"  → devuelve file_id
        Fallback: si el name es directamente el file_id (archivos legacy).
        """
        parts = name.split('/')
        if len(parts) >= 2:
            return parts[1] if len(parts) == 3 else parts[-1]
        return name
