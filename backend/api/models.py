from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.base_user import BaseUserManager
import uuid


class DatosArea(models.Model):
    id_area = models.AutoField(primary_key=True)
    nombre_area = models.CharField(max_length=100)
    descripcion = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'datos_area'
        managed = True

    def __str__(self):
        return self.nombre_area


class DatosCargo(models.Model):
    id_cargo = models.AutoField(primary_key=True)
    nombre_cargo = models.CharField(max_length=100)
    nivel = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'datos_cargo'
        managed = True

    def __str__(self):
        return self.nombre_cargo


class SuperAdminManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El email es requerido')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', 'superadmin')
        extra_fields.setdefault('estado', 'ACTIVA')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class SuperAdmin(AbstractUser):
    # Reemplaza username por email como campo de autenticación
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None
    email = models.EmailField(max_length=255, unique=True)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    role = models.CharField(max_length=50, default='superadmin')
    estado = models.CharField(max_length=20, default='ACTIVA')
    fecha_ingreso = models.DateField(blank=True, null=True)
    # date_joined y last_login vienen de AbstractUser

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nombre', 'apellido']

    objects = SuperAdminManager()

    class Meta:
        db_table = 'superadmin'

    def __str__(self):
        return f"{self.nombre} {self.apellido}"

    def save(self, *args, **kwargs):
        # Mantener is_active sincronizado con estado
        self.is_active = (self.estado == 'ACTIVA')
        super().save(*args, **kwargs)


# ============================================================================
# JERARQUÍA RRHH
# ============================================================================

class Persona(models.Model):
    """La persona como individuo: identidad y documento."""

    SEXO_CHOICES = [('M', 'Masculino'), ('F', 'Femenino'), ('O', 'Otro')]
    SANGRE_CHOICES = [
        ('A+', 'A+'), ('A-', 'A-'), ('B+', 'B+'), ('B-', 'B-'),
        ('AB+', 'AB+'), ('AB-', 'AB-'), ('O+', 'O+'), ('O-', 'O-'),
    ]
    TIPO_DOC_CHOICES = [
        ('CC', 'Cédula de Ciudadanía'),
        ('CE', 'Cédula de Extranjería'),
        ('PA', 'Pasaporte'),
        ('TI', 'Tarjeta de Identidad'),
    ]

    id_persona = models.AutoField(primary_key=True)
    primer_nombre = models.CharField(max_length=100)
    segundo_nombre = models.CharField(max_length=100, blank=True, null=True)
    primer_apellido = models.CharField(max_length=100)
    segundo_apellido = models.CharField(max_length=100, blank=True, null=True)
    apodo = models.CharField(max_length=50, blank=True, null=True, help_text="Nombre como desea ser llamado/a")
    tipo_documento = models.CharField(max_length=2, choices=TIPO_DOC_CHOICES, default='CC')
    numero_documento = models.CharField(max_length=30, blank=True, null=True, unique=True)
    fecha_nacimiento = models.DateField(blank=True, null=True)
    sexo = models.CharField(max_length=1, choices=SEXO_CHOICES, blank=True, null=True)
    tipo_sangre = models.CharField(max_length=3, choices=SANGRE_CHOICES, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'persona'
        managed = True

    def __str__(self):
        return f"{self.primer_nombre} {self.primer_apellido}"

    @property
    def nombre_completo(self):
        partes = [self.primer_nombre, self.segundo_nombre, self.primer_apellido, self.segundo_apellido]
        return ' '.join(p for p in partes if p)


class DatosContacto(models.Model):
    """Información de contacto y emergencia de una persona. (1:1 con Persona)"""

    persona = models.OneToOneField(Persona, on_delete=models.CASCADE, related_name='contacto')
    correo_personal = models.EmailField(max_length=255, blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    # Contacto de emergencia
    nombre_contacto_emergencia = models.CharField(max_length=150, blank=True, null=True)
    telefono_emergencia = models.CharField(max_length=20, blank=True, null=True)
    parentesco_emergencia = models.CharField(max_length=50, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'datos_contacto'
        managed = True

    def __str__(self):
        return f"Contacto de {self.persona}"


class DatosEmpleado(models.Model):
    """Vínculo laboral entre la Persona y la empresa + credenciales de acceso."""

    ESTADO_CHOICES = [('ACTIVA', 'Activa'), ('INACTIVO', 'Inactivo')]
    PERMISOS_CHOICES = [(1, 'Administrador'), (2, 'Editor'), (3, 'Usuario')]

    id_empleado = models.AutoField(primary_key=True)
    persona = models.OneToOneField(Persona, on_delete=models.CASCADE, related_name='empleado')
    auth_id = models.UUIDField(blank=True, null=True)

    # Vínculo laboral
    correo_corporativo = models.EmailField(max_length=255, unique=True)
    area = models.ForeignKey(DatosArea, on_delete=models.SET_NULL, db_column='area_id', blank=True, null=True)
    cargo = models.ForeignKey(DatosCargo, on_delete=models.SET_NULL, db_column='cargo_id', blank=True, null=True)
    fecha_ingreso = models.DateField(blank=True, null=True)
    fecha_retiro = models.DateField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='ACTIVA')

    # Acceso al sistema
    id_permisos = models.IntegerField(choices=PERMISOS_CHOICES, default=3)
    password_hash = models.CharField(max_length=255, blank=True, null=True)
    primer_login = models.BooleanField(default=True)
    datos_completados = models.BooleanField(default=False)
    permitir_edicion_datos = models.BooleanField(default=False)
    ultima_actividad = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'empleado'
        managed = True

    def __str__(self):
        return f"{self.persona} ({self.correo_corporativo})"

    # ── Properties de compatibilidad → delegan a Persona ──────────────────────
    # Permiten que views.py y serializers existentes sigan funcionando
    # sin cambios mientras la BD está correctamente separada.

    @property
    def primer_nombre(self):
        return self.persona.primer_nombre

    @primer_nombre.setter
    def primer_nombre(self, v):
        self.persona.primer_nombre = v

    @property
    def segundo_nombre(self):
        return self.persona.segundo_nombre

    @segundo_nombre.setter
    def segundo_nombre(self, v):
        self.persona.segundo_nombre = v

    @property
    def primer_apellido(self):
        return self.persona.primer_apellido

    @primer_apellido.setter
    def primer_apellido(self, v):
        self.persona.primer_apellido = v

    @property
    def segundo_apellido(self):
        return self.persona.segundo_apellido

    @segundo_apellido.setter
    def segundo_apellido(self, v):
        self.persona.segundo_apellido = v

    @property
    def apodo(self):
        return self.persona.apodo

    @apodo.setter
    def apodo(self, v):
        self.persona.apodo = v

    @property
    def fecha_nacimiento(self):
        return self.persona.fecha_nacimiento

    @fecha_nacimiento.setter
    def fecha_nacimiento(self, v):
        self.persona.fecha_nacimiento = v

    @property
    def sexo(self):
        return self.persona.sexo

    @sexo.setter
    def sexo(self, v):
        self.persona.sexo = v

    @property
    def tipo_sangre(self):
        return self.persona.tipo_sangre

    @tipo_sangre.setter
    def tipo_sangre(self, v):
        self.persona.tipo_sangre = v

    @property
    def nombre_completo(self):
        return self.persona.nombre_completo

    # ── Properties de compatibilidad → delegan a DatosContacto ───────────────

    def _contacto(self):
        try:
            return self.persona.contacto
        except DatosContacto.DoesNotExist:
            return None

    @property
    def correo_personal(self):
        c = self._contacto()
        return c.correo_personal if c else None

    @correo_personal.setter
    def correo_personal(self, v):
        c = self._contacto()
        if c:
            c.correo_personal = v

    @property
    def telefono(self):
        c = self._contacto()
        return c.telefono if c else None

    @telefono.setter
    def telefono(self, v):
        c = self._contacto()
        if c:
            c.telefono = v

    @property
    def telefono_emergencia(self):
        c = self._contacto()
        return c.telefono_emergencia if c else None

    @telefono_emergencia.setter
    def telefono_emergencia(self, v):
        c = self._contacto()
        if c:
            c.telefono_emergencia = v

    @property
    def direccion(self):
        c = self._contacto()
        return c.direccion if c else None

    @direccion.setter
    def direccion(self, v):
        c = self._contacto()
        if c:
            c.direccion = v

    # ── Auth helpers ──────────────────────────────────────────────────────────

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_active(self):
        return self.estado == 'ACTIVA'


# ============================================================================
# RESTO DEL DOMINIO
# ============================================================================

class TareasCalendario(models.Model):
    PRIORIDAD_CHOICES = [('baja', 'Baja'), ('media', 'Media'), ('alta', 'Alta')]
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'), ('en_proceso', 'En Proceso'),
        ('completada', 'Completada'), ('cancelada', 'Cancelada'),
    ]

    id = models.AutoField(primary_key=True)
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, null=True)
    area = models.ForeignKey(DatosArea, on_delete=models.SET_NULL, db_column='id_area', blank=True, null=True)
    empleado = models.ForeignKey(DatosEmpleado, on_delete=models.SET_NULL, db_column='id_empleado', blank=True, null=True)
    prioridad = models.CharField(max_length=20, choices=PRIORIDAD_CHOICES, default='media')
    fecha_vencimiento = models.DateField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    asignado_a = models.CharField(max_length=255, blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    creado_por = models.UUIDField(blank=True, null=True)

    class Meta:
        db_table = 'tareas_calendario'
        managed = True

    def __str__(self):
        return self.titulo


class SolicitudesPassword(models.Model):
    id = models.AutoField(primary_key=True)
    empleado = models.ForeignKey(DatosEmpleado, on_delete=models.CASCADE, db_column='id_empleado')
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    leida = models.BooleanField(default=False)
    atendida = models.BooleanField(default=False)

    class Meta:
        db_table = 'solicitudes_password'
        managed = True

    def __str__(self):
        return f"Solicitud {self.id} - {self.empleado}"


class Curso(models.Model):
    VISIBILIDAD_CHOICES = [
        ('todos', 'Todos'),
        ('area', 'Área Específica'),
        ('persona', 'Persona Específica'),
    ]

    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, default='')
    orden = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)
    visibilidad = models.CharField(max_length=20, choices=VISIBILIDAD_CHOICES, default='todos')
    area = models.ForeignKey(DatosArea, on_delete=models.SET_NULL, db_column='area_id', blank=True, null=True)
    empleado_asignado = models.ForeignKey(
        DatosEmpleado, on_delete=models.SET_NULL,
        db_column='empleado_asignado_id', blank=True, null=True,
        related_name='cursos_asignados'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'curso'
        managed = True
        ordering = ['orden']

    def __str__(self):
        return self.nombre


class CursoHistorial(models.Model):
    ACCION_CHOICES = [
        ('crear', 'Curso Creado'), ('editar', 'Curso Editado'),
        ('eliminar', 'Curso Eliminado'), ('agregar_contenido', 'Contenido Agregado'),
        ('eliminar_contenido', 'Contenido Eliminado'),
    ]

    id = models.AutoField(primary_key=True)
    curso = models.ForeignKey(Curso, on_delete=models.SET_NULL, blank=True, null=True, related_name='historial')
    curso_nombre = models.CharField(max_length=200, blank=True, default='')
    accion = models.CharField(max_length=20, choices=ACCION_CHOICES)
    descripcion = models.TextField(blank=True, default='')
    usuario_nombre = models.CharField(max_length=200, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'curso_historial'
        managed = True
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.accion} — {self.curso_nombre}"


class CursoContenido(models.Model):
    TIPO_CHOICES = [
        ('youtube', 'Video YouTube'), ('video', 'Video Propio'),
        ('documento', 'Documento'), ('texto', 'Texto/Artículo'),
        ('enlace', 'Enlace Externo'), ('cuestionario', 'Cuestionario'),
    ]

    id = models.AutoField(primary_key=True)
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='contenidos')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, default='')
    url = models.CharField(max_length=500, blank=True, null=True)
    contenido = models.TextField(blank=True, null=True)
    archivo = models.FileField(upload_to='cursos/', blank=True, null=True)
    orden = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'curso_contenido'
        managed = True
        ordering = ['orden']

    def __str__(self):
        return f"{self.curso.nombre} — {self.titulo}"


class ReglamentoItem(models.Model):
    id = models.AutoField(primary_key=True)
    titulo = models.CharField(max_length=200)
    contenido = models.TextField(blank=True, default='')
    orden = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reglamento_item'
        managed = True
        ordering = ['orden']

    def __str__(self):
        return self.titulo


class Alerta(models.Model):
    TIPOS_ALERTA = [
        ('recuperacion_password', 'Recuperación de Contraseña'),
        ('login_fallido', 'Intento de Login Fallido'),
        ('otro', 'Otro'),
    ]
    ESTADOS_ALERTA = [
        ('pendiente', 'Pendiente'), ('atendida', 'Atendida'), ('ignorada', 'Ignorada'),
    ]

    id = models.AutoField(primary_key=True)
    tipo = models.CharField(max_length=50, choices=TIPOS_ALERTA, default='recuperacion_password')
    empleado = models.ForeignKey(DatosEmpleado, on_delete=models.SET_NULL, null=True, blank=True, db_column='id_empleado')
    email_solicitante = models.EmailField(max_length=255)
    nombre_solicitante = models.CharField(max_length=255, blank=True, null=True)
    rol_solicitante = models.CharField(max_length=100, blank=True, null=True)
    estado_alerta = models.CharField(max_length=50, choices=ESTADOS_ALERTA, default='pendiente')
    usuario_existe = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    atendida_por = models.ForeignKey(
        SuperAdmin, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='alertas_atendidas'
    )

    class Meta:
        db_table = 'alertas'
        managed = True
        ordering = ['-fecha_creacion']

    def __str__(self):
        return f"Alerta {self.id} - {self.tipo} - {self.email_solicitante}"


class N8nLog(models.Model):
    STATUS_CHOICES = [('SUCCESS', 'Exitoso'), ('ERROR', 'Error')]

    id = models.AutoField(primary_key=True)
    workflow_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    message = models.TextField(blank=True, null=True)
    destinatario = models.EmailField(max_length=255, blank=True, null=True)
    tipo_evento = models.CharField(max_length=100, blank=True, null=True)
    response_data = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'n8n_log'
        managed = True
        ordering = ['-created_at']

    def __str__(self):
        return f"N8nLog {self.id} - {self.workflow_name} - {self.status}"


# ============================================================================
# MÓDULO CONTRATOS
# ============================================================================

class EntidadEPS(models.Model):
    nombre = models.CharField(max_length=150)
    codigo = models.CharField(max_length=20, blank=True, null=True)
    activa = models.BooleanField(default=True)

    class Meta:
        db_table = 'entidad_eps'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class EntidadAFP(models.Model):
    nombre = models.CharField(max_length=150)
    codigo = models.CharField(max_length=20, blank=True, null=True)
    activa = models.BooleanField(default=True)

    class Meta:
        db_table = 'entidad_afp'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class EntidadARL(models.Model):
    nombre = models.CharField(max_length=150)
    codigo = models.CharField(max_length=20, blank=True, null=True)
    activa = models.BooleanField(default=True)

    class Meta:
        db_table = 'entidad_arl'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class CajaCompensacion(models.Model):
    nombre = models.CharField(max_length=150)
    codigo = models.CharField(max_length=20, blank=True, null=True)
    activa = models.BooleanField(default=True)

    class Meta:
        db_table = 'caja_compensacion'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Contrato(models.Model):
    TIPO_CHOICES = [
        ('termino_fijo',          'Término Fijo'),
        ('termino_indefinido',    'Término Indefinido'),
        ('obra_labor',            'Obra o Labor'),
        ('prestacion_servicios',  'Prestación de Servicios'),
        ('aprendizaje',           'Aprendizaje'),
    ]
    TIPO_SALARIO_CHOICES = [
        ('ordinario', 'Ordinario'),
        ('integral',  'Integral'),
    ]
    FORMA_PAGO_CHOICES = [
        ('mensual',   'Mensual'),
        ('quincenal', 'Quincenal'),
        ('semanal',   'Semanal'),
    ]
    JORNADA_CHOICES = [
        ('completa',    'Jornada Completa'),
        ('medio_tiempo','Medio Tiempo'),
        ('flexible',    'Jornada Flexible'),
        ('por_horas',   'Por Horas'),
    ]
    MODALIDAD_CHOICES = [
        ('presencial', 'Presencial'),
        ('remoto',     'Remoto'),
        ('hibrido',    'Híbrido'),
    ]
    ESTADO_CHOICES = [
        ('ACTIVO',    'Activo'),
        ('VENCIDO',   'Vencido'),
        ('TERMINADO', 'Terminado'),
        ('RENOVADO',  'Renovado'),
        ('SUSPENDIDO','Suspendido'),
    ]
    MOTIVO_TERMINACION_CHOICES = [
        ('renuncia',           'Renuncia Voluntaria'),
        ('despido_justa_causa','Despido con Justa Causa'),
        ('despido_sin_causa',  'Despido sin Justa Causa'),
        ('mutuo_acuerdo',      'Mutuo Acuerdo'),
        ('vencimiento',        'Vencimiento del Término'),
        ('obra_terminada',     'Terminación de la Obra'),
        ('muerte',             'Fallecimiento del Trabajador'),
        ('incapacidad',        'Incapacidad Permanente'),
        ('liquidacion_empresa','Liquidación de la Empresa'),
    ]

    empleado = models.ForeignKey(
        DatosEmpleado, on_delete=models.PROTECT, related_name='contratos'
    )
    tipo_contrato       = models.CharField(max_length=25, choices=TIPO_CHOICES)
    fecha_inicio        = models.DateField()
    fecha_fin           = models.DateField(blank=True, null=True)
    periodo_prueba_dias = models.IntegerField(default=0)
    salario             = models.DecimalField(max_digits=14, decimal_places=2)
    tipo_salario        = models.CharField(max_length=10, choices=TIPO_SALARIO_CHOICES, default='ordinario')
    auxilio_transporte  = models.BooleanField(default=True)
    forma_pago          = models.CharField(max_length=10, choices=FORMA_PAGO_CHOICES, default='mensual')
    jornada             = models.CharField(max_length=15, choices=JORNADA_CHOICES, default='completa')
    modalidad           = models.CharField(max_length=10, choices=MODALIDAD_CHOICES, default='presencial')
    lugar_trabajo       = models.CharField(max_length=200, blank=True, null=True)
    pdf_contrato        = models.FileField(upload_to='contratos/', blank=True, null=True)
    fecha_firma         = models.DateField(blank=True, null=True)
    estado              = models.CharField(max_length=15, choices=ESTADO_CHOICES, default='ACTIVO')
    motivo_terminacion  = models.CharField(max_length=25, choices=MOTIVO_TERMINACION_CHOICES, blank=True, null=True)
    fecha_terminacion   = models.DateField(blank=True, null=True)
    observaciones       = models.TextField(blank=True, null=True)
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'contrato'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['empleado'],
                condition=models.Q(estado='ACTIVO'),
                name='unique_contrato_activo_por_empleado',
            )
        ]

    def __str__(self):
        return f"{self.empleado} — {self.tipo_contrato} ({self.estado})"


class AfiliacionSeguridadSocial(models.Model):
    NIVEL_RIESGO_CHOICES = [
        ('I',   'Nivel I — Riesgo Mínimo'),
        ('II',  'Nivel II — Riesgo Bajo'),
        ('III', 'Nivel III — Riesgo Medio'),
        ('IV',  'Nivel IV — Riesgo Alto'),
        ('V',   'Nivel V — Riesgo Máximo'),
    ]

    empleado               = models.OneToOneField(DatosEmpleado, on_delete=models.CASCADE, related_name='seguridad_social')
    # Salud
    eps                    = models.ForeignKey(EntidadEPS, on_delete=models.PROTECT, null=True, blank=True, related_name='afiliados')
    numero_afiliacion_eps  = models.CharField(max_length=50, blank=True, null=True)
    fecha_afiliacion_eps   = models.DateField(blank=True, null=True)
    # Pensión
    afp                    = models.ForeignKey(EntidadAFP, on_delete=models.PROTECT, null=True, blank=True, related_name='afiliados')
    numero_afiliacion_afp  = models.CharField(max_length=50, blank=True, null=True)
    fecha_afiliacion_afp   = models.DateField(blank=True, null=True)
    # ARL
    arl                    = models.ForeignKey(EntidadARL, on_delete=models.PROTECT, null=True, blank=True, related_name='afiliados')
    nivel_riesgo_arl       = models.CharField(max_length=5, choices=NIVEL_RIESGO_CHOICES, blank=True, null=True)
    numero_poliza_arl      = models.CharField(max_length=50, blank=True, null=True)
    fecha_afiliacion_arl   = models.DateField(blank=True, null=True)
    # Caja de Compensación
    caja_compensacion      = models.ForeignKey(CajaCompensacion, on_delete=models.PROTECT, null=True, blank=True, related_name='afiliados')
    numero_afiliacion_caja = models.CharField(max_length=50, blank=True, null=True)
    fecha_afiliacion_caja  = models.DateField(blank=True, null=True)
    updated_at             = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'afiliacion_seguridad_social'

    def __str__(self):
        return f"SS — {self.empleado}"


class ContratoRenovacion(models.Model):
    contrato        = models.ForeignKey(Contrato, on_delete=models.CASCADE, related_name='renovaciones')
    fecha_renovacion= models.DateField()
    nueva_fecha_fin = models.DateField(blank=True, null=True)
    nuevo_salario   = models.DecimalField(max_digits=14, decimal_places=2, blank=True, null=True)
    pdf_renovacion  = models.FileField(upload_to='contratos/renovaciones/', blank=True, null=True)
    observaciones   = models.TextField(blank=True, null=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'contrato_renovacion'
        ordering = ['-fecha_renovacion']

    def __str__(self):
        return f"Renovación {self.contrato} — {self.fecha_renovacion}"


class ApiKey(models.Model):
    """API Keys para automatizaciones externas."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    key = models.CharField(max_length=64, unique=True, editable=False)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)
    creado_por = models.ForeignKey(SuperAdmin, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(blank=True, null=True)
    uso_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    permisos = models.JSONField(default=dict, blank=True)
    ip_permitidas = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'api_key'
        managed = True
        ordering = ['-created_at']
        verbose_name = 'API Key'
        verbose_name_plural = 'API Keys'

    def __str__(self):
        return f"{self.nombre} ({self.key[:8]}...)"

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = self.generate_key()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_key():
        import secrets
        return secrets.token_urlsafe(32)

    def mark_used(self):
        from django.utils import timezone
        self.last_used_at = timezone.now()
        self.uso_count += 1
        self.save(update_fields=['last_used_at', 'uso_count'])
