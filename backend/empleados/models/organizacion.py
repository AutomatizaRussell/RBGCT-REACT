from django.db import models
from core.mixins import UppercaseFieldsMixin


class DatosArea(UppercaseFieldsMixin, models.Model):
    UPPERCASE_FIELDS = ['nombre_area', 'descripcion']

    id_area = models.AutoField(primary_key=True)
    nombre_area = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"empleados"."datos_area"'

    def __str__(self):
        return self.nombre_area


class DatosCargo(UppercaseFieldsMixin, models.Model):
    UPPERCASE_FIELDS = ['nombre_cargo', 'nivel']

    id_cargo = models.AutoField(primary_key=True)
    nombre_cargo = models.CharField(max_length=100)
    nivel = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"empleados"."datos_cargo"'

    def __str__(self):
        return self.nombre_cargo
