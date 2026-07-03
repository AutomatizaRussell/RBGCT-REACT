from django.db import models
from core.mixins import UppercaseFieldsMixin
from core.constants import (
    SEXO_CHOICES, SANGRE_CHOICES, TIPO_DOC_CHOICES,
    ESTADO_CIVIL_CHOICES, TIPO_VIVIENDA_CHOICES, TIPO_VEHICULO_CHOICES,
)


class Persona(UppercaseFieldsMixin, models.Model):
    """La persona como individuo: identidad y documento."""
    UPPERCASE_FIELDS = [
        'primer_nombre', 'segundo_nombre', 'primer_apellido',
        'segundo_apellido', 'apodo',
    ]

    id_persona = models.AutoField(primary_key=True)
    primer_nombre = models.CharField(max_length=100)
    segundo_nombre = models.CharField(max_length=100, blank=True, null=True)
    primer_apellido = models.CharField(max_length=100)
    segundo_apellido = models.CharField(max_length=100, blank=True, null=True)
    apodo = models.CharField(max_length=50, blank=True, null=True, help_text="Nombre como desea ser llamado/a")
    tipo_documento = models.CharField(max_length=2, choices=TIPO_DOC_CHOICES, default='CC')
    numero_documento = models.CharField(max_length=30, blank=True, null=True, unique=True)
    lugar_expedicion = models.CharField(max_length=150, blank=True, null=True)
    fecha_expedicion = models.DateField(blank=True, null=True)
    fecha_nacimiento = models.DateField(blank=True, null=True)
    ciudad_nacimiento = models.CharField(max_length=150, blank=True, null=True)
    departamento_nacimiento = models.CharField(max_length=150, blank=True, null=True)
    pais_nacimiento = models.CharField(max_length=100, blank=True, null=True, default='Colombia')
    nacionalidad = models.CharField(max_length=100, blank=True, null=True, default='Colombiana')
    sexo = models.CharField(max_length=1, choices=SEXO_CHOICES, blank=True, null=True)
    tipo_sangre = models.CharField(max_length=3, choices=SANGRE_CHOICES, blank=True, null=True)
    estado_civil = models.CharField(max_length=2, choices=ESTADO_CIVIL_CHOICES, blank=True, null=True)
    estrato_socioeconomico = models.PositiveSmallIntegerField(blank=True, null=True)
    tipo_vivienda = models.CharField(max_length=10, choices=TIPO_VIVIENDA_CHOICES, blank=True, null=True)
    tiene_discapacidad = models.BooleanField(default=False)
    descripcion_discapacidad = models.TextField(blank=True, null=True)
    tiene_hijos = models.BooleanField(default=False)
    numero_hijos = models.PositiveSmallIntegerField(blank=True, null=True)
    tiene_vehiculo = models.BooleanField(default=False)
    tipo_vehiculo = models.CharField(max_length=10, choices=TIPO_VEHICULO_CHOICES, blank=True, null=True)
    placa_vehiculo = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"empleados"."persona"'

    def __str__(self):
        return f"{self.primer_nombre} {self.primer_apellido}"

    @property
    def nombre_completo(self):
        partes = [self.primer_nombre, self.segundo_nombre, self.primer_apellido, self.segundo_apellido]
        return ' '.join(p for p in partes if p)


class DatosContacto(UppercaseFieldsMixin, models.Model):
    """Información de contacto y emergencia. (1:1 con Persona)"""
    UPPERCASE_FIELDS = ['nombre_contacto_emergencia', 'parentesco_emergencia', 'direccion']

    persona = models.OneToOneField(Persona, on_delete=models.CASCADE, related_name='contacto')
    correo_personal = models.EmailField(max_length=255, blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    nombre_contacto_emergencia = models.CharField(max_length=150, blank=True, null=True)
    telefono_emergencia = models.CharField(max_length=20, blank=True, null=True)
    parentesco_emergencia = models.CharField(max_length=50, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"empleados"."datos_contacto"'

    def __str__(self):
        return f"Contacto de {self.persona}"
