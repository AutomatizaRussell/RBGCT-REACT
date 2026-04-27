from django.db import models
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


class SuperAdmin(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(max_length=255, unique=True)
    password_hash = models.CharField(max_length=255)
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    role = models.CharField(max_length=50, default='superadmin')
    estado = models.CharField(max_length=20, default='ACTIVA')
    created_at = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'superadmin'
        managed = True

    def __str__(self):
        return f"{self.nombre} {self.apellido}"

    # Atributos requeridos por Django REST Framework para autenticación
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_active(self):
        return self.estado == 'ACTIVA'

    @property
    def is_staff(self):
        return True

    @property
    def is_superuser(self):
        return self.role == 'superadmin'


class DatosEmpleado(models.Model):
    ESTADO_CHOICES = [
        ('ACTIVA', 'Activa'),
        ('INACTIVO', 'Inactivo'),
    ]
    
    PERMISOS_CHOICES = [
        (1, 'Administrador'),
        (2, 'Editor'),
        (3, 'Usuario'),
    ]
    
    id_empleado = models.AutoField(primary_key=True)
    auth_id = models.UUIDField(blank=True, null=True)
    primer_nombre = models.CharField(max_length=100)
    segundo_nombre = models.CharField(max_length=100, blank=True, null=True)
    primer_apellido = models.CharField(max_length=100)
    segundo_apellido = models.CharField(max_length=100, blank=True, null=True)
    correo_corporativo = models.EmailField(max_length=255, unique=True)
    correo_personal = models.EmailField(max_length=255, blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    telefono_emergencia = models.CharField(max_length=20, blank=True, null=True)
    area = models.ForeignKey(DatosArea, on_delete=models.SET_NULL, db_column='area_id', blank=True, null=True)
    cargo = models.ForeignKey(DatosCargo, on_delete=models.SET_NULL, db_column='cargo_id', blank=True, null=True)
    id_permisos = models.IntegerField(choices=PERMISOS_CHOICES, default=3)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='ACTIVA')
    fecha_nacimiento = models.DateField(blank=True, null=True)
    fecha_ingreso = models.DateField(blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    # Información adicional
    SEXO_CHOICES = [
        ('M', 'Masculino'),
        ('F', 'Femenino'),
        ('O', 'Otro'),
    ]
    SANGRE_CHOICES = [
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
    ]
    sexo = models.CharField(max_length=1, choices=SEXO_CHOICES, blank=True, null=True)
    tipo_sangre = models.CharField(max_length=3, choices=SANGRE_CHOICES, blank=True, null=True)
    apodo = models.CharField(max_length=50, blank=True, null=True, help_text="Nombre como desea ser llamado/a")
    password_hash = models.CharField(max_length=255, blank=True, null=True)
    # Control de primer login y edición de datos
    primer_login = models.BooleanField(default=True)
    datos_completados = models.BooleanField(default=False)
    permitir_edicion_datos = models.BooleanField(default=False)
    ultima_actividad = models.DateTimeField(blank=True, null=True, help_text="Última vez que el usuario estuvo activo")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'datos_empleado'
        managed = True

    def __str__(self):
        return f"{self.primer_nombre} {self.primer_apellido}"

    # Atributos requeridos por Django REST Framework para autenticación
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_active(self):
        return self.estado == 'ACTIVO'
    
    @property
    def nombre_completo(self):
        return f"{self.primer_nombre} {self.segundo_nombre or ''} {self.primer_apellido} {self.segundo_apellido or ''}".strip()


class TareasCalendario(models.Model):
    PRIORIDAD_CHOICES = [
        ('baja', 'Baja'),
        ('media', 'Media'),
        ('alta', 'Alta'),
    ]
    
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('en_proceso', 'En Proceso'),
        ('completada', 'Completada'),
        ('cancelada', 'Cancelada'),
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
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, default='')
    orden = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'curso'
        managed = True
        ordering = ['orden']

    def __str__(self):
        return self.nombre


class CursoContenido(models.Model):
    TIPO_CHOICES = [
        ('youtube', 'Video YouTube'),
        ('video', 'Video Propio'),
        ('documento', 'Documento'),
        ('texto', 'Texto/Artículo'),
        ('enlace', 'Enlace Externo'),
        ('cuestionario', 'Cuestionario'),
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
        ('pendiente', 'Pendiente'),
        ('atendida', 'Atendida'),
        ('ignorada', 'Ignorada'),
    ]
    
    id = models.AutoField(primary_key=True)
    tipo = models.CharField(max_length=50, choices=TIPOS_ALERTA, default='recuperacion_password')
    
    # Relación con empleado (puede ser null si no existe)
    empleado = models.ForeignKey(
        DatosEmpleado, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        db_column='id_empleado'
    )
    
    # Información del solicitante
    email_solicitante = models.EmailField(max_length=255)
    nombre_solicitante = models.CharField(max_length=255, blank=True, null=True)
    rol_solicitante = models.CharField(max_length=100, blank=True, null=True)
    
    # Estado de la alerta
    estado_alerta = models.CharField(max_length=50, choices=ESTADOS_ALERTA, default='pendiente')
    usuario_existe = models.BooleanField(default=False)
    
    # Timestamps
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    # Quién atendió la alerta
    atendida_por = models.ForeignKey(
        SuperAdmin,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='alertas_atendidas'
    )
    
    class Meta:
        db_table = 'alertas'
        managed = True
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"Alerta {self.id} - {self.tipo} - {self.email_solicitante}"
