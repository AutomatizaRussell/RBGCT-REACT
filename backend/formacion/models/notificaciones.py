from django.db import models


class NotificacionCurso(models.Model):
    """Aviso al encargado de cursos cuando un empleado completa un curso."""

    destinatario = models.ForeignKey(
        'empleados.DatosEmpleado', on_delete=models.CASCADE, related_name='notificaciones_cursos'
    )
    empleado = models.ForeignKey(
        'empleados.DatosEmpleado', on_delete=models.CASCADE, related_name='cursos_completados_notif'
    )
    curso  = models.ForeignKey('formacion.Curso', on_delete=models.CASCADE, related_name='notificaciones')
    leida  = models.BooleanField(default=False)
    fecha  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"formacion"."notificacion_curso"'
        ordering = ['-fecha']
        unique_together = [('destinatario', 'empleado', 'curso')]
        indexes = [
            models.Index(fields=['destinatario', 'leida'], name='formacion_notif_dest_leida_idx'),
        ]

    def __str__(self):
        return f"→ {self.destinatario} | {self.empleado} completó {self.curso}"
