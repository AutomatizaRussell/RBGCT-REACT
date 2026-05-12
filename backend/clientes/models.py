from django.db import models
from rbgct.appwrite_storage import AppwriteFileStorage


# ── Choices ───────────────────────────────────────────────────────────────────

TIPO_EMPRESA_CHOICES = [
    ('microempresa',      'Microempresa'),
    ('pyme',              'PYME'),
    ('grande',            'Empresa Grande'),
    ('grupo_empresarial', 'Grupo Empresarial'),
]

TAMANO_CHOICES = [
    ('micro',   'Micro (< 10 empleados)'),
    ('pequena', 'Pequeña (10–50 empleados)'),
    ('mediana', 'Mediana (51–200 empleados)'),
    ('grande',  'Grande (> 200 empleados)'),
]

REGIMEN_CHOICES = [
    ('simplificado',       'Régimen Simplificado'),
    ('comun',              'Régimen Común'),
    ('gran_contribuyente', 'Gran Contribuyente'),
    ('no_responsable',     'No Responsable de IVA'),
    ('especial',           'Régimen Especial'),
]

NIVEL_RIESGO_CHOICES = [
    ('bajo',    'Bajo'),
    ('medio',   'Medio'),
    ('alto',    'Alto'),
    ('critico', 'Crítico'),
]

ESTADO_CLIENTE_CHOICES = [
    ('prospecto',  'Prospecto'),
    ('activo',     'Activo'),
    ('inactivo',   'Inactivo'),
    ('suspendido', 'Suspendido'),
    ('retirado',   'Retirado'),
]

CARGO_CONTACTO_CHOICES = [
    ('representante_legal', 'Representante Legal'),
    ('gerente',             'Gerente General'),
    ('contador',            'Contador'),
    ('auxiliar_contable',   'Auxiliar Contable'),
    ('abogado',             'Abogado'),
    ('tesoreria',           'Tesorería'),
    ('rrhh',                'RRHH'),
    ('revisor_fiscal',      'Revisor Fiscal'),
    ('otro',                'Otro'),
]

PERIODICIDAD_CHOICES = [
    ('mensual',    'Mensual'),
    ('bimestral',  'Bimestral'),
    ('trimestral', 'Trimestral'),
    ('semestral',  'Semestral'),
    ('anual',      'Anual'),
    ('unico',      'Servicio Único'),
]

ESTADO_SERVICIO_CHOICES = [
    ('activo',    'Activo'),
    ('pausado',   'Pausado'),
    ('terminado', 'Terminado'),
]

ROL_ASIGNACION_CHOICES = [
    ('responsable_principal', 'Responsable Principal'),
    ('gerente',               'Gerente'),
    ('senior',                'Senior'),
    ('analista',              'Analista/Asistente'),
    ('revisor',               'Revisor'),
    ('apoyo',                 'Apoyo'),
]

TIPO_DOCUMENTO_CHOICES = [
    ('rut',               'RUT'),
    ('camara_comercio',   'Cámara de Comercio'),
    ('estado_financiero', 'Estado Financiero'),
    ('contrato_servicio', 'Contrato de Servicio'),
    ('certificado',       'Certificado'),
    ('declaracion',       'Declaración Tributaria'),
    ('poder',             'Poder / Autorización'),
    ('otro',              'Otro'),
]

TIPO_BITACORA_CHOICES = [
    ('reunion',  'Reunión'),
    ('llamada',  'Llamada'),
    ('visita',   'Visita'),
    ('email',    'Correo'),
    ('entrega',  'Entrega de Documento'),
    ('novedad',  'Novedad'),
    ('otro',     'Otro'),
]


# ── Modelos — PostgreSQL schema: clientes ─────────────────────────────────────

class EmpresaCliente(models.Model):
    razon_social           = models.CharField(max_length=255)
    nit                    = models.CharField(max_length=20, unique=True)
    digito_verificacion    = models.CharField(max_length=1, blank=True, null=True)
    tipo_empresa           = models.CharField(max_length=20, choices=TIPO_EMPRESA_CHOICES, default='pyme')
    tamano_empresa         = models.CharField(max_length=10, choices=TAMANO_CHOICES, blank=True, null=True)
    actividad_economica    = models.CharField(max_length=10, blank=True, null=True)
    descripcion_actividad  = models.CharField(max_length=255, blank=True, null=True)
    regimen_tributario     = models.CharField(max_length=20, choices=REGIMEN_CHOICES, blank=True, null=True)
    ciudad                 = models.CharField(max_length=100, blank=True, null=True)
    departamento           = models.CharField(max_length=100, blank=True, null=True)
    direccion              = models.CharField(max_length=255, blank=True, null=True)
    telefono               = models.CharField(max_length=20, blank=True, null=True)
    email_principal        = models.EmailField(blank=True, null=True)
    website                = models.URLField(blank=True, null=True)
    estado                 = models.CharField(max_length=15, choices=ESTADO_CLIENTE_CHOICES, default='activo')
    nivel_riesgo           = models.CharField(max_length=10, choices=NIVEL_RIESGO_CHOICES, default='bajo')
    fecha_inicio_relacion  = models.DateField(blank=True, null=True)
    camara_comercio_numero = models.CharField(max_length=50, blank=True, null=True)
    observaciones          = models.TextField(blank=True, null=True)
    empresa_matriz         = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='subsidiarias'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"clientes"."cli_empresa"'
        ordering = ['razon_social']

    def __str__(self):
        return f"{self.razon_social} ({self.nit})"


class ContactoCliente(models.Model):
    empresa      = models.ForeignKey(EmpresaCliente, on_delete=models.CASCADE, related_name='contactos')
    nombre       = models.CharField(max_length=150)
    cargo        = models.CharField(max_length=20, choices=CARGO_CONTACTO_CHOICES)
    email        = models.EmailField(blank=True, null=True)
    telefono     = models.CharField(max_length=20, blank=True, null=True)
    es_principal = models.BooleanField(default=False)
    activo       = models.BooleanField(default=True)
    notas        = models.TextField(blank=True, null=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"clientes"."cli_contacto"'
        ordering = ['-es_principal', 'nombre']

    def __str__(self):
        return f"{self.nombre} ({self.get_cargo_display()}) — {self.empresa.razon_social}"


class ServicioContratado(models.Model):
    empresa       = models.ForeignKey(EmpresaCliente, on_delete=models.CASCADE, related_name='servicios')
    area          = models.ForeignKey(
        'api.DatosArea', on_delete=models.PROTECT,
        related_name='servicios_clientes', null=True, blank=True
    )
    descripcion   = models.TextField(blank=True, null=True)
    fecha_inicio  = models.DateField()
    fecha_fin     = models.DateField(blank=True, null=True)
    valor_mensual = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    periodicidad  = models.CharField(max_length=15, choices=PERIODICIDAD_CHOICES, default='mensual')
    estado        = models.CharField(max_length=10, choices=ESTADO_SERVICIO_CHOICES, default='activo')
    notas         = models.TextField(blank=True, null=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"clientes"."cli_servicio"'
        ordering = ['-created_at']

    def __str__(self):
        area = self.area.nombre_area if self.area else 'Sin área'
        return f"{self.empresa.razon_social} — {area}"


class AsignacionEquipo(models.Model):
    empresa      = models.ForeignKey(EmpresaCliente, on_delete=models.CASCADE, related_name='equipo')
    area         = models.ForeignKey(
        'api.DatosArea', on_delete=models.PROTECT,
        null=True, blank=True, related_name='asignaciones_clientes'
    )
    empleado     = models.ForeignKey(
        'api.DatosEmpleado', on_delete=models.PROTECT,
        related_name='clientes_asignados'
    )
    servicio     = models.ForeignKey(
        ServicioContratado, on_delete=models.SET_NULL,
        related_name='equipo', null=True, blank=True
    )
    rol          = models.CharField(max_length=25, choices=ROL_ASIGNACION_CHOICES)
    fecha_inicio = models.DateField()
    fecha_fin    = models.DateField(blank=True, null=True)
    activo       = models.BooleanField(default=True)
    notas        = models.TextField(blank=True, null=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"clientes"."cli_asignacion"'
        ordering = ['-activo', 'rol']
        constraints = [
            models.UniqueConstraint(
                fields=['empresa', 'area', 'empleado'],
                condition=models.Q(activo=True),
                name='unique_asignacion_activa',
            )
        ]

    def __str__(self):
        return f"{self.empleado} → {self.empresa.razon_social} ({self.get_rol_display()})"


class DocumentoCliente(models.Model):
    empresa         = models.ForeignKey(EmpresaCliente, on_delete=models.CASCADE, related_name='documentos')
    tipo            = models.CharField(max_length=20, choices=TIPO_DOCUMENTO_CHOICES)
    nombre          = models.CharField(max_length=200)
    archivo         = models.FileField(upload_to='clientes/documentos/', storage=AppwriteFileStorage())
    fecha_documento = models.DateField(blank=True, null=True)
    vigente         = models.BooleanField(default=True)
    subido_por      = models.ForeignKey(
        'api.DatosEmpleado', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='documentos_clientes_subidos'
    )
    notas      = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"clientes"."cli_documento"'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_tipo_display()} — {self.empresa.razon_social}"


class BitacoraCliente(models.Model):
    empresa     = models.ForeignKey(EmpresaCliente, on_delete=models.CASCADE, related_name='bitacora')
    tipo        = models.CharField(max_length=15, choices=TIPO_BITACORA_CHOICES)
    descripcion = models.TextField()
    empleado    = models.ForeignKey(
        'api.DatosEmpleado', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='bitacoras_registradas'
    )
    fecha      = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"clientes"."cli_bitacora"'
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.get_tipo_display()} — {self.empresa.razon_social} — {self.fecha:%Y-%m-%d}"
