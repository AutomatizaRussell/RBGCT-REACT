from django.db import models


class AsignacionFormacion(models.Model):
    """Asignación explícita de un curso a un empleado específico."""

    empleado     = models.ForeignKey('empleados.DatosEmpleado', on_delete=models.CASCADE, related_name='asignaciones_formacion')
    curso        = models.ForeignKey('formacion.Curso', on_delete=models.CASCADE, related_name='asignaciones')
    asignado_por = models.ForeignKey(
        'empleados.DatosEmpleado', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='formaciones_asignadas',
    )
    fecha_asignacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"formacion"."asignacion_formacion"'
        unique_together = [('empleado', 'curso')]
        ordering = ['-fecha_asignacion']

    def __str__(self):
        return f"{self.empleado} → {self.curso}"


class ExclusionFormacion(models.Model):
    """Bloqueo explícito: impide que un empleado acceda a un curso aunque la regla de visibilidad lo incluya."""

    empleado     = models.ForeignKey('empleados.DatosEmpleado', on_delete=models.CASCADE, related_name='exclusiones_formacion')
    curso        = models.ForeignKey('formacion.Curso', on_delete=models.CASCADE, related_name='exclusiones')
    excluido_por = models.ForeignKey(
        'empleados.DatosEmpleado', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='formaciones_excluidas_por',
    )
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"formacion"."exclusion_formacion"'
        unique_together = [('empleado', 'curso')]

    def __str__(self):
        return f"{self.empleado} ✗ {self.curso}"
