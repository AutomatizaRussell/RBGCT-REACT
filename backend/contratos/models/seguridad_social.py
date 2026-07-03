from django.db import models


class AfiliacionSeguridadSocial(models.Model):
    NIVEL_RIESGO_CHOICES = [
        ('I',   'Nivel I — Riesgo Mínimo'),
        ('II',  'Nivel II — Riesgo Bajo'),
        ('III', 'Nivel III — Riesgo Medio'),
        ('IV',  'Nivel IV — Riesgo Alto'),
        ('V',   'Nivel V — Riesgo Máximo'),
    ]

    empleado = models.OneToOneField(
        'empleados.DatosEmpleado', on_delete=models.CASCADE, related_name='seguridad_social'
    )
    # Salud
    eps                   = models.ForeignKey('contratos.EntidadEPS', on_delete=models.PROTECT, null=True, blank=True, related_name='afiliados')
    numero_afiliacion_eps = models.CharField(max_length=50, blank=True, null=True)
    fecha_afiliacion_eps  = models.DateField(blank=True, null=True)
    # Pensión
    afp                   = models.ForeignKey('contratos.EntidadAFP', on_delete=models.PROTECT, null=True, blank=True, related_name='afiliados')
    numero_afiliacion_afp = models.CharField(max_length=50, blank=True, null=True)
    fecha_afiliacion_afp  = models.DateField(blank=True, null=True)
    # ARL
    arl                   = models.ForeignKey('contratos.EntidadARL', on_delete=models.PROTECT, null=True, blank=True, related_name='afiliados')
    nivel_riesgo_arl      = models.CharField(max_length=5, choices=NIVEL_RIESGO_CHOICES, blank=True, null=True)
    numero_poliza_arl     = models.CharField(max_length=50, blank=True, null=True)
    fecha_afiliacion_arl  = models.DateField(blank=True, null=True)
    # Caja de Compensación
    caja_compensacion      = models.ForeignKey('contratos.CajaCompensacion', on_delete=models.PROTECT, null=True, blank=True, related_name='afiliados')
    numero_afiliacion_caja = models.CharField(max_length=50, blank=True, null=True)
    fecha_afiliacion_caja  = models.DateField(blank=True, null=True)
    updated_at             = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"contratos"."afiliacion_seguridad_social"'

    def __str__(self):
        return f"SS — {self.empleado}"
