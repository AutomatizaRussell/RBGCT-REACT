from django.db import models


class SugerenciaEmpleado(models.Model):
    """Sugerencias, dudas o problemas enviados por cualquier empleado."""

    empleado    = models.ForeignKey(
        'empleados.DatosEmpleado', on_delete=models.CASCADE,
        db_column='id_empleado', related_name='sugerencias',
    )
    sugerencia  = models.TextField()
    fecha_envio = models.DateTimeField(auto_now_add=True)
    recibida    = models.BooleanField(default=False)
    fecha_recibida = models.DateTimeField(null=True, blank=True)
    confirmacion_vista = models.BooleanField(default=False)

    class Meta:
        db_table = '"tareas"."sugerencia_empleado"'
        ordering = ['-fecha_envio']
        indexes = [
            models.Index(fields=['recibida', 'fecha_envio'], name='tareas_sugerencia_recibida_idx'),
            models.Index(fields=['empleado', 'fecha_envio'],  name='tareas_sugerencia_emp_idx'),
        ]

    def __str__(self):
        return f"Sugerencia {self.id} - {self.empleado}"
