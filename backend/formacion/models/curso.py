from django.db import models
from rbgct.sharepoint_storage import SharePointN8nStorage
from core.constants import NIVEL_CARGO_CHOICES


class Curso(models.Model):
    TIPO_CHOICES = [
        ('curso', 'Curso'),
        ('capacitacion', 'Capacitación'),
    ]
    VISIBILIDAD_CHOICES = [
        ('todos',   'Todos'),
        ('area',    'Área Específica'),
        ('persona', 'Persona Específica'),
        ('cargo',   'Cargo Específico'),
    ]

    tipo        = models.CharField(max_length=20, choices=TIPO_CHOICES, default='curso')
    nombre      = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, default='')
    orden       = models.IntegerField(default=0)
    activo      = models.BooleanField(default=True)
    visibilidad = models.CharField(max_length=20, choices=VISIBILIDAD_CHOICES, default='todos')
    areas       = models.ManyToManyField(
        'empleados.DatosArea', blank=True,
        related_name='cursos_asignados',
        db_table='"formacion"."curso_area"',
    )
    nivel_cargo = models.IntegerField(choices=NIVEL_CARGO_CHOICES, blank=True, null=True)
    empleado_asignado = models.ForeignKey(
        'empleados.DatosEmpleado', on_delete=models.SET_NULL,
        db_column='empleado_asignado_id', blank=True, null=True,
        related_name='cursos_asignados',
    )
    creado_por = models.ForeignKey(
        'empleados.DatosEmpleado', on_delete=models.SET_NULL,
        db_column='creado_por_id', blank=True, null=True,
        related_name='cursos_creados',
    )
    fecha_inicio = models.DateField(blank=True, null=True)
    fecha_fin    = models.DateField(blank=True, null=True)
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"formacion"."curso"'
        ordering = ['orden']

    def __str__(self):
        return self.nombre


class CursoContenido(models.Model):
    TIPO_CHOICES = [
        ('youtube',      'Video YouTube'),
        ('video',        'Video Propio'),
        ('documento',    'Documento'),
        ('texto',        'Texto/Artículo'),
        ('enlace',       'Enlace Externo'),
        ('cuestionario', 'Cuestionario'),
    ]

    curso      = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='contenidos')
    tipo       = models.CharField(max_length=20, choices=TIPO_CHOICES)
    titulo     = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, default='')
    url        = models.CharField(max_length=500, blank=True, null=True)
    contenido  = models.TextField(blank=True, null=True)
    archivo    = models.FileField(
        upload_to='cursos/', blank=True, null=True,
        storage=SharePointN8nStorage(), max_length=500,
    )
    orden        = models.IntegerField(default=0)
    max_intentos = models.PositiveIntegerField(default=0)  # 0 = sin límite (solo aplica a cuestionarios)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"formacion"."curso_contenido"'
        ordering = ['orden']

    def __str__(self):
        return f"{self.curso.nombre} — {self.titulo}"
