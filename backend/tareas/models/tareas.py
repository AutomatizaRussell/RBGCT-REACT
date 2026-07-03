from django.db import models
from core.mixins import UppercaseFieldsMixin


class TareasCalendario(UppercaseFieldsMixin, models.Model):
    UPPERCASE_FIELDS = ['titulo', 'descripcion']
    PRIORIDAD_CHOICES = [('baja', 'Baja'), ('media', 'Media'), ('alta', 'Alta')]
    ESTADO_CHOICES = [
        ('pendiente',  'Pendiente'),
        ('en_proceso', 'En Proceso'),
        ('completada', 'Completada'),
        ('cancelada',  'Cancelada'),
    ]

    titulo           = models.CharField(max_length=255)
    descripcion      = models.TextField(blank=True, null=True)
    area             = models.ForeignKey(
        'empleados.DatosArea', on_delete=models.SET_NULL,
        db_column='id_area', blank=True, null=True,
    )
    empleado         = models.ForeignKey(
        'empleados.DatosEmpleado', on_delete=models.SET_NULL,
        db_column='id_empleado', blank=True, null=True,
    )
    prioridad        = models.CharField(max_length=20, choices=PRIORIDAD_CHOICES, default='media')
    fecha_vencimiento = models.DateField(blank=True, null=True)
    fecha_creacion   = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    estado           = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    creado_por       = models.ForeignKey(
        'empleados.DatosEmpleado', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='tareas_creadas',
    )

    class Meta:
        db_table = '"tareas"."tarea"'

    def __str__(self):
        return self.titulo
