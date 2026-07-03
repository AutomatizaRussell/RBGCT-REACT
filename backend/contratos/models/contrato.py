from django.db import models
from rbgct.sharepoint_storage import SharePointN8nStorage
from core.mixins import UppercaseFieldsMixin


class Contrato(UppercaseFieldsMixin, models.Model):
    UPPERCASE_FIELDS = ['lugar_trabajo', 'observaciones']

    TIPO_CHOICES = [
        ('termino_fijo',         'Término Fijo'),
        ('termino_indefinido',   'Término Indefinido'),
        ('obra_labor',           'Obra o Labor'),
        ('prestacion_servicios', 'Prestación de Servicios'),
        ('aprendizaje',          'Aprendizaje'),
    ]
    TIPO_SALARIO_CHOICES = [
        ('ordinario', 'Ordinario'), ('integral', 'Integral'),
    ]
    FORMA_PAGO_CHOICES = [
        ('mensual', 'Mensual'), ('quincenal', 'Quincenal'), ('semanal', 'Semanal'),
    ]
    JORNADA_CHOICES = [
        ('completa', 'Jornada Completa'), ('medio_tiempo', 'Medio Tiempo'),
        ('flexible', 'Jornada Flexible'), ('por_horas', 'Por Horas'),
    ]
    MODALIDAD_CHOICES = [
        ('presencial', 'Presencial'), ('remoto', 'Remoto'), ('hibrido', 'Híbrido'),
    ]
    ESTADO_CHOICES = [
        ('ACTIVO', 'Activo'), ('VENCIDO', 'Vencido'), ('TERMINADO', 'Terminado'),
        ('RENOVADO', 'Renovado'), ('SUSPENDIDO', 'Suspendido'),
    ]
    MOTIVO_TERMINACION_CHOICES = [
        ('renuncia',            'Renuncia Voluntaria'),
        ('despido_justa_causa', 'Despido con Justa Causa'),
        ('despido_sin_causa',   'Despido sin Justa Causa'),
        ('mutuo_acuerdo',       'Mutuo Acuerdo'),
        ('vencimiento',         'Vencimiento del Término'),
        ('obra_terminada',      'Terminación de la Obra'),
        ('muerte',              'Fallecimiento del Trabajador'),
        ('incapacidad',         'Incapacidad Permanente'),
        ('liquidacion_empresa', 'Liquidación de la Empresa'),
    ]

    empleado = models.ForeignKey(
        'empleados.DatosEmpleado', on_delete=models.PROTECT, related_name='contratos'
    )
    tipo_contrato             = models.CharField(max_length=25, choices=TIPO_CHOICES)
    fecha_inicio              = models.DateField()
    fecha_fin                 = models.DateField(blank=True, null=True)
    periodo_prueba_dias       = models.IntegerField(default=0)
    salario                   = models.DecimalField(max_digits=14, decimal_places=2)
    tipo_salario              = models.CharField(max_length=10, choices=TIPO_SALARIO_CHOICES, default='ordinario')
    auxilio_transporte        = models.BooleanField(default=True)
    monto_auxilio_transporte  = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    bonificaciones            = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    descripcion_bonificaciones = models.TextField(blank=True, null=True)
    numero_contrato           = models.CharField(max_length=100, blank=True, null=True)
    horas_semanales           = models.IntegerField(blank=True, null=True)
    forma_pago                = models.CharField(max_length=10, choices=FORMA_PAGO_CHOICES, default='mensual')
    jornada                   = models.CharField(max_length=15, choices=JORNADA_CHOICES, default='completa')
    modalidad                 = models.CharField(max_length=10, choices=MODALIDAD_CHOICES, default='presencial')
    lugar_trabajo             = models.CharField(max_length=200, blank=True, null=True)
    pdf_contrato              = models.FileField(
        upload_to='contratos/', blank=True, null=True,
        storage=SharePointN8nStorage(), max_length=500
    )
    fecha_firma               = models.DateField(blank=True, null=True)
    estado                    = models.CharField(max_length=15, choices=ESTADO_CHOICES, default='ACTIVO')
    motivo_terminacion        = models.CharField(max_length=25, choices=MOTIVO_TERMINACION_CHOICES, blank=True, null=True)
    fecha_terminacion         = models.DateField(blank=True, null=True)
    observaciones             = models.TextField(blank=True, null=True)
    created_at                = models.DateTimeField(auto_now_add=True)
    updated_at                = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"contratos"."contrato"'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['empleado', 'estado'], name='contrato_emp_estado_idx'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['empleado'],
                condition=models.Q(estado='ACTIVO'),
                name='unique_contrato_activo_por_empleado',
            )
        ]

    def __str__(self):
        return f"{self.empleado} — {self.tipo_contrato} ({self.estado})"


class ContratoRenovacion(models.Model):
    contrato         = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name='renovaciones')
    fecha_renovacion = models.DateField()
    nueva_fecha_fin  = models.DateField(blank=True, null=True)
    nuevo_salario    = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    pdf_renovacion   = models.FileField(
        upload_to='contratos/renovaciones/', blank=True, null=True,
        storage=SharePointN8nStorage(), max_length=500
    )
    observaciones = models.TextField(blank=True, null=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"contratos"."contrato_renovacion"'
        ordering = ['-fecha_renovacion']

    def __str__(self):
        return f"Renovación {self.contrato} — {self.fecha_renovacion}"
