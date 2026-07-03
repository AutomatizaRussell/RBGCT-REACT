from django.db import models


class Alerta(models.Model):
    TIPOS_ALERTA = [
        ('recuperacion_password', 'Recuperación de Contraseña'),
        ('login_fallido', 'Intento de Login Fallido'),
        ('otro', 'Otro'),
    ]
    ESTADOS_ALERTA = [
        ('pendiente', 'Pendiente'),
        ('atendida', 'Atendida'),
        ('ignorada', 'Ignorada'),
    ]

    tipo = models.CharField(max_length=50, choices=TIPOS_ALERTA, default='recuperacion_password')
    empleado = models.ForeignKey(
        'empleados.DatosEmpleado', on_delete=models.SET_NULL,
        null=True, blank=True, db_column='id_empleado'
    )
    email_solicitante = models.EmailField(max_length=255)
    nombre_solicitante = models.CharField(max_length=255, blank=True, null=True)
    rol_solicitante = models.CharField(max_length=100, blank=True, null=True)
    estado_alerta = models.CharField(max_length=50, choices=ESTADOS_ALERTA, default='pendiente')
    usuario_existe = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    atendida_por = models.ForeignKey(
        'sistema.SuperAdmin', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='alertas_atendidas'
    )

    class Meta:
        db_table = '"sistema"."alerta"'
        ordering = ['-fecha_creacion']
        indexes = [
            models.Index(fields=['tipo', 'fecha_creacion'], name='sistema_alerta_tipo_fecha_idx'),
            models.Index(fields=['estado_alerta', 'fecha_creacion'], name='sis_alerta_estado_fecha_idx'),
            models.Index(fields=['email_solicitante'], name='sistema_alerta_email_idx'),
        ]

    def __str__(self):
        return f"Alerta {self.id} - {self.tipo} - {self.email_solicitante}"


class SolicitudesPassword(models.Model):
    empleado = models.ForeignKey(
        'empleados.DatosEmpleado', on_delete=models.CASCADE, db_column='id_empleado'
    )
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    leida = models.BooleanField(default=False)
    atendida = models.BooleanField(default=False)

    class Meta:
        db_table = '"sistema"."solicitudes_password"'

    def __str__(self):
        return f"Solicitud {self.id} - {self.empleado}"
