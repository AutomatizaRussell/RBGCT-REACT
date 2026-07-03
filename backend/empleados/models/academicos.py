from django.db import models
from rbgct.sharepoint_storage import SharePointN8nStorage
from core.mixins import UppercaseFieldsMixin


class DatosAcademicos(UppercaseFieldsMixin, models.Model):
    """Historial académico/educativo de una persona. (1:N con Persona)"""
    UPPERCASE_FIELDS = ['titulo_obtenido', 'institucion', 'ciudad_institucion']

    NIVEL_CHOICES = [
        ('bachiller', 'Bachiller'),
        ('tecnico', 'Técnico'),
        ('tecnologo', 'Tecnólogo'),
        ('profesional', 'Profesional'),
        ('especializacion', 'Especialización'),
        ('maestria', 'Maestría'),
        ('doctorado', 'Doctorado'),
        ('otro', 'Otro'),
    ]

    persona = models.ForeignKey(
        'empleados.Persona', on_delete=models.CASCADE, related_name='academicos'
    )
    nivel_educativo = models.CharField(max_length=20, choices=NIVEL_CHOICES)
    titulo_obtenido = models.CharField(max_length=255)
    institucion = models.CharField(max_length=255)
    ciudad_institucion = models.CharField(max_length=150, blank=True, null=True)
    fecha_inicio = models.DateField(blank=True, null=True)
    fecha_graduacion = models.DateField(blank=True, null=True)
    en_curso = models.BooleanField(default=False)
    graduado = models.BooleanField(default=True)
    diploma = models.FileField(
        upload_to='datos_academicos/', blank=True, null=True,
        storage=SharePointN8nStorage(), max_length=500
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"empleados"."datos_academicos"'
        ordering = ['-fecha_graduacion', '-fecha_inicio']

    def __str__(self):
        return f"{self.nivel_educativo} — {self.titulo_obtenido} ({self.persona})"
