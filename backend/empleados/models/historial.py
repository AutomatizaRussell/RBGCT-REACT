from django.db import models


class MovimientoLaboral(models.Model):
    TIPO_CHOICES = [
        ('INGRESO',          'Ingreso'),
        ('CAMBIO_CARGO',     'Cambio de Cargo'),
        ('TRASLADO',         'Traslado de Área'),
        ('AJUSTE_SALARIAL',  'Ajuste Salarial'),
        ('CAMBIO_CONTRATO',  'Cambio de Tipo de Contrato'),
        ('CAMBIO_MODALIDAD', 'Cambio de Modalidad'),
        ('RETIRO',           'Retiro'),
        ('REINTEGRO',        'Reintegro'),
        ('NUEVO_CONTRATO',   'Nuevo Contrato'),
        ('RENOVACION',       'Renovación de Contrato'),
        ('ASCENSO',          'Ascenso'),
        ('DEGRADACION',      'Degradación'),
    ]

    empleado = models.ForeignKey(
        'empleados.DatosEmpleado', on_delete=models.CASCADE, related_name='movimientos'
    )
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    campo = models.CharField(max_length=50)
    valor_anterior = models.CharField(max_length=500, blank=True, null=True)
    valor_nuevo = models.CharField(max_length=500, blank=True, null=True)
    fecha_movimiento = models.DateField()
    observaciones = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"empleados"."movimiento_laboral"'
        ordering = ['-fecha_movimiento', '-created_at']

    def __str__(self):
        return f"{self.empleado} — {self.tipo} ({self.fecha_movimiento})"
