import logging

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q, Sum, Count
from django.db.models.functions import TruncMonth
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date, datetime, timedelta

from empleados.models import DatosArea, DatosEmpleado
from sistema.models import SuperAdmin

from .models import (
    EmpresaCliente, ContactoCliente, ServicioContratado,
    AsignacionEquipo, BitacoraCliente, SolicitudFacturacion,
    Equipo, MiembroEquipo,
)
from .serializers import (
    EmpresaClienteSerializer, EmpresaClienteListSerializer,
    ContactoClienteSerializer, ServicioContratadoSerializer,
    AsignacionEquipoSerializer, BitacoraClienteSerializer,
    SolicitudFacturacionSerializer,
    EquipoSerializer, EquipoListSerializer, MiembroEquipoSerializer,
)
from . import sqf_parser
from .n8n_clientes import importar_clientes_desde_n8n
from .permissions import (
    EsAdminOEditor,
    EsAdminOGerenteArea,
    EsAdminEditorOPropioCliente,
    EsAdminEditorOSoloLecturaAsignada,
    EsAdminEditorOContactoPropio,
    PuedeEnviarFromSQF,
    _es_admin_editor,
    _es_gerente_area,
    _es_gerente,
    _es_superadmin,
    _es_empleado,
)

logger = logging.getLogger(__name__)


class EsAdminSistema(permissions.BasePermission):
    """Solo SuperAdmin o Admin del sistema (id_permisos=1)."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if _es_superadmin(request.user):
            return True
        if not _es_empleado(request.user):
            return False
        return (
            getattr(request.user, 'estado', None) == 'ACTIVA'
            and int(getattr(request.user, 'id_permisos', 0) or 0) == 1
        )


def _filtrar_clientes_por_usuario(qs, user, area_id=None):
    """
    Filtra un queryset de EmpresaCliente según el rol del usuario logueado.
    - SuperAdmin / Admin / Editor / Gerente: acceso total.
    - Usuario normal: clientes donde es miembro de un contrato activo.
      Si se proporciona area_id, se incluyen los clientes con equipos activos
      en esa área como fallback para gerentes de área no reconocidos.
    """
    if _es_superadmin(user) or _es_admin_editor(user) or _es_gerente(user):
        return qs
    if not _es_empleado(user):
        return qs.none()
    if area_id:
        return qs.filter(
            equipos__area_id=area_id,
            equipos__activo=True,
        ).distinct()
    return qs.filter(
        equipos__miembros__empleado=user,
        equipos__miembros__activo=True,
        equipos__activo=True,
    ).distinct()


class EmpresaClienteViewSet(viewsets.ModelViewSet):
    queryset = EmpresaCliente.objects.all()

    def get_permissions(self):
        if self.action in ('from_sqf',):
            return [PuedeEnviarFromSQF()]
        if self.action in ('list', 'retrieve', 'por_areas', 'contactos',
                           'servicios', 'equipo', 'bitacora', 'mis_clientes',
                           'organigrama'):
            return [EsAdminEditorOSoloLecturaAsignada()]
        return [EsAdminOGerenteArea()]

    def create(self, request, *args, **kwargs):
        return Response(
            {'detail': 'Las empresas se crean únicamente desde FormulariosSQF vía /from_sqf/.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'detail': 'No se permite eliminar empresas desde esta interfaz.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return EmpresaClienteListSerializer
        return EmpresaClienteSerializer

    def get_queryset(self):
        qs = EmpresaCliente.objects.all()
        estado = self.request.query_params.get('estado')
        nivel_riesgo = self.request.query_params.get('nivel_riesgo')
        tipo_empresa = self.request.query_params.get('tipo_empresa')
        search = self.request.query_params.get('search')

        # Un cliente se considera con contrato abierto si tiene al menos un Equipo activo.
        empresas_con_contrato_abierto = EmpresaCliente.objects.filter(
            equipos__activo=True
        ).values_list('id', flat=True)

        if estado:
            if estado.lower() == 'activo':
                # Activos = estado vigente Y con contrato abierto
                qs = qs.filter(
                    estado__in=['activo', 'prospecto'],
                    id__in=empresas_con_contrato_abierto,
                )
            elif estado.lower() == 'inactivo':
                # Inactivos = estado inactivo/suspendido/retirado O sin contrato abierto
                qs = qs.filter(
                    Q(estado__in=['inactivo', 'suspendido', 'retirado']) |
                    ~Q(id__in=empresas_con_contrato_abierto)
                )
            else:
                qs = qs.filter(estado=estado)
        if nivel_riesgo:
            qs = qs.filter(nivel_riesgo=nivel_riesgo)
        if tipo_empresa:
            qs = qs.filter(tipo_empresa=tipo_empresa)
        if search:
            qs = qs.filter(
                Q(razon_social__icontains=search) |
                Q(nit__icontains=search) |
                Q(ciudad__icontains=search)
            )

        area = self.request.query_params.get('area')
        if area:
            try:
                area_id = int(area)
                qs = qs.filter(equipos__area_id=area_id, equipos__activo=True).distinct()
            except (TypeError, ValueError):
                pass

        qs = _filtrar_clientes_por_usuario(qs, self.request.user)
        return qs

    @action(detail=True, methods=['get'])
    def por_areas(self, request, pk=None):
        """
        Devuelve todas las áreas que atienden al cliente, con sus servicios
        y los equipos de trabajo asignados desde esa área.
        """
        empresa = self.get_object()
        from api.models import DatosArea

        # Áreas presentes vía servicios activos o equipos activos
        area_ids = set()
        area_ids |= set(
            ServicioContratado.objects
            .filter(empresa=empresa, area__isnull=False)
            .values_list('area_id', flat=True)
        )
        area_ids |= set(
            Equipo.objects
            .filter(empresa=empresa, activo=True, area__isnull=False)
            .values_list('area_id', flat=True)
        )

        result = []
        for area in DatosArea.objects.filter(id_area__in=area_ids).order_by('nombre_area'):
            servicios = ServicioContratado.objects.filter(empresa=empresa, area=area).order_by('-created_at')
            equipos = Equipo.objects.filter(
                empresa=empresa, area=area, activo=True, equipo_padre__isnull=True
            ).prefetch_related(
                'miembros__empleado__persona',
                'miembros__empleado__cargo',
                'servicio',
                'sub_equipos__miembros__empleado__persona',
                'sub_equipos__miembros__empleado__cargo',
            )

            result.append({
                'area_id':    area.id_area,
                'area_nombre': area.nombre_area,
                'servicios':  ServicioContratadoSerializer(servicios, many=True).data,
                'equipos':    EquipoSerializer(equipos, many=True).data,
            })

        return Response(result)

    @action(detail=True, methods=['get'])
    def contactos(self, request, pk=None):
        empresa = self.get_object()
        serializer = ContactoClienteSerializer(empresa.contactos.all(), many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def servicios(self, request, pk=None):
        empresa = self.get_object()
        serializer = ServicioContratadoSerializer(empresa.servicios.all(), many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def equipo(self, request, pk=None):
        empresa = self.get_object()
        qs = empresa.equipo.filter(activo=True)
        serializer = AsignacionEquipoSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def bitacora(self, request, pk=None):
        empresa = self.get_object()
        serializer = BitacoraClienteSerializer(empresa.bitacora.all(), many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def asignar_areas(self, request, pk=None):
        """
        Asigna una o varias áreas al cliente creando un servicio por cada una.
        Body: {"areas": [1, 2, 3]}
        """
        empresa = self.get_object()
        area_ids = request.data.get('areas') or []
        if not isinstance(area_ids, list) or not area_ids:
            return Response({'error': 'Se requiere un array de áreas.'}, status=status.HTTP_400_BAD_REQUEST)

        hoy = date.today()
        creados = []
        with transaction.atomic():
            for area_id in area_ids:
                try:
                    area = DatosArea.objects.get(id_area=area_id)
                except DatosArea.DoesNotExist:
                    continue
                servicio, _ = ServicioContratado.objects.get_or_create(
                    empresa=empresa,
                    area=area,
                    nombre=f'{empresa.razon_social} - {area.nombre_area}',
                    defaults={
                        'descripcion': f'Servicio asignado manualmente al área {area.nombre_area}',
                        'tipo_contrato': 'mensual',
                        'periodicidad': 'mensual',
                        'estado': 'activo',
                        'fecha_inicio': hoy,
                    },
                )
                creados.append(servicio.id)

        return Response({'creados': creados, 'total': len(creados)}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def desasignar_area(self, request, pk=None):
        """
        Desasigna un área del cliente: termina todos sus servicios y desactiva
        los equipos activos de esa área para esta empresa.
        Body: {"area_id": 5}
        """
        empresa = self.get_object()
        area_id = request.data.get('area_id')
        if not area_id:
            return Response({'error': 'Se requiere area_id.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            ServicioContratado.objects.filter(
                empresa=empresa, area_id=area_id
            ).update(estado='terminado')

            equipos = Equipo.objects.filter(empresa=empresa, area_id=area_id, activo=True)
            for eq in equipos:
                eq.miembros.filter(activo=True).update(activo=False, fecha_fin=timezone.now().date())
            equipos.update(activo=False, fecha_fin=timezone.now().date())

        return Response({'detail': 'Área desasignada correctamente.'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Estadísticas del CRM. Acepta filtros opcionales:
          ?area_id=X     → solo clientes atendidos por esa área
          ?empleado_id=X → solo clientes asignados a ese empleado
        Solo incluye en la respuesta secciones con datos reales.
        """
        area_id      = request.query_params.get('area_id')
        empleado_id  = request.query_params.get('empleado_id')
        empresa_id   = request.query_params.get('empresa_id')

        # ── Scope base de empresas ────────────────────────────────────────────
        empresa_qs = EmpresaCliente.objects.all()
        servicio_qs = ServicioContratado.objects.all()
        asignacion_qs = AsignacionEquipo.objects.filter(activo=True)
        bitacora_qs = BitacoraCliente.objects.all()

        if empresa_id:
            empresa_qs    = empresa_qs.filter(id=empresa_id)
            servicio_qs   = servicio_qs.filter(empresa_id=empresa_id)
            asignacion_qs = asignacion_qs.filter(empresa_id=empresa_id)
            bitacora_qs   = bitacora_qs.filter(empresa_id=empresa_id)

        if area_id:
            ids = servicio_qs.filter(area_id=area_id).values_list('empresa_id', flat=True).distinct()
            empresa_qs    = empresa_qs.filter(id__in=ids)
            servicio_qs   = servicio_qs.filter(area_id=area_id)
            asignacion_qs = asignacion_qs.filter(area_id=area_id)
            bitacora_qs   = bitacora_qs.filter(empresa_id__in=ids)

        if empleado_id:
            # El modelo vigente de asignación es MiembroEquipo a través de Equipo
            ids = MiembroEquipo.objects.filter(
                empleado_id=empleado_id,
                activo=True,
                equipo__activo=True,
            ).values_list('equipo__empresa_id', flat=True).distinct()
            empresa_qs    = empresa_qs.filter(id__in=ids)
            servicio_qs   = servicio_qs.filter(empresa_id__in=ids)
            asignacion_qs = asignacion_qs.filter(empresa_id__in=ids)
            bitacora_qs   = bitacora_qs.filter(empresa_id__in=ids)

        total = empresa_qs.count()

        # ── Distribuciones (solo se envían si tienen datos > 0) ──────────────
        por_estado_raw = {
            e: empresa_qs.filter(estado=e).count()
            for e in ['prospecto', 'activo', 'inactivo', 'suspendido', 'retirado']
        }
        por_estado = {k: v for k, v in por_estado_raw.items() if v > 0}

        por_riesgo_raw = {
            r: empresa_qs.filter(nivel_riesgo=r).count()
            for r in ['bajo', 'medio', 'alto', 'critico']
        }
        por_riesgo = {k: v for k, v in por_riesgo_raw.items() if v > 0}

        por_tipo_raw = {
            t: empresa_qs.filter(tipo_empresa=t).count()
            for t in ['microempresa', 'pyme', 'grande', 'grupo_empresarial']
        }
        por_tipo = {k: v for k, v in por_tipo_raw.items() if v > 0}

        # ── Clientes por área (solo si hay datos) ────────────────────────────
        por_area = list(
            servicio_qs
            .filter(estado='activo', area__isnull=False)
            .values('area__nombre_area')
            .annotate(total=Count('empresa', distinct=True))
            .order_by('-total')[:8]
        ) if not area_id else []   # con filtro de área el gráfico no aplica

        # ── Facturación por área ─────────────────────────────────────────────
        facturacion_area = list(
            servicio_qs
            .filter(estado='activo', valor_mensual__isnull=False, area__isnull=False)
            .values('area__nombre_area')
            .annotate(total=Sum('valor_mensual'))
            .order_by('-total')[:8]
        )

        ingresos_total = servicio_qs.filter(
            estado='activo', valor_mensual__isnull=False
        ).aggregate(total=Sum('valor_mensual'))['total'] or 0

        # ── Clientes activos sin área (alerta) ───────────────────────────────
        sin_area_ids = set(
            servicio_qs.filter(area__isnull=False).values_list('empresa_id', flat=True)
        )
        sin_area_count = empresa_qs.filter(estado='activo').exclude(id__in=sin_area_ids).count()

        # ── Alertas riesgo ───────────────────────────────────────────────────
        clientes_riesgo = list(
            empresa_qs
            .filter(nivel_riesgo__in=['alto', 'critico'], estado='activo')
            .values('id', 'razon_social', 'nit', 'nivel_riesgo', 'ciudad')[:10]
        )

        # ── Actividad reciente ───────────────────────────────────────────────
        actividad_reciente = list(
            bitacora_qs
            .select_related('empresa', 'empleado__persona')
            .order_by('-fecha')[:10]
            .values(
                'id', 'tipo', 'descripcion', 'fecha',
                'empresa__razon_social',
                'empleado__persona__primer_nombre',
                'empleado__persona__primer_apellido',
            )
        )
        for entry in actividad_reciente:
            entry['fecha'] = entry['fecha'].isoformat() if entry['fecha'] else None
            n = entry.pop('empleado__persona__primer_nombre', '') or ''
            a = entry.pop('empleado__persona__primer_apellido', '') or ''
            entry['empleado_nombre'] = f"{n} {a}".strip() or None
            entry['empresa_nombre']  = entry.pop('empresa__razon_social', '')

        # ── Top equipo ───────────────────────────────────────────────────────
        top_equipo = list(
            asignacion_qs
            .values(
                'empleado__id_empleado',
                'empleado__persona__primer_nombre',
                'empleado__persona__primer_apellido',
                'empleado__cargo__nombre_cargo',
            )
            .annotate(clientes=Count('empresa', distinct=True))
            .order_by('-clientes')[:6]
        )
        for e in top_equipo:
            n = e.pop('empleado__persona__primer_nombre', '') or ''
            a = e.pop('empleado__persona__primer_apellido', '') or ''
            e['nombre'] = f"{n} {a}".strip()
            e['cargo']  = e.pop('empleado__cargo__nombre_cargo', '') or ''
            e['id']     = e.pop('empleado__id_empleado', None)

        # ── Nuevos clientes por mes (solo últimos 6 meses con datos) ─────────
        six_months_ago = datetime.now() - timedelta(days=180)
        por_mes = list(
            empresa_qs
            .filter(created_at__gte=six_months_ago)
            .annotate(mes=TruncMonth('created_at'))
            .values('mes')
            .annotate(total=Count('id'))
            .order_by('mes')
        )
        for m in por_mes:
            m['mes'] = m['mes'].strftime('%b %Y') if m['mes'] else ''

        # ── Contexto del filtro activo ────────────────────────────────────────
        filtro_info = {}
        if empresa_id:
            try:
                filtro_info['empresa_nombre'] = EmpresaCliente.objects.get(id=empresa_id).razon_social
            except EmpresaCliente.DoesNotExist:
                pass
        if area_id:
            from api.models import DatosArea
            try:
                filtro_info['area_nombre'] = DatosArea.objects.get(id_area=area_id).nombre_area
            except DatosArea.DoesNotExist:
                pass
        if empleado_id:
            from api.models import DatosEmpleado
            try:
                emp = DatosEmpleado.objects.select_related('persona').get(id_empleado=empleado_id)
                p = emp.persona
                filtro_info['empleado_nombre'] = f"{p.primer_nombre} {p.primer_apellido}".strip() if p else ''
            except DatosEmpleado.DoesNotExist:
                pass

        return Response({
            'total':             total,
            'por_estado':        por_estado,
            'por_riesgo':        por_riesgo,
            'por_tipo':          por_tipo,
            'por_area':          por_area,
            'facturacion_area':  facturacion_area,
            'ingresos_total':    float(ingresos_total),
            'sin_area_count':    sin_area_count,
            'clientes_riesgo':   clientes_riesgo,
            'actividad_reciente': actividad_reciente,
            'top_equipo':        top_equipo,
            'por_mes':           por_mes,
            'filtro_info':       filtro_info,
        })

    @action(detail=False, methods=['get'])
    def mis_clientes(self, request):
        """
        Devuelve los clientes asignados al empleado logueado.
        Requiere que el usuario esté autenticado y tenga id_empleado.
        El modelo vigente de asignación es MiembroEquipo -> Equipo -> EmpresaCliente.
        """
        empleado_id = request.query_params.get('empleado_id') or getattr(request.user, 'id_empleado', None)

        if not empleado_id:
            return Response(
                {'error': 'No se pudo identificar el empleado. Incluya empleado_id en la URL.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # IDs de empresas donde el empleado es miembro activo de un equipo activo
        empresas_ids = MiembroEquipo.objects.filter(
            empleado_id=empleado_id,
            activo=True,
            equipo__activo=True,
        ).values_list('equipo__empresa_id', flat=True).distinct()

        qs = EmpresaCliente.objects.filter(id__in=empresas_ids).prefetch_related('contactos')

        estado = request.query_params.get('estado')
        if estado:
            if estado.lower() == 'activo':
                qs = qs.filter(estado__in=['activo', 'prospecto'])
            elif estado.lower() == 'inactivo':
                qs = qs.filter(estado__in=['inactivo', 'suspendido', 'retirado'])
            else:
                qs = qs.filter(estado=estado)

        serializer = EmpresaClienteListSerializer(qs, many=True)
        return Response({
            'count': qs.count(),
            'empleado_id': empleado_id,
            'clientes': serializer.data
        })

    @action(detail=False, methods=['get'])
    def organigrama(self, request):
        """
        Datos para el organigrama interactivo de clientes.

        Estructura:
          - por_area:    área -> clientes -> equipos -> miembros.
          - por_cliente: cliente -> áreas -> equipos -> miembros.
          - por_equipo:  listado plano de equipos con cliente y miembros.
        """
        areas_map = {a.id_area: a for a in DatosArea.objects.all()}

        filtro_area = self.request.query_params.get('area')
        try:
            filtro_area_id = int(filtro_area) if filtro_area else None
        except (TypeError, ValueError):
            filtro_area_id = None

        empresas_qs = EmpresaCliente.objects.filter(equipos__activo=True).distinct()

        empresas = _filtrar_clientes_por_usuario(
            empresas_qs,
            self.request.user,
            filtro_area_id,
        ).prefetch_related(
            'servicios__area',
            'equipos__area',
            'equipos__servicio',
            'equipos__miembros__empleado__persona',
            'equipos__miembros__empleado__cargo',
            'equipos__miembros__empleado__area',
            'equipos__sub_equipos__miembros__empleado__persona',
            'equipos__sub_equipos__miembros__empleado__cargo',
            'equipos__sub_equipos__miembros__empleado__area',
        )

        # {empresa_id: {area_id: [servicio_dict]}}
        servicios_por_empresa_area = {}
        # {empresa_id: {area_id: [equipo_dict]}}
        equipos_por_empresa_area = {}
        # {empresa_id: [equipo_dict]}
        equipos_por_empresa = {}

        for e in empresas:
            eid = e.id
            servicios_por_empresa_area[eid] = {}
            equipos_por_empresa_area[eid] = {}
            equipos_por_empresa[eid] = []

            for s in e.servicios.filter(estado='activo'):
                if not s.area:
                    continue
                servicios_por_empresa_area[eid].setdefault(s.area_id, []).append({
                    'id': s.id,
                    'nombre': s.nombre,
                    'descripcion': s.descripcion,
                    'estado': s.estado,
                    'estado_display': s.get_estado_display(),
                })

            def _equipo_dict(eq):
                return {
                    'id': eq.id,
                    'nombre': eq.nombre,
                    'descripcion': eq.descripcion,
                    'estado': eq.estado,
                    'estado_display': eq.get_estado_display(),
                    'area_id': eq.area_id,
                    'area_nombre': eq.area.nombre_area if eq.area else '',
                    'servicio_id': eq.servicio_id,
                    'servicio_nombre': eq.servicio.nombre if eq.servicio else '',
                    'fecha_inicio': eq.fecha_inicio,
                    'miembros': [
                        {
                            'empleado_id': m.empleado_id,
                            'empleado_nombre': (
                                f"{m.empleado.persona.primer_nombre} {m.empleado.persona.primer_apellido}".strip()
                                if m.empleado.persona else f'Empleado #{m.empleado_id}'
                            ),
                            'cargo': m.empleado.cargo.nombre_cargo if m.empleado.cargo else '',
                            'area_id': m.empleado.area_id,
                            'area_nombre': m.empleado.area.nombre_area if m.empleado.area else '',
                            'rol': m.rol,
                            'rol_display': m.get_rol_display(),
                        }
                        for m in eq.miembros.filter(activo=True)
                    ],
                    'sub_equipos': [_equipo_dict(sub) for sub in eq.sub_equipos.filter(activo=True)],
                }

            equipos_padre_qs = e.equipos.filter(activo=True, equipo_padre__isnull=True)
            if filtro_area_id:
                equipos_padre_qs = equipos_padre_qs.filter(area_id=filtro_area_id)

            for eq in equipos_padre_qs:
                aid = eq.area_id
                equipo_dict = _equipo_dict(eq)
                equipos_por_empresa[eid].append(equipo_dict)
                if aid:
                    equipos_por_empresa_area[eid].setdefault(aid, []).append(equipo_dict)

        def _cliente_dict(e):
            return {
                'id': e.id,
                'razon_social': e.razon_social,
                'nit': e.nit,
                'estado': e.estado,
                'estado_display': e.get_estado_display(),
                'ciudad': e.ciudad,
                'email_principal': e.email_principal,
                'telefono': e.telefono,
            }

        # ── Por área ───────────────────────────────────────────────────────────
        area_clientes = {}
        for e in empresas:
            eid = e.id
            # Áreas provenientes de servicios activos o de equipos activos
            area_ids = set(servicios_por_empresa_area[eid].keys()) | set(equipos_por_empresa_area[eid].keys())
            for aid in area_ids:
                area_clientes.setdefault(aid, {})[eid] = _cliente_dict(e)

        por_area = []
        for aid in sorted(area_clientes.keys(), key=lambda x: areas_map[x].nombre_area):
            por_area.append({
                'area_id': aid,
                'area_nombre': areas_map[aid].nombre_area,
                'clientes': [
                    {
                        **cliente,
                        'equipos': equipos_por_empresa_area[eid].get(aid, []),
                        'servicios': servicios_por_empresa_area[eid].get(aid, []),
                    }
                    for eid, cliente in area_clientes[aid].items()
                ],
            })

        # ── Por cliente ────────────────────────────────────────────────────────
        por_cliente = []
        for e in empresas:
            eid = e.id
            area_ids = set(servicios_por_empresa_area[eid].keys()) | set(equipos_por_empresa_area[eid].keys())
            if not area_ids:
                continue
            por_cliente.append({
                'id': e.id,
                'razon_social': e.razon_social,
                'nit': e.nit,
                'estado': e.estado,
                'estado_display': e.get_estado_display(),
                'ciudad': e.ciudad,
                'email_principal': e.email_principal,
                'telefono': e.telefono,
                'areas': [
                    {
                        'area_id': aid,
                        'area_nombre': areas_map[aid].nombre_area,
                        'equipos': equipos_por_empresa_area[eid].get(aid, []),
                        'servicios': servicios_por_empresa_area[eid].get(aid, []),
                    }
                    for aid in sorted(area_ids, key=lambda x: areas_map[x].nombre_area)
                ],
            })

        # ── Por equipo ─────────────────────────────────────────────────────────
        por_equipo = []
        for e in empresas:
            eid = e.id
            for eq in equipos_por_empresa[eid]:
                por_equipo.append({
                    **eq,
                    'cliente': {
                        'id': e.id,
                        'razon_social': e.razon_social,
                        'nit': e.nit,
                        'estado': e.estado,
                        'estado_display': e.get_estado_display(),
                    },
                })

        return Response({
            'por_area': por_area,
            'por_cliente': por_cliente,
            'por_equipo': por_equipo,
        })

    @action(detail=False, methods=['get'])
    def por_empleado(self, request):
        """
        Devuelve los clientes y contratos asignados a un empleado.
        Query param: empleado_id
        """
        empleado_id = request.query_params.get('empleado_id')
        if not empleado_id:
            return Response(
                {'error': 'Se requiere empleado_id.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            empleado = DatosEmpleado.objects.select_related(
                'persona', 'cargo', 'area'
            ).get(pk=empleado_id)
        except DatosEmpleado.DoesNotExist:
            return Response(
                {'error': 'Empleado no encontrado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        miembros = MiembroEquipo.objects.filter(
            empleado=empleado,
            activo=True,
            equipo__activo=True,
        ).select_related(
            'equipo__empresa', 'equipo__area', 'equipo__servicio'
        )

        por_empresa = {}
        for m in miembros:
            empresa = m.equipo.empresa
            entry = por_empresa.setdefault(empresa.id, {
                'empresa': {
                    'id': empresa.id,
                    'razon_social': empresa.razon_social,
                    'nit': empresa.nit,
                    'estado': empresa.estado,
                    'estado_display': empresa.get_estado_display(),
                },
                'contratos': [],
            })
            entry['contratos'].append({
                'id': m.equipo.id,
                'nombre': m.equipo.nombre,
                'rol': m.rol,
                'rol_display': m.get_rol_display(),
                'area_nombre': m.equipo.area.nombre_area if m.equipo.area else '',
                'servicio_nombre': m.equipo.servicio.nombre if m.equipo.servicio else '',
            })

        return Response({
            'empleado': {
                'id': empleado.id_empleado,
                'nombre': (
                    f"{empleado.persona.primer_nombre} {empleado.persona.primer_apellido}".strip()
                    if empleado.persona else ''
                ),
                'cargo': empleado.cargo.nombre_cargo if empleado.cargo else '',
                'area': empleado.area.nombre_area if empleado.area else '',
                'correo': empleado.correo_corporativo or '',
            },
            'clientes': list(por_empresa.values()),
        })

    @action(detail=False, methods=['post'], permission_classes=[EsAdminSistema])
    def importar_desde_n8n(self, request):
        """
        Importa clientes desde el webhook de n8n.
        Solo administradores. Por defecto solo crea clientes cuyo NIT no exista.
        Body opcional: {"solo_nuevos": true/false}
        """
        solo_nuevos = request.data.get('solo_nuevos', True)
        resultado = importar_clientes_desde_n8n(solo_nuevos=solo_nuevos)
        if 'error' in resultado:
            return Response(resultado, status=status.HTTP_502_BAD_GATEWAY)
        return Response(resultado)

    @action(detail=False, methods=['post'])
    def from_sqf(self, request):
        """
        Recibe datos de un cliente registrado en FormulariosSQF y hace upsert
        en EmpresaCliente + ContactoCliente. Idempotente por NIT.
        """
        try:
            parsed = sqf_parser.parse_empresa(request.data)
        except ValidationError as e:
            logger.warning(f"[clientes.from_sqf] Payload inválido: {e.message}")
            return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)

        nit = parsed['nit']

        with transaction.atomic():
            empresa, created = EmpresaCliente.objects.get_or_create(
                nit=nit,
                defaults={
                    'razon_social':    parsed['razon_social'],
                    'tipo_cliente':    parsed['tipo_cliente'],
                    'tipo_empresa':    parsed['tipo_empresa'],
                    'grupo_economico': parsed['grupo_economico'],
                    'digito_verificacion': parsed['digito_verificacion'],
                    'direccion':       parsed['direccion'],
                    'telefono':        parsed['telefono'],
                    'email_principal': parsed['email_principal'],
                    'sqf_id':          parsed['sqf_id'],
                    'sqf_status':      parsed['sqf_status'],
                    'estado':          parsed['estado'],
                    'fecha_inicio_relacion': parsed['fecha_inicio_relacion'],
                }
            )

            if not created:
                updates = {}
                for field in ('sqf_id', 'tipo_cliente', 'grupo_economico',
                              'digito_verificacion', 'direccion', 'telefono',
                              'email_principal', 'fecha_inicio_relacion'):
                    if parsed[field] and not getattr(empresa, field, None):
                        updates[field] = parsed[field]
                if not empresa.sqf_status:
                    updates['sqf_status'] = 'pendiente'
                if updates:
                    EmpresaCliente.objects.filter(pk=empresa.pk).update(**updates)
                    empresa.refresh_from_db()

            contacto = sqf_parser.parse_contacto(request.data)
            if contacto:
                ContactoCliente.objects.get_or_create(
                    empresa=empresa,
                    nombre=contacto['nombre'],
                    defaults={
                        'cargo': contacto['cargo'],
                        'notas': contacto['notas'],
                        'email': contacto['email'],
                        'telefono': contacto['telefono'],
                        'es_principal': contacto['es_principal'],
                        'activo': contacto['activo'],
                    }
                )

        serializer = EmpresaClienteSerializer(empresa, context={'request': request})
        return Response(
            {'created': created, 'empresa': serializer.data},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


class ContactoClienteViewSet(viewsets.ModelViewSet):
    queryset = ContactoCliente.objects.all()
    serializer_class = ContactoClienteSerializer
    permission_classes = [EsAdminEditorOContactoPropio]

    def get_queryset(self):
        qs = ContactoCliente.objects.all()
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        return qs


class ServicioContratadoViewSet(viewsets.ModelViewSet):
    queryset = ServicioContratado.objects.all()
    serializer_class = ServicioContratadoSerializer

    def get_permissions(self):
        if self.action == 'from_sqf':
            return [PuedeEnviarFromSQF()]
        return [EsAdminOGerenteArea()]

    def create(self, request, *args, **kwargs):
        area_id = request.data.get('area')
        if not _es_admin_editor(request.user) and not _es_gerente_area(request.user, area_id):
            return Response(
                {'detail': 'No tienes permiso para crear servicios en esta área.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def get_queryset(self):
        qs = ServicioContratado.objects.all()
        empresa_id = self.request.query_params.get('empresa')
        estado = self.request.query_params.get('estado')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        if estado:
            qs = qs.filter(estado=estado)
        return qs

    @action(detail=False, methods=['post'])
    def from_sqf(self, request):
        """
        Recibe datos de un contrato registrado en FormulariosSQF y crea
        un ServicioContratado. Idempotente por sqf_id.
        """
        d = request.data
        sqf_id = sqf_parser.clean_string(d.get('id') or d.get('sqf_id'), max_length=30)
        if not sqf_id:
            return Response({'error': 'Se requiere el campo id (CTR-XXX).'}, status=status.HTTP_400_BAD_REQUEST)

        if ServicioContratado.objects.filter(sqf_id=sqf_id).exists():
            servicio = ServicioContratado.objects.get(sqf_id=sqf_id)
            return Response(
                {'created': False, 'servicio': ServicioContratadoSerializer(servicio).data},
                status=status.HTTP_200_OK
            )

        # Buscar empresa por clientId (nit) o sqf_id
        client_nit = sqf_parser.clean_nit(d.get('clientId') or d.get('nit'))
        empresa = None
        if client_nit:
            empresa = EmpresaCliente.objects.filter(
                Q(nit=client_nit) | Q(sqf_id=client_nit)
            ).first()

        # Intentar mapear área a partir del nombre del servicio o contrato.
        area_qs = DatosArea.objects.all()
        area = None
        for campo in (d.get('service'), d.get('name')):
            if campo:
                area = sqf_parser.buscar_area_por_nombre(str(campo), area_qs)
                if area:
                    break

        contract_type = str(d.get('contractType') or '').lower()
        tipo_contrato, periodicidad = sqf_parser.tipo_contrato_desde_modality(contract_type)

        valor = sqf_parser.clean_decimal(d.get('value'))
        start_date = sqf_parser.parse_date(d.get('startDate') or d.get('fecha_inicio')) or date.today()

        servicio = ServicioContratado.objects.create(
            empresa=empresa,
            area=area,
            sqf_id=sqf_id,
            sqf_status='pendiente',
            nombre=sqf_parser.clean_string(d.get('name'), max_length=255),
            responsable=sqf_parser.clean_string(d.get('manager'), max_length=150),
            tipo_contrato=tipo_contrato,
            grupo_economico=sqf_parser.clean_string(d.get('economicGroup'), max_length=150),
            descripcion=sqf_parser.clean_string(d.get('service'), max_length=2000),
            roles_json=sqf_parser.clean_string(d.get('roles'), max_length=2000),
            fecha_inicio=start_date,
            fecha_fin=sqf_parser.parse_date(d.get('endDate')),
            valor_mensual=valor,
            periodicidad=periodicidad,
            estado='activo',
            notas=sqf_parser.clean_string(d.get('notes'), max_length=2000),
        )

        return Response(
            {'created': True, 'servicio': ServicioContratadoSerializer(servicio).data},
            status=status.HTTP_201_CREATED
        )


class AsignacionEquipoViewSet(viewsets.ModelViewSet):
    queryset = AsignacionEquipo.objects.select_related('empleado__persona', 'empleado__cargo').all()
    serializer_class = AsignacionEquipoSerializer
    permission_classes = [EsAdminOGerenteArea]

    def _puede_gestionar_area(self, area_id):
        return _es_admin_editor(self.request.user) or _es_gerente_area(self.request.user, area_id)

    def _validar_fechas(self, data):
        fecha_inicio = data.get('fecha_inicio')
        fecha_fin = data.get('fecha_fin')
        if fecha_inicio and fecha_fin:
            fi = sqf_parser.parse_date(fecha_inicio)
            ff = sqf_parser.parse_date(fecha_fin)
            if fi and ff and ff < fi:
                raise ValidationError('La fecha de fin no puede ser anterior a la fecha de inicio.')

    def create(self, request, *args, **kwargs):
        try:
            self._validar_fechas(request.data)
        except ValidationError as e:
            return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)

        empresa_id  = request.data.get('empresa')
        area_id     = request.data.get('area')
        if not self._puede_gestionar_area(area_id):
            return Response(
                {'error': 'No tienes permiso para gestionar el equipo de esta área.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        empleado_id = request.data.get('empleado')
        if empresa_id and area_id and empleado_id:
            if AsignacionEquipo.objects.filter(
                empresa_id=empresa_id, area_id=area_id,
                empleado_id=empleado_id, activo=True
            ).exists():
                return Response(
                    {'error': 'Ya existe una asignación activa para este empleado en esta empresa y área.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        try:
            self._validar_fechas(request.data)
        except ValidationError as e:
            return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Crea múltiples asignaciones de equipo en una sola petición.
        Útil para que los gerentes asignen un equipo completo a un cliente.
        """
        asignaciones = request.data.get('asignaciones', [])
        if not isinstance(asignaciones, list) or not asignaciones:
            return Response({'error': 'Se requiere una lista de asignaciones.'}, status=status.HTTP_400_BAD_REQUEST)

        area_ids = {item.get('area') for item in asignaciones if item.get('area')}
        if len(area_ids) > 1:
            return Response({'error': 'Todas las asignaciones deben ser del mismo área.'}, status=status.HTTP_400_BAD_REQUEST)
        area_id = area_ids.pop() if area_ids else None
        if not self._puede_gestionar_area(area_id):
            return Response(
                {'error': 'No tienes permiso para gestionar el equipo de esta área.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        creadas = []
        errores = []
        for idx, item in enumerate(asignaciones):
            serializer = self.get_serializer(data=item)
            if not serializer.is_valid():
                errores.append({'index': idx, 'errors': serializer.errors})
                continue
            try:
                self._validar_fechas(item)
            except ValidationError as e:
                errores.append({'index': idx, 'errors': {'fecha_fin': [e.message]}})
                continue

            empresa_id = item.get('empresa')
            area_id = item.get('area')
            empleado_id = item.get('empleado')
            if empresa_id and area_id and empleado_id and AsignacionEquipo.objects.filter(
                empresa_id=empresa_id, area_id=area_id,
                empleado_id=empleado_id, activo=True
            ).exists():
                errores.append({
                    'index': idx,
                    'errors': {'non_field_errors': ['Ya existe una asignación activa para este empleado en esta empresa y área.']}
                })
                continue

            self.perform_create(serializer)
            creadas.append(serializer.data)

        return Response(
            {'creadas': creadas, 'errores': errores},
            status=status.HTTP_207_MULTI_STATUS if errores else status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['post'])
    def bulk_deactivate(self, request):
        """Desactiva múltiples asignaciones por IDs."""
        ids = request.data.get('ids', [])
        if not isinstance(ids, list) or not ids:
            return Response({'error': 'Se requiere una lista de IDs.'}, status=status.HTTP_400_BAD_REQUEST)
        updated = AsignacionEquipo.objects.filter(pk__in=ids, activo=True).update(activo=False)
        return Response({'desactivadas': updated}, status=status.HTTP_200_OK)

    def get_queryset(self):
        qs = AsignacionEquipo.objects.select_related('empleado__persona', 'empleado__cargo').all()
        empresa_id = self.request.query_params.get('empresa')
        servicio_id = self.request.query_params.get('servicio')
        activo = self.request.query_params.get('activo')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        if servicio_id:
            qs = qs.filter(servicio_id=servicio_id)
        if activo is not None:
            qs = qs.filter(activo=(activo.lower() == 'true'))
        return qs


class BitacoraClienteViewSet(viewsets.ModelViewSet):
    queryset = BitacoraCliente.objects.all()
    serializer_class = BitacoraClienteSerializer
    permission_classes = [EsAdminEditorOPropioCliente]

    def get_queryset(self):
        qs = BitacoraCliente.objects.all()
        empresa_id = self.request.query_params.get('empresa')
        tipo = self.request.query_params.get('tipo')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        if tipo:
            qs = qs.filter(tipo=tipo)
        return qs


class SolicitudFacturacionViewSet(viewsets.ModelViewSet):
    queryset = SolicitudFacturacion.objects.all()
    serializer_class = SolicitudFacturacionSerializer

    def get_permissions(self):
        if self.action == 'from_sqf':
            return [PuedeEnviarFromSQF()]
        return [EsAdminEditorOPropioCliente()]

    def get_queryset(self):
        qs = SolicitudFacturacion.objects.all()
        empresa_id = self.request.query_params.get('empresa')
        nit = self.request.query_params.get('nit')
        status_f = self.request.query_params.get('status')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        if nit:
            qs = qs.filter(nit=nit)
        if status_f:
            qs = qs.filter(status=status_f)
        return qs

    @action(detail=False, methods=['post'])
    def from_sqf(self, request):
        """
        Recibe datos de una solicitud de facturación de FormulariosSQF.
        Idempotente por sqf_id. Crea/actualiza Empresa, Contacto, Servicios por
        área y la Solicitud de Facturación dentro de una transacción atómica.
        """
        d = request.data
        try:
            sqf_parser.validar_payload_facturacion(d)
        except ValidationError as e:
            logger.warning(f"[facturacion.from_sqf] Payload inválido: {e.message}")
            return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)

        sqf_id = sqf_parser.clean_string(d.get('id') or d.get('sqf_id'), max_length=30)
        if SolicitudFacturacion.objects.filter(sqf_id=sqf_id).exists():
            sol = SolicitudFacturacion.objects.get(sqf_id=sqf_id)
            return Response(
                {'created': False, 'solicitud': SolicitudFacturacionSerializer(sol).data},
                status=status.HTTP_200_OK
            )

        # ── Normalizar empresa y contacto ─────────────────────────────────────
        try:
            empresa_data = sqf_parser.parse_empresa(d)
            contacto_data = sqf_parser.parse_contacto(d)
        except ValidationError as e:
            logger.warning(f"[facturacion.from_sqf] Empresa inválida: {e.message}")
            return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)

        area_qs = DatosArea.objects.all()
        areas_facturacion = sqf_parser.parse_areas_facturacion(d, area_qs)

        tipo_contrato, periodicidad = sqf_parser.tipo_contrato_desde_modality(
            d.get('billingModality') or d.get('billing_modality') or d.get('serviceType')
        )

        with transaction.atomic():
            empresa, empresa_created = EmpresaCliente.objects.get_or_create(
                nit=empresa_data['nit'],
                defaults={
                    'razon_social': empresa_data['razon_social'],
                    'tipo_cliente': empresa_data['tipo_cliente'],
                    'tipo_empresa': empresa_data['tipo_empresa'],
                    'grupo_economico': empresa_data['grupo_economico'],
                    'direccion': empresa_data['direccion'],
                    'telefono': empresa_data['telefono'],
                    'email_principal': empresa_data['email_principal'],
                    'sqf_id': empresa_data['sqf_id'],
                    'sqf_status': 'pendiente',
                    'estado': 'prospecto',
                }
            )
            if not empresa_created:
                if empresa.estado == 'prospecto':
                    pass  # se mantiene prospecto hasta que un admin lo active

            if contacto_data:
                ContactoCliente.objects.get_or_create(
                    empresa=empresa,
                    nombre=contacto_data['nombre'],
                    defaults={
                        'cargo': contacto_data['cargo'],
                        'email': contacto_data['email'],
                        'telefono': contacto_data['telefono'],
                        'es_principal': True,
                        'activo': True,
                        'notas': contacto_data['notas'],
                    }
                )

            # ── Crear/actualizar servicios por área ───────────────────────────
            servicios_creados = []
            servicios_actualizados = []
            for item in areas_facturacion:
                area = item['area']
                servicio_id = f"{sqf_id}-{item['centro']}"[:30] if item['centro'] else sqf_id

                servicio_defaults = {
                    'empresa': empresa,
                    'area': area,
                    'sqf_status': 'pendiente',
                    'nombre': item['concepto'] or f"Servicio {item['centro']}",
                    'responsable': sqf_parser.clean_string(d.get('closer'), max_length=150),
                    'tipo_contrato': tipo_contrato,
                    'grupo_economico': empresa_data['grupo_economico'],
                    'descripcion': item['concepto'],
                    'fecha_inicio': date.today(),
                    'valor_mensual': item['valor'] if tipo_contrato == 'mensual' else None,
                    'periodicidad': periodicidad,
                    'estado': 'activo',
                    'notas': f"Centro: {item['codigo_centro']} | Producto: {item['codigo_producto']}",
                }

                servicio, servicio_created = ServicioContratado.objects.update_or_create(
                    sqf_id=servicio_id,
                    defaults=servicio_defaults,
                )
                if servicio_created:
                    servicios_creados.append(servicio)
                else:
                    servicios_actualizados.append(servicio)

            # ── Crear solicitud de facturación ────────────────────────────────
            sol = SolicitudFacturacion.objects.create(
                sqf_id=sqf_id,
                empresa=empresa,
                nit=empresa_data['nit'],
                client_name=empresa_data['razon_social'],
                company=sqf_parser.clean_string(d.get('company'), max_length=100),
                billing_type=sqf_parser.clean_string(d.get('billingType'), max_length=50),
                billing_client_type=sqf_parser.clean_string(
                    d.get('billingClientType') or d.get('billing_client_type'), max_length=50
                ),
                billing_modality=sqf_parser.clean_string(
                    d.get('billingModality') or d.get('billing_modality'), max_length=100
                ),
                sale_type=sqf_parser.clean_string(d.get('saleType') or d.get('sale_type'), max_length=50),
                cross_sale_person=sqf_parser.clean_string(
                    d.get('crossSalePerson') or d.get('cross_sale_person'), max_length=150
                ),
                service_type=sqf_parser.clean_string(d.get('serviceType') or d.get('service_type'), max_length=50),
                valor_mes=sqf_parser.clean_integer(d.get('valorMes') or d.get('valor_mes')),
                valor_proyecto=sqf_parser.clean_integer(d.get('valorProyecto') or d.get('valor_proyecto')),
                origin=sqf_parser.clean_string(d.get('origin'), max_length=100),
                origin_ref=sqf_parser.clean_string(d.get('originRef') or d.get('origin_ref'), max_length=150),
                closer=sqf_parser.clean_string(d.get('closer'), max_length=150),
                mes_tipo=sqf_parser.clean_string(
                    d.get('mes_tipo') or d.get('mesCorrienteOVencido'), max_length=50
                ),
                areas_json=sqf_parser.clean_string(d.get('areas') or d.get('areas_json'), max_length=4000),
                items_json=sqf_parser.clean_string(d.get('items_json') or d.get('items'), max_length=4000),
                status='pendiente',
                solicitante_nombre=sqf_parser.clean_string(d.get('solicitante_nombre'), max_length=150),
                solicitante_id=sqf_parser.clean_string(d.get('solicitante_id'), max_length=50),
            )

            # ── Bitácora de auditoría ─────────────────────────────────────────
            BitacoraCliente.objects.create(
                empresa=empresa,
                tipo='novedad',
                descripcion=f"Solicitud de facturación {sqf_id} recibida desde FormulariosSQF. "
                            f"Áreas: {len(areas_facturacion)}. Estado: pendiente.",
                empleado=getattr(request.user, 'id_empleado', None) and request.user,
                fecha=timezone.now(),
            )

        logger.info(
            f"[facturacion.from_sqf] {sqf_id}: empresa={empresa.nit}, "
            f"servicios_creados={len(servicios_creados)}, servicios_actualizados={len(servicios_actualizados)}"
        )

        return Response(
            {
                'created': True,
                'empresa': EmpresaClienteSerializer(empresa, context={'request': request}).data,
                'solicitud': SolicitudFacturacionSerializer(sol).data,
                'servicios_creados': ServicioContratadoSerializer(servicios_creados, many=True).data,
                'servicios_actualizados': ServicioContratadoSerializer(servicios_actualizados, many=True).data,
                'areas_count': len(areas_facturacion),
            },
            status=status.HTTP_201_CREATED
        )


# ── Equipos de trabajo ────────────────────────────────────────────────────────

class EquipoViewSet(viewsets.ModelViewSet):
    """CRUD de equipos de trabajo asignados a clientes."""

    queryset = Equipo.objects.prefetch_related(
        'miembros__empleado__persona',
        'miembros__empleado__cargo',
        'miembros__empleado__area',
        'sub_equipos__miembros__empleado__persona',
        'sub_equipos__miembros__empleado__cargo',
        'sub_equipos__miembros__empleado__area',
    ).select_related('empresa', 'area', 'servicio', 'equipo_padre')
    serializer_class = EquipoSerializer
    permission_classes = [EsAdminOGerenteArea]

    def get_serializer_class(self):
        if self.action == 'list':
            return EquipoListSerializer
        return EquipoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        empresa = self.request.query_params.get('empresa')
        area = self.request.query_params.get('area')
        activo = self.request.query_params.get('activo')

        if empresa:
            qs = qs.filter(empresa_id=empresa)
        if area:
            qs = qs.filter(area_id=area)
        if activo is not None:
            qs = qs.filter(activo=activo.lower() in ('true', '1', 'si'))
        return qs

    def destroy(self, request, *args, **kwargs):
        """Desactiva el equipo, sus miembros y sub-equipos en cascada (soft-delete)."""
        equipo = self.get_object()
        with transaction.atomic():
            equipo.miembros.filter(activo=True).update(activo=False, fecha_fin=timezone.now().date())
            Equipo.objects.filter(equipo_padre=equipo, activo=True).update(activo=False)
            equipo.activo = False
            equipo.fecha_fin = timezone.now().date()
            equipo.save(update_fields=['activo', 'fecha_fin', 'updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def agregar_miembro(self, request, pk=None):
        """Agrega un miembro al equipo."""
        equipo = self.get_object()
        data = request.data.copy()
        data['equipo'] = equipo.id
        serializer = MiembroEquipoSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def quitar_miembro(self, request, pk=None):
        """Desactiva un miembro del equipo."""
        equipo = self.get_object()
        miembro_id = request.data.get('miembro_id')
        if not miembro_id:
            return Response(
                {'detail': 'Se requiere miembro_id.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            miembro = MiembroEquipo.objects.get(pk=miembro_id, equipo=equipo)
        except MiembroEquipo.DoesNotExist:
            return Response(
                {'detail': 'Miembro no encontrado.'},
                status=status.HTTP_404_NOT_FOUND
            )
        miembro.activo = False
        miembro.fecha_fin = request.data.get('fecha_fin') or timezone.now().date()
        miembro.save(update_fields=['activo', 'fecha_fin', 'updated_at'])
        return Response(MiembroEquipoSerializer(miembro).data)


class MiembroEquipoViewSet(viewsets.ModelViewSet):
    """CRUD directo de miembros de equipo."""

    queryset = MiembroEquipo.objects.select_related(
        'equipo', 'empleado__persona', 'empleado__cargo', 'empleado__area'
    )
    serializer_class = MiembroEquipoSerializer
    permission_classes = [EsAdminOGerenteArea]

    def get_queryset(self):
        qs = super().get_queryset()
        equipo = self.request.query_params.get('equipo')
        empleado = self.request.query_params.get('empleado')
        activo = self.request.query_params.get('activo')

        if equipo:
            qs = qs.filter(equipo_id=equipo)
        if empleado:
            qs = qs.filter(empleado_id=empleado)
        if activo is not None:
            qs = qs.filter(activo=activo.lower() in ('true', '1', 'si'))
        return qs
