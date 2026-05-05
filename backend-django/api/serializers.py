from rest_framework import serializers
from .models import DatosArea, DatosCargo, SuperAdmin, DatosEmpleado, TareasCalendario, SolicitudesPassword, ReglamentoItem, Curso, CursoContenido, CursoHistorial, N8nLog, ApiKey

class DatosAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatosArea
        fields = '__all__'


class DatosCargoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatosCargo
        fields = '__all__'


class SuperAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = SuperAdmin
        fields = ['id', 'email', 'nombre', 'apellido', 'role', 'estado', 'created_at', 'last_login', 'fecha_ingreso']


class DatosEmpleadoSerializer(serializers.ModelSerializer):
    nombre_area = serializers.CharField(source='area.nombre_area', read_only=True)
    nombre_cargo = serializers.CharField(source='cargo.nombre_cargo', read_only=True)
    nombre_completo = serializers.CharField(read_only=True)
    area = serializers.PrimaryKeyRelatedField(queryset=DatosArea.objects.all(), required=False, allow_null=True)
    cargo = serializers.PrimaryKeyRelatedField(queryset=DatosCargo.objects.all(), required=False, allow_null=True)
    primer_nombre = serializers.CharField(required=False, allow_blank=True)
    segundo_nombre = serializers.CharField(required=False, allow_blank=True)
    primer_apellido = serializers.CharField(required=False, allow_blank=True)
    segundo_apellido = serializers.CharField(required=False, allow_blank=True)
    correo_corporativo = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    correo_personal = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    
    class Meta:
        model = DatosEmpleado
        fields = [
            'id_empleado', 'auth_id', 'primer_nombre', 'segundo_nombre',
            'primer_apellido', 'segundo_apellido', 'apodo', 'nombre_completo',
            'correo_corporativo', 'correo_personal', 'telefono', 'telefono_emergencia',
            'area', 'cargo', 'area_id', 'cargo_id', 'nombre_area', 'nombre_cargo',
            'id_permisos', 'estado', 'fecha_nacimiento', 'fecha_ingreso',
            'direccion', 'sexo', 'tipo_sangre', 'permitir_edicion_datos',
            'created_at', 'updated_at'
        ]


class TareasCalendarioSerializer(serializers.ModelSerializer):
    primer_nombre = serializers.CharField(source='empleado.primer_nombre', read_only=True)
    primer_apellido = serializers.CharField(source='empleado.primer_apellido', read_only=True)
    nombre_area = serializers.CharField(source='area.nombre_area', read_only=True)
    area_id = serializers.IntegerField(allow_null=True, required=False)
    empleado_id = serializers.IntegerField(allow_null=True, required=False)
    
    class Meta:
        model = TareasCalendario
        fields = [
            'id', 'titulo', 'descripcion', 'area_id', 'empleado_id',
            'nombre_area', 'primer_nombre', 'primer_apellido',
            'prioridad', 'fecha_vencimiento', 'fecha_creacion',
            'fecha_actualizacion', 'asignado_a', 'estado', 'creado_por'
        ]


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
    nombre_empleado = serializers.CharField(source='empleado_asignado.nombre_completo', read_only=True)
    area_id = serializers.IntegerField(allow_null=True, required=False)
    empleado_asignado_id = serializers.IntegerField(allow_null=True, required=False)

    class Meta:
        model = Curso
        fields = ['id', 'nombre', 'descripcion', 'orden', 'activo', 'visibilidad', 'area', 'area_id', 'empleado_asignado', 'empleado_asignado_id', 'nombre_area', 'nombre_empleado', 'contenidos', 'total_contenidos', 'created_at', 'updated_at']

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
    """Serializer para API Keys - expone key completa solo al crear"""
    key_visible = serializers.SerializerMethodField()
    creado_por_nombre = serializers.CharField(source='creado_por.nombre', read_only=True)

    class Meta:
        model = ApiKey
        fields = ['id', 'key', 'key_visible', 'nombre', 'descripcion', 'creado_por', 'creado_por_nombre',
                  'created_at', 'last_used_at', 'uso_count', 'is_active', 'permisos', 'ip_permitidas']
        read_only_fields = ['id', 'key', 'created_at', 'last_used_at', 'uso_count', 'creado_por']

    def get_key_visible(self, obj):
        """Muestra solo los primeros 8 caracteres de la key"""
        return f"{obj.key[:8]}..." if obj.key else None

    def to_representation(self, instance):
        """Override para mostrar key completa solo en respuestas de creación"""
        data = super().to_representation(instance)
        # En listas/updates, ocultar la key completa
        request = self.context.get('request')
        if request and request.method not in ['POST', 'PUT']:
            data.pop('key', None)
        return data
