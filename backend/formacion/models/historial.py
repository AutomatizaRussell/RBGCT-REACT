from django.db import models


class CursoHistorial(models.Model):
    ACCION_CHOICES = [
        ('crear',             'Curso Creado'),
        ('editar',            'Curso Editado'),
        ('eliminar',          'Curso Eliminado'),
        ('agregar_contenido', 'Contenido Agregado'),
        ('eliminar_contenido','Contenido Eliminado'),
    ]

    curso        = models.ForeignKey('formacion.Curso', on_delete=models.SET_NULL, blank=True, null=True, related_name='historial')
    curso_nombre = models.CharField(max_length=200, blank=True, default='')
    accion       = models.CharField(max_length=20, choices=ACCION_CHOICES)
    descripcion  = models.TextField(blank=True, default='')
    usuario_nombre = models.CharField(max_length=200, blank=True, default='')
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"formacion"."curso_historial"'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.accion} — {self.curso_nombre}"
