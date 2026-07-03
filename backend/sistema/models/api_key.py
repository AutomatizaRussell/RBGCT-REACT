import uuid
from django.db import models


class ApiKey(models.Model):
    """API Keys para automatizaciones externas."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=64, unique=True, editable=False)
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
        return f"{self.nombre} ({self.key[:8]}...)"

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = self.generate_key()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_key():
        import secrets
        return secrets.token_urlsafe(32)

    def mark_used(self):
        from django.utils import timezone
        self.last_used_at = timezone.now()
        self.uso_count += 1
        self.save(update_fields=['last_used_at', 'uso_count'])
