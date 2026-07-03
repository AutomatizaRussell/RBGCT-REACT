from django.db import models


class CursoProgreso(models.Model):
    """Marca que un empleado completó un ítem de contenido de un curso."""

    empleado  = models.ForeignKey('empleados.DatosEmpleado', on_delete=models.CASCADE, related_name='progresos_cursos')
    curso     = models.ForeignKey('formacion.Curso', on_delete=models.CASCADE, related_name='progresos')
    contenido = models.ForeignKey('formacion.CursoContenido', on_delete=models.CASCADE, related_name='progresos')
    fecha_completado = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"formacion"."curso_progreso"'
        unique_together = [('empleado', 'contenido')]
        ordering = ['-fecha_completado']

    def __str__(self):
        return f"{self.empleado} — {self.contenido.titulo}"


class CuestionarioIntento(models.Model):
    """Respuestas de un empleado a un cuestionario de curso."""

    empleado        = models.ForeignKey('empleados.DatosEmpleado', on_delete=models.CASCADE, related_name='intentos_cuestionarios')
    contenido       = models.ForeignKey('formacion.CursoContenido', on_delete=models.CASCADE, related_name='intentos')
    curso           = models.ForeignKey('formacion.Curso', on_delete=models.CASCADE, related_name='intentos_cuestionarios')
    respuestas      = models.JSONField(default=dict)
    puntaje         = models.FloatField()
    aprobado        = models.BooleanField()
    num_intento     = models.PositiveIntegerField(default=1)
    tiempo_segundos = models.PositiveIntegerField(null=True, blank=True)
    fecha_intento   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"formacion"."cuestionario_intento"'
        ordering = ['-fecha_intento']

    def __str__(self):
        return f"{self.empleado} — intento {self.num_intento} — {self.puntaje:.1f}%"
