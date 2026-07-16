import hashlib
import secrets
import uuid

from django.db import models


class ApiKey(models.Model):
    """API Keys para automatizaciones externas.

    La clave en texto plano NUNCA se almacena. Solo se guarda el hash SHA-256
    y se muestra la clave original una única vez al crearla.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key_hash = models.CharField(max_length=64, unique=True, editable=False, db_index=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    creado_por = models.ForeignKey(
        'sistema.SuperAdmin', on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(blank=True, null=True)
    uso_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    permisos = models.JSONField(default=dict, blank=True)
    ip_permitidas = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = '"sistema"."api_key"'
        ordering = ['-created_at']
        verbose_name = 'API Key'
        verbose_name_plural = 'API Keys'

    def __str__(self):
        return f"{self.nombre} ({self.key_hash[:8]}...)"

    @staticmethod
    def generate_key():
        return secrets.token_urlsafe(32)

    @staticmethod
    def hash_key(key: str) -> str:
        return hashlib.sha256(key.encode('utf-8')).hexdigest()

    def save(self, *args, **kwargs):
        # Si por alguna razón se recibe una clave en texto plano (migraciones,
        # scripts legacy), hashearla antes de guardar.
        if self.key_hash and len(self.key_hash) != 64:
            self.key_hash = self.hash_key(self.key_hash)
        super().save(*args, **kwargs)

    def mark_used(self):
        from django.utils import timezone
        self.last_used_at = timezone.now()
        self.uso_count += 1
        self.save(update_fields=['last_used_at', 'uso_count'])

    def check_key(self, key: str) -> bool:
        """Verifica si una clave en texto plano coincide con el hash almacenado."""
        if not key:
            return False
        return self.key_hash == self.hash_key(key)
