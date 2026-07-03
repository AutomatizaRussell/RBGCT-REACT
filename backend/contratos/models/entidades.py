from django.db import models


class EntidadEPS(models.Model):
    nombre = models.CharField(max_length=150)
    codigo = models.CharField(max_length=20, blank=True, null=True)
    activa = models.BooleanField(default=True)

    class Meta:
        db_table = '"contratos"."entidad_eps"'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class EntidadAFP(models.Model):
    nombre = models.CharField(max_length=150)
    codigo = models.CharField(max_length=20, blank=True, null=True)
    activa = models.BooleanField(default=True)

    class Meta:
        db_table = '"contratos"."entidad_afp"'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class EntidadARL(models.Model):
    nombre = models.CharField(max_length=150)
    codigo = models.CharField(max_length=20, blank=True, null=True)
    activa = models.BooleanField(default=True)

    class Meta:
        db_table = '"contratos"."entidad_arl"'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class CajaCompensacion(models.Model):
    nombre = models.CharField(max_length=150)
    codigo = models.CharField(max_length=20, blank=True, null=True)
    activa = models.BooleanField(default=True)

    class Meta:
        db_table = '"contratos"."caja_compensacion"'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre
