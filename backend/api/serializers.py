from rest_framework import serializers
from .models import (
    DatosArea, DatosCargo, SuperAdmin,
    Persona, DatosContacto, DatosEmpleado,
    TareasCalendario, SolicitudesPassword, ReglamentoItem,
    Curso, CursoContenido, CursoHistorial, N8nLog, ApiKey,
    EntidadEPS, EntidadAFP, EntidadARL, CajaCompensacion,
    Contrato, AfiliacionSeguridadSocial, ContratoRenovacion,
)


class DatosAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatosArea
        fields = '__all__'


class DatosCargoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatosCargo
        fields = '__all__'


class SuperAdminSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(source='date_joined', read_only=True)

    class Meta:
        model = SuperAdmin
        fields = ['id', 'email', 'nombre', 'apellido', 'role', 'estado', 'created_at', 'last_login', 'fecha_ingreso']


class PersonaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Persona
        fields = [
            'id_persona', 'primer_nombre', 'segundo_nombre',
            'primer_apellido', 'segundo_apellido', 'apodo',
            'tipo_documento', 'numero_documento',
            'fecha_nacimiento', 'sexo', 'tipo_sangre',
        ]


class DatosContactoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatosContacto
        fields = [
            'correo_personal', 'telefono', 'direccion',
            'nombre_contacto_emergencia', 'telefono_emergencia', 'parentesco_emergencia',
        ]


class DatosEmpleadoSerializer(serializers.ModelSerializer):
    """
    Serializer de empleado con respuesta aplanada (backward-compatible).
    Recibe y devuelve campos personales/contacto directamente junto a los laborales.
    """

    # Campos calculados de relaciones laborales
    nombre_area = serializers.CharField(source='area.nombre_area', read_only=True)
    nombre_cargo = serializers.CharField(source='cargo.nombre_cargo', read_only=True)
    area = serializers.PrimaryKeyRelatedField(queryset=DatosArea.objects.all(), required=False, allow_null=True)
    cargo = serializers.PrimaryKeyRelatedField(queryset=DatosCargo.objects.all(), required=False, allow_null=True)

    # Campos aplanados desde Persona (con métodos get_ para asegurar que se traigan)
    primer_nombre = serializers.SerializerMethodField()
    segundo_nombre = serializers.SerializerMethodField()
    primer_apellido = serializers.SerializerMethodField()
    segundo_apellido = serializers.SerializerMethodField()
    apodo = serializers.SerializerMethodField()
    fecha_nacimiento = serializers.SerializerMethodField()
    sexo = serializers.SerializerMethodField()
    tipo_sangre = serializers.SerializerMethodField()
    tipo_documento = serializers.SerializerMethodField()
    numero_documento = serializers.SerializerMethodField()
    nombre_completo = serializers.SerializerMethodField()

    # Campos aplanados de DatosContacto
    correo_personal = serializers.SerializerMethodField()
    telefono = serializers.SerializerMethodField()
    telefono_emergencia = serializers.SerializerMethodField()
    direccion = serializers.SerializerMethodField()
    nombre_contacto_emergencia = serializers.SerializerMethodField()
    parentesco_emergencia = serializers.SerializerMethodField()

    class Meta:
        model = DatosEmpleado
        fields = [
            'id_empleado', 'auth_id',
            # Persona
            'primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido',
            'apodo', 'nombre_completo', 'tipo_documento', 'numero_documento',
            'fecha_nacimiento', 'sexo', 'tipo_sangre',
            # Contacto
            'correo_personal', 'telefono', 'direccion',
            # Emergencia
            'nombre_contacto_emergencia', 'telefono_emergencia', 'parentesco_emergencia',
            # Laboral
            'correo_corporativo', 'area', 'cargo', 'area_id', 'cargo_id',
            'nombre_area', 'nombre_cargo', 'fecha_ingreso', 'fecha_retiro', 'estado',
            # Acceso
            'id_permisos', 'permitir_edicion_datos',
            # Auditoría
            'created_at', 'updated_at',
        ]

    # Métodos get_ para Persona
    def get_primer_nombre(self, obj):
        return obj.persona.primer_nombre if obj.persona else None

    def get_segundo_nombre(self, obj):
        return obj.persona.segundo_nombre if obj.persona else None

    def get_primer_apellido(self, obj):
        return obj.persona.primer_apellido if obj.persona else None

    def get_segundo_apellido(self, obj):
        return obj.persona.segundo_apellido if obj.persona else None

    def get_apodo(self, obj):
        return obj.persona.apodo if obj.persona else None

    def get_fecha_nacimiento(self, obj):
        return obj.persona.fecha_nacimiento if obj.persona else None

    def get_sexo(self, obj):
        return obj.persona.sexo if obj.persona else None

    def get_tipo_sangre(self, obj):
        return obj.persona.tipo_sangre if obj.persona else None

    def get_tipo_documento(self, obj):
        return obj.persona.tipo_documento if obj.persona else None

    def get_numero_documento(self, obj):
        return obj.persona.numero_documento if obj.persona else None

    def get_nombre_completo(self, obj):
        return obj.persona.nombre_completo if obj.persona else None

    # Métodos get_ para DatosContacto
    def get_correo_personal(self, obj):
        c = obj._contacto()
        return c.correo_personal if c else None

    def get_telefono(self, obj):
        c = obj._contacto()
        return c.telefono if c else None

    def get_telefono_emergencia(self, obj):
        c = obj._contacto()
        return c.telefono_emergencia if c else None

    def get_direccion(self, obj):
        c = obj._contacto()
        return c.direccion if c else None

    def get_nombre_contacto_emergencia(self, obj):
        c = obj._contacto()
        return c.nombre_contacto_emergencia if c else None

    def get_parentesco_emergencia(self, obj):
        c = obj._contacto()
        return c.parentesco_emergencia if c else None

    def _split_data(self, validated_data):
        """Separa los datos validados en persona, contacto y empleado."""
        persona_data = validated_data.pop('persona', {})
        contacto_fields = ['correo_personal', 'telefono', 'direccion',
                           'telefono_emergencia', 'nombre_contacto_emergencia', 'parentesco_emergencia']
        contacto_data = {k: validated_data.pop(k) for k in contacto_fields if k in validated_data}
        return persona_data, contacto_data, validated_data

    def create(self, validated_data):
        persona_data, contacto_data, empleado_data = self._split_data(validated_data)
        persona = Persona.objects.create(**persona_data)
        DatosContacto.objects.create(persona=persona, **contacto_data)
        return DatosEmpleado.objects.create(persona=persona, **empleado_data)

    def update(self, instance, validated_data):
        persona_data, contacto_data, empleado_data = self._split_data(validated_data)

        # Actualizar Persona
        if persona_data:
            for attr, value in persona_data.items():
                setattr(instance.persona, attr, value)
            instance.persona.save()

        # Actualizar DatosContacto
        if contacto_data:
            contacto, _ = DatosContacto.objects.get_or_create(persona=instance.persona)
            for attr, value in contacto_data.items():
                setattr(contacto, attr, value)
            contacto.save()

        # Actualizar DatosEmpleado
        for attr, value in empleado_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class TareasCalendarioSerializer(serializers.ModelSerializer):
    primer_nombre = serializers.SerializerMethodField()
    primer_apellido = serializers.SerializerMethodField()
    nombre_area = serializers.CharField(source='area.nombre_area', read_only=True, allow_null=True, required=False)
    area_id = serializers.IntegerField(allow_null=True, required=False)
    empleado_id = serializers.IntegerField(allow_null=True, required=False)

    class Meta:
        model = TareasCalendario
        fields = [
            'id', 'titulo', 'descripcion', 'area_id', 'empleado_id',
            'nombre_area', 'primer_nombre', 'primer_apellido',
            'prioridad', 'fecha_vencimiento', 'fecha_creacion',
            'fecha_actualizacion', 'asignado_a', 'estado', 'creado_por',
        ]

    def get_primer_nombre(self, obj):
        if obj.empleado and obj.empleado.persona:
            return obj.empleado.persona.primer_nombre
        return None

    def get_primer_apellido(self, obj):
        if obj.empleado and obj.empleado.persona:
            return obj.empleado.persona.primer_apellido
        return None


class SolicitudesPasswordSerializer(serializers.ModelSerializer):
    correo_empleado = serializers.CharField(source='empleado.correo_corporativo', read_only=True)

    class Meta:
        model = SolicitudesPassword
        fields = ['id', 'empleado', 'correo_empleado', 'fecha_solicitud', 'leida', 'atendida']


class ReglamentoItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReglamentoItem
        fields = ['id', 'titulo', 'contenido', 'orden', 'created_at', 'updated_at']


class CursoContenidoSerializer(serializers.ModelSerializer):
    archivo_url = serializers.SerializerMethodField()

    class Meta:
        model = CursoContenido
        fields = ['id', 'curso', 'tipo', 'titulo', 'descripcion', 'url', 'contenido', 'archivo', 'archivo_url', 'orden', 'created_at']

    def get_archivo_url(self, obj):
        if obj.archivo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.archivo.url)
            return obj.archivo.url
        return None


class CursoSerializer(serializers.ModelSerializer):
    contenidos = CursoContenidoSerializer(many=True, read_only=True)
    total_contenidos = serializers.SerializerMethodField()
    nombre_area = serializers.CharField(source='area.nombre_area', read_only=True)
    nombre_empleado = serializers.CharField(source='empleado_asignado.persona.nombre_completo', read_only=True)
    area_id = serializers.IntegerField(allow_null=True, required=False)
    empleado_asignado_id = serializers.IntegerField(allow_null=True, required=False)

    class Meta:
        model = Curso
        fields = [
            'id', 'nombre', 'descripcion', 'orden', 'activo', 'visibilidad',
            'area', 'area_id', 'empleado_asignado', 'empleado_asignado_id',
            'nombre_area', 'nombre_empleado', 'contenidos', 'total_contenidos',
            'created_at', 'updated_at',
        ]

    def get_total_contenidos(self, obj):
        return obj.contenidos.count()


class CursoHistorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = CursoHistorial
        fields = ['id', 'curso', 'curso_nombre', 'accion', 'descripcion', 'usuario_nombre', 'created_at']


class N8nLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = N8nLog
        fields = ['id', 'workflow_name', 'status', 'message', 'destinatario', 'tipo_evento', 'response_data', 'created_at']


class ApiKeySerializer(serializers.ModelSerializer):
    key_visible = serializers.SerializerMethodField()
    creado_por_nombre = serializers.CharField(source='creado_por.nombre', read_only=True)

    class Meta:
        model = ApiKey
        fields = [
            'id', 'key', 'key_visible', 'nombre', 'descripcion',
            'creado_por', 'creado_por_nombre', 'created_at', 'last_used_at',
            'uso_count', 'is_active', 'permisos', 'ip_permitidas',
        ]
        read_only_fields = ['id', 'key', 'created_at', 'last_used_at', 'uso_count', 'creado_por']

    def get_key_visible(self, obj):
        return f"{obj.key[:8]}..." if obj.key else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and request.method not in ['POST', 'PUT']:
            data.pop('key', None)
        return data


# ============================================================================
# MÓDULO CONTRATOS
# ============================================================================

class EntidadEPSSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntidadEPS
        fields = ['id', 'nombre', 'codigo', 'activa']


class EntidadAFPSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntidadAFP
        fields = ['id', 'nombre', 'codigo', 'activa']


class EntidadARLSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntidadARL
        fields = ['id', 'nombre', 'codigo', 'activa']


class CajaCompensacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CajaCompensacion
        fields = ['id', 'nombre', 'codigo', 'activa']


class ContratoRenovacionSerializer(serializers.ModelSerializer):
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = ContratoRenovacion
        fields = [
            'id', 'contrato', 'fecha_renovacion', 'nueva_fecha_fin',
            'nuevo_salario', 'pdf_renovacion', 'pdf_url', 'observaciones', 'created_at',
        ]
        read_only_fields = ['created_at']

    def get_pdf_url(self, obj):
        if obj.pdf_renovacion:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.pdf_renovacion.url) if request else obj.pdf_renovacion.url
        return None


class ContratoSerializer(serializers.ModelSerializer):
    pdf_url          = serializers.SerializerMethodField()
    renovaciones     = ContratoRenovacionSerializer(many=True, read_only=True)
    nombre_empleado  = serializers.CharField(source='empleado.persona.nombre_completo', read_only=True)
    nombre_area      = serializers.CharField(source='empleado.area.nombre_area', read_only=True)
    nombre_cargo     = serializers.CharField(source='empleado.cargo.nombre_cargo', read_only=True)
    tipo_contrato_display  = serializers.CharField(source='get_tipo_contrato_display', read_only=True)
    estado_display         = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = Contrato
        fields = [
            'id', 'empleado', 'nombre_empleado', 'nombre_area', 'nombre_cargo',
            'tipo_contrato', 'tipo_contrato_display',
            'fecha_inicio', 'fecha_fin', 'periodo_prueba_dias',
            'salario', 'tipo_salario', 'auxilio_transporte', 'forma_pago',
            'jornada', 'modalidad', 'lugar_trabajo',
            'pdf_contrato', 'pdf_url', 'fecha_firma',
            'estado', 'estado_display', 'motivo_terminacion', 'fecha_terminacion',
            'observaciones', 'renovaciones', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_pdf_url(self, obj):
        if obj.pdf_contrato:
            request = self.context.get('request')
            return request.build_absolute_uri(obj.pdf_contrato.url) if request else obj.pdf_contrato.url
        return None


class AfiliacionSeguridadSocialSerializer(serializers.ModelSerializer):
    nombre_eps  = serializers.CharField(source='eps.nombre', read_only=True)
    nombre_afp  = serializers.CharField(source='afp.nombre', read_only=True)
    nombre_arl  = serializers.CharField(source='arl.nombre', read_only=True)
    nombre_caja = serializers.CharField(source='caja_compensacion.nombre', read_only=True)
    nombre_empleado = serializers.CharField(source='empleado.persona.nombre_completo', read_only=True)

    class Meta:
        model = AfiliacionSeguridadSocial
        fields = [
            'id', 'empleado', 'nombre_empleado',
            'eps', 'nombre_eps', 'numero_afiliacion_eps', 'fecha_afiliacion_eps',
            'afp', 'nombre_afp', 'numero_afiliacion_afp', 'fecha_afiliacion_afp',
            'arl', 'nombre_arl', 'nivel_riesgo_arl', 'numero_poliza_arl', 'fecha_afiliacion_arl',
            'caja_compensacion', 'nombre_caja', 'numero_afiliacion_caja', 'fecha_afiliacion_caja',
            'updated_at',
        ]
        read_only_fields = ['updated_at']
