from rest_framework import serializers
from .models import (
    EmpresaCliente, ContactoCliente, ServicioContratado,
    AsignacionEquipo, BitacoraCliente, SolicitudFacturacion,
    Equipo, MiembroEquipo,
)


class ContactoClienteSerializer(serializers.ModelSerializer):
    cargo_display = serializers.CharField(source='get_cargo_display', read_only=True)

    class Meta:
        model = ContactoCliente
        fields = '__all__'
        read_only_fields = ['created_at']


class ServicioContratadoSerializer(serializers.ModelSerializer):
    area_nombre          = serializers.CharField(source='area.nombre_area', read_only=True)
    estado_display       = serializers.CharField(source='get_estado_display', read_only=True)
    periodicidad_display = serializers.CharField(source='get_periodicidad_display', read_only=True)
    sqf_status_display   = serializers.CharField(source='get_sqf_status_display', read_only=True)
    tipo_contrato_display = serializers.CharField(source='get_tipo_contrato_display', read_only=True)

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


class SolicitudFacturacionSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    empresa_nombre = serializers.CharField(source='empresa.razon_social', read_only=True)

    class Meta:
        model = SolicitudFacturacion
        fields = '__all__'
        read_only_fields = ['created_at']


class MiembroEquipoSerializer(serializers.ModelSerializer):
    rol_display       = serializers.CharField(source='get_rol_display', read_only=True)
    empleado_nombre   = serializers.SerializerMethodField()
    empleado_cargo    = serializers.SerializerMethodField()
    equipo_nombre     = serializers.CharField(source='equipo.nombre', read_only=True)

    class Meta:
        model = MiembroEquipo
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_empleado_nombre(self, obj):
        if obj.empleado and obj.empleado.persona:
            p = obj.empleado.persona
            return f"{p.primer_nombre} {p.primer_apellido}".strip()
        return None

    def get_empleado_cargo(self, obj):
        if obj.empleado and obj.empleado.cargo:
            return obj.empleado.cargo.nombre_cargo
        return None


class EquipoSerializer(serializers.ModelSerializer):
    estado_display  = serializers.CharField(source='get_estado_display', read_only=True)
    empresa_nombre  = serializers.CharField(source='empresa.razon_social', read_only=True)
    area_nombre     = serializers.CharField(source='area.nombre_area', read_only=True)
    servicio_nombre = serializers.CharField(source='servicio.nombre', read_only=True)
    miembros        = serializers.SerializerMethodField()
    sub_equipos     = serializers.SerializerMethodField()

    def get_miembros(self, obj):
        return MiembroEquipoSerializer(obj.miembros.filter(activo=True), many=True).data

    class Meta:
        model = Equipo
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_sub_equipos(self, obj):
        # Evitar recursión profunda: solo primer nivel de sub-equipos con resumen
        return EquipoResumenSerializer(
            obj.sub_equipos.filter(activo=True), many=True
        ).data


class EquipoResumenSerializer(serializers.ModelSerializer):
    """Serializer ligero para sub-equipos anidados."""

    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    miembros       = serializers.SerializerMethodField()
    sub_equipos    = serializers.SerializerMethodField()

    def get_miembros(self, obj):
        return MiembroEquipoSerializer(obj.miembros.filter(activo=True), many=True).data

    class Meta:
        model = Equipo
        fields = [
            'id', 'nombre', 'descripcion', 'estado', 'estado_display',
            'fecha_inicio', 'fecha_fin', 'activo', 'miembros', 'sub_equipos',
        ]

    def get_sub_equipos(self, obj):
        return EquipoResumenSerializer(
            obj.sub_equipos.filter(activo=True), many=True
        ).data


class EquipoListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listados y selects."""

    estado_display  = serializers.CharField(source='get_estado_display', read_only=True)
    empresa_nombre  = serializers.CharField(source='empresa.razon_social', read_only=True)
    area_nombre     = serializers.CharField(source='area.nombre_area', read_only=True)
    servicio_nombre = serializers.CharField(source='servicio.nombre', read_only=True)
    cantidad_miembros = serializers.IntegerField(source='miembros.count', read_only=True)
    cantidad_sub_equipos = serializers.IntegerField(source='sub_equipos.count', read_only=True)

    class Meta:
        model = Equipo
        fields = [
            'id', 'nombre', 'estado', 'estado_display',
            'empresa', 'empresa_nombre',
            'area', 'area_nombre',
            'servicio', 'servicio_nombre',
            'cantidad_miembros', 'cantidad_sub_equipos', 'especial',
            'fecha_inicio', 'activo',
        ]


class EmpresaClienteSerializer(serializers.ModelSerializer):
    tipo_empresa_display    = serializers.CharField(source='get_tipo_empresa_display', read_only=True)
    estado_display          = serializers.CharField(source='get_estado_display', read_only=True)
    nivel_riesgo_display    = serializers.CharField(source='get_nivel_riesgo_display', read_only=True)
    regimen_tributario_display = serializers.CharField(source='get_regimen_tributario_display', read_only=True)
    sqf_status_display      = serializers.CharField(source='get_sqf_status_display', read_only=True)
    empresa_matriz_nombre   = serializers.CharField(source='empresa_matriz.razon_social', read_only=True)
    contactos  = ContactoClienteSerializer(many=True, read_only=True)
    servicios  = ServicioContratadoSerializer(many=True, read_only=True)
    equipo     = serializers.SerializerMethodField()

    def get_equipo(self, obj):
        qs = obj.equipo.filter(activo=True).select_related('empleado__persona', 'empleado__cargo')
        return AsignacionEquipoSerializer(qs, many=True, context=self.context).data

    class Meta:
        model = EmpresaCliente
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class EmpresaClienteListSerializer(serializers.ModelSerializer):
    tipo_empresa_display  = serializers.CharField(source='get_tipo_empresa_display', read_only=True)
    estado_display        = serializers.CharField(source='get_estado_display', read_only=True)
    nivel_riesgo_display  = serializers.CharField(source='get_nivel_riesgo_display', read_only=True)
    sqf_status_display    = serializers.CharField(source='get_sqf_status_display', read_only=True)
    contacto_principal    = serializers.SerializerMethodField()
    areas_count           = serializers.SerializerMethodField()

    class Meta:
        model = EmpresaCliente
        fields = [
            'id', 'razon_social', 'nit', 'tipo_empresa', 'tipo_empresa_display',
            'tipo_cliente', 'grupo_economico',
            'estado', 'estado_display', 'sqf_status', 'sqf_status_display',
            'nivel_riesgo', 'nivel_riesgo_display',
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
