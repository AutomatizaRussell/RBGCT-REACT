from django.db import models
from core.constants import NIVEL_CARGO_CHOICES


class PlanOnboarding(models.Model):
    """Plantilla de formación inicial: agrupa cursos en orden."""

    nombre      = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, default='')
    area        = models.ForeignKey(
        'empleados.DatosArea', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='planes_onboarding',
    )
    nivel_cargo = models.IntegerField(choices=NIVEL_CARGO_CHOICES, blank=True, null=True)
    activo      = models.BooleanField(default=True)
    creado_por  = models.ForeignKey(
        'empleados.DatosEmpleado', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='planes_onboarding_creados',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"formacion"."plan_onboarding"'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class PasoOnboarding(models.Model):
    """Curso incluido en un plan de onboarding, con orden y días límite opcionales."""

    plan       = models.ForeignKey(PlanOnboarding, on_delete=models.CASCADE, related_name='pasos')
    curso      = models.ForeignKey('formacion.Curso', on_delete=models.CASCADE, related_name='pasos_onboarding')
    orden      = models.IntegerField(default=0)
    dias_limite = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = '"formacion"."paso_onboarding"'
        ordering = ['orden']
        unique_together = [('plan', 'curso')]

    def __str__(self):
        return f"{self.plan.nombre} → {self.curso.nombre}"


class AsignacionOnboarding(models.Model):
    """Asignación de un plan de onboarding a un empleado específico."""

    empleado     = models.ForeignKey('empleados.DatosEmpleado', on_delete=models.CASCADE, related_name='asignaciones_onboarding')
    plan         = models.ForeignKey(PlanOnboarding, on_delete=models.CASCADE, related_name='asignaciones')
    asignado_por = models.ForeignKey(
        'empleados.DatosEmpleado', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='onboardings_asignados',
    )
    fecha_asignacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"formacion"."asignacion_onboarding"'
        unique_together = [('empleado', 'plan')]
        ordering = ['-fecha_asignacion']

    def __str__(self):
        return f"{self.empleado} → {self.plan}"
