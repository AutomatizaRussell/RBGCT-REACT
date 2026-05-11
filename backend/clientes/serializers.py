from rest_framework import serializers
from .models import (
    EmpresaCliente, ContactoCliente, ServicioContratado,
    AsignacionEquipo, DocumentoCliente, BitacoraCliente,
)


class ContactoClienteSerializer(serializers.ModelSerializer):
    cargo_display = serializers.CharField(source='get_cargo_display', read_only=True)

    class Meta:
        model = ContactoCliente
        fields = '__all__'
        read_only_fields = ['created_at']


class ServicioContratadoSerializer(serializers.ModelSerializer):
    area_nombre = serializers.CharField(source='area.nombre_area', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    periodicidad_display = serializers.CharField(source='get_periodicidad_display', read_only=True)

    class Meta:
        model = ServicioContratado
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class AsignacionEquipoSerializer(serializers.ModelSerializer):
    rol_display     = serializers.CharField(source='get_rol_display', read_only=True)
    area_nombre     = serializers.CharField(source='area.nombre_area', read_only=True)
    empleado_nombre = serializers.SerializerMethodField()
    empleado_cargo  = serializers.SerializerMethodField()

    class Meta:
        model = AsignacionEquipo
        fields = '__all__'
        read_only_fields = ['created_at']

    def get_empleado_nombre(self, obj):
        if obj.empleado and obj.empleado.persona:
            p = obj.empleado.persona
            return f"{p.primer_nombre} {p.primer_apellido}"
        return None

    def get_empleado_cargo(self, obj):
        if obj.empleado and obj.empleado.cargo:
            return obj.empleado.cargo.nombre_cargo
        return None


class DocumentoClienteSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    archivo_url = serializers.SerializerMethodField()

    class Meta:
        model = DocumentoCliente
        fields = '__all__'
        read_only_fields = ['created_at']

    def get_archivo_url(self, obj):
        request = self.context.get('request')
        if obj.archivo and request:
            return request.build_absolute_uri(obj.archivo.url)
        return None


class BitacoraClienteSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)
    empleado_nombre = serializers.SerializerMethodField()

    class Meta:
        model = BitacoraCliente
        fields = '__all__'
        read_only_fields = ['created_at']

    def get_empleado_nombre(self, obj):
        if obj.empleado and obj.empleado.persona:
            p = obj.empleado.persona
            return f"{p.primer_nombre} {p.primer_apellido}"
        return None


class EmpresaClienteSerializer(serializers.ModelSerializer):
    tipo_empresa_display = serializers.CharField(source='get_tipo_empresa_display', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    nivel_riesgo_display = serializers.CharField(source='get_nivel_riesgo_display', read_only=True)
    regimen_tributario_display = serializers.CharField(source='get_regimen_tributario_display', read_only=True)
    empresa_matriz_nombre = serializers.CharField(source='empresa_matriz.razon_social', read_only=True)
    contactos = ContactoClienteSerializer(many=True, read_only=True)
    servicios = ServicioContratadoSerializer(many=True, read_only=True)
    equipo = AsignacionEquipoSerializer(many=True, read_only=True)

    class Meta:
        model = EmpresaCliente
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class EmpresaClienteListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listados (sin nested relations)."""
    tipo_empresa_display  = serializers.CharField(source='get_tipo_empresa_display', read_only=True)
    estado_display        = serializers.CharField(source='get_estado_display', read_only=True)
    nivel_riesgo_display  = serializers.CharField(source='get_nivel_riesgo_display', read_only=True)
    contacto_principal    = serializers.SerializerMethodField()
    areas_count           = serializers.SerializerMethodField()

    class Meta:
        model = EmpresaCliente
        fields = [
            'id', 'razon_social', 'nit', 'tipo_empresa', 'tipo_empresa_display',
            'estado', 'estado_display', 'nivel_riesgo', 'nivel_riesgo_display',
            'ciudad', 'departamento', 'email_principal', 'telefono',
            'fecha_inicio_relacion', 'contacto_principal', 'areas_count', 'created_at',
        ]

    def get_contacto_principal(self, obj):
        contacto = obj.contactos.filter(es_principal=True, activo=True).first()
        if contacto:
            return {'nombre': contacto.nombre, 'cargo': contacto.get_cargo_display(), 'email': contacto.email}
        return None

    def get_areas_count(self, obj):
        """Cantidad de áreas con servicios activos. 0 = alerta si cliente está activo."""
        return obj.servicios.filter(area__isnull=False).values('area').distinct().count()
