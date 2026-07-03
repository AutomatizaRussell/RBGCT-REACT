from django.db import models


class N8nLog(models.Model):
    STATUS_CHOICES = [('SUCCESS', 'Exitoso'), ('ERROR', 'Error')]

    workflow_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    message = models.TextField(blank=True, null=True)
    destinatario = models.EmailField(max_length=255, blank=True, null=True)
    tipo_evento = models.CharField(max_length=100, blank=True, null=True)
    response_data = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"sistema"."n8n_log"'
        ordering = ['-created_at']

    def __str__(self):
        return f"N8nLog {self.id} - {self.workflow_name} - {self.status}"
