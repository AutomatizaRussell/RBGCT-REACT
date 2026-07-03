from django.db import models


class DatosEmpleado(models.Model):
    """Vínculo laboral entre la Persona y la empresa + credenciales de acceso."""

    ESTADO_CHOICES = [('ACTIVA', 'Activa'), ('INACTIVO', 'Inactivo')]
    PERMISOS_CHOICES = [(1, 'Administrador'), (2, 'Editor'), (3, 'Usuario')]

    id_empleado = models.AutoField(primary_key=True)
    persona = models.OneToOneField(
        'empleados.Persona', on_delete=models.CASCADE, related_name='empleado'
    )
    auth_id = models.UUIDField(blank=True, null=True)

    # Vínculo laboral
    correo_corporativo = models.EmailField(max_length=255, unique=True)
    area = models.ForeignKey(
        'empleados.DatosArea', on_delete=models.SET_NULL,
        db_column='area_id', blank=True, null=True
    )
    cargo = models.ForeignKey(
        'empleados.DatosCargo', on_delete=models.SET_NULL,
        db_column='cargo_id', blank=True, null=True
    )
    fecha_ingreso = models.DateField(blank=True, null=True)
    fecha_retiro = models.DateField(blank=True, null=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='ACTIVA')

    # Acceso al sistema
    id_permisos = models.IntegerField(choices=PERMISOS_CHOICES, default=3)
    password_hash = models.CharField(max_length=255, blank=True, null=True)
    primer_login = models.BooleanField(default=True)
    datos_completados = models.BooleanField(default=False)
    datos_persona_completados = models.BooleanField(default=False)
    datos_academicos_completados = models.BooleanField(default=False)
    permitir_edicion_datos = models.BooleanField(default=False)

    # Permisos por sección del Formulario SQF
    acceso_sqf_clientes = models.BooleanField(default=False)
    acceso_sqf_contratos = models.BooleanField(default=False)
    acceso_sqf_facturacion = models.BooleanField(default=False)
    acceso_sqf_auditoria = models.BooleanField(default=False)

    # Permiso especial
    es_encargado_cursos = models.BooleanField(default=False)

    ultima_actividad = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"empleados"."empleado"'
        indexes = [
            models.Index(fields=['estado', 'ultima_actividad'], name='emp_estado_act_idx'),
            models.Index(fields=['ultima_actividad'], name='emp_ult_act_idx'),
            models.Index(fields=['estado'], name='emp_estado_idx'),
        ]

    def __str__(self):
        return f"{self.persona} ({self.correo_corporativo})"

    @property
    def acceso_formularios_sqf(self):
        return bool(
            self.acceso_sqf_clientes or self.acceso_sqf_contratos
            or self.acceso_sqf_facturacion or self.acceso_sqf_auditoria
        )

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

    # ── Delegates a Persona ───────────────────────────────────────────────────

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

    # ── Delegates a DatosContacto (con caché) ─────────────────────────────────

    def _contacto(self):
        if not hasattr(self, '_contacto_cache'):
            try:
                self._contacto_cache = self.persona.contacto
            except Exception:
                self._contacto_cache = None
        return self._contacto_cache

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
