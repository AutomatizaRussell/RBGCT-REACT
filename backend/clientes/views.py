from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Sum, Count
from django.db.models.functions import TruncMonth
from datetime import datetime, timedelta
from .models import (
    EmpresaCliente, ContactoCliente, ServicioContratado,
    AsignacionEquipo, DocumentoCliente, BitacoraCliente,
)
from .serializers import (
    EmpresaClienteSerializer, EmpresaClienteListSerializer,
    ContactoClienteSerializer, ServicioContratadoSerializer,
    AsignacionEquipoSerializer, DocumentoClienteSerializer,
    BitacoraClienteSerializer,
)


class EmpresaClienteViewSet(viewsets.ModelViewSet):
    queryset = EmpresaCliente.objects.all()

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

        if estado:
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
        return qs

    @action(detail=True, methods=['get'])
    def por_areas(self, request, pk=None):
        """
        Devuelve todas las áreas que atienden al cliente, con sus servicios
        y el equipo asignado desde esa área. Única fuente de verdad para la
        vista de gestión de áreas en el frontend.
        """
        empresa = self.get_object()
        from api.models import DatosArea

        # Áreas presentes vía servicios activos o asignaciones activas
        area_ids = set()
        area_ids |= set(
            ServicioContratado.objects
            .filter(empresa=empresa, area__isnull=False)
            .values_list('area_id', flat=True)
        )
        area_ids |= set(
            AsignacionEquipo.objects
            .filter(empresa=empresa, activo=True, area__isnull=False)
            .values_list('area_id', flat=True)
        )

        result = []
        for area in DatosArea.objects.filter(id_area__in=area_ids).order_by('nombre_area'):
            servicios = ServicioContratado.objects.filter(empresa=empresa, area=area).order_by('-created_at')
            equipo    = AsignacionEquipo.objects.filter(
                empresa=empresa, area=area, activo=True
            ).select_related('empleado__persona', 'empleado__cargo')

            result.append({
                'area_id':    area.id_area,
                'area_nombre': area.nombre_area,
                'servicios':  ServicioContratadoSerializer(servicios, many=True).data,
                'equipo':     AsignacionEquipoSerializer(equipo, many=True).data,
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
    def documentos(self, request, pk=None):
        empresa = self.get_object()
        serializer = DocumentoClienteSerializer(empresa.documentos.all(), many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def bitacora(self, request, pk=None):
        empresa = self.get_object()
        serializer = BitacoraClienteSerializer(empresa.bitacora.all(), many=True, context={'request': request})
        return Response(serializer.data)

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
            ids = asignacion_qs.filter(empleado_id=empleado_id).values_list('empresa_id', flat=True).distinct()
            empresa_qs    = empresa_qs.filter(id__in=ids)
            servicio_qs   = servicio_qs.filter(empresa_id__in=ids)
            asignacion_qs = asignacion_qs.filter(empleado_id=empleado_id)
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
        """
        empleado_id = request.query_params.get('empleado_id') or getattr(request.user, 'id_empleado', None)
        
        if not empleado_id:
            return Response(
                {'error': 'No se pudo identificar el empleado. Incluya empleado_id en la URL.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener IDs de empresas donde el empleado tiene asignaciones activas
        empresas_ids = AsignacionEquipo.objects.filter(
            empleado_id=empleado_id,
            activo=True
        ).values_list('empresa_id', flat=True).distinct()
        
        # Obtener los clientes con sus datos completos
        clientes = EmpresaCliente.objects.filter(
            id__in=empresas_ids
        ).prefetch_related('contactos')
        
        serializer = EmpresaClienteListSerializer(clientes, many=True)
        return Response({
            'count': clientes.count(),
            'empleado_id': empleado_id,
            'clientes': serializer.data
        })


class ContactoClienteViewSet(viewsets.ModelViewSet):
    queryset = ContactoCliente.objects.all()
    serializer_class = ContactoClienteSerializer

    def get_queryset(self):
        qs = ContactoCliente.objects.all()
        empresa_id = self.request.query_params.get('empresa')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        return qs


class ServicioContratadoViewSet(viewsets.ModelViewSet):
    queryset = ServicioContratado.objects.all()
    serializer_class = ServicioContratadoSerializer

    def get_queryset(self):
        qs = ServicioContratado.objects.all()
        empresa_id = self.request.query_params.get('empresa')
        estado = self.request.query_params.get('estado')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        if estado:
            qs = qs.filter(estado=estado)
        return qs


class AsignacionEquipoViewSet(viewsets.ModelViewSet):
    queryset = AsignacionEquipo.objects.select_related('empleado__persona', 'empleado__cargo').all()
    serializer_class = AsignacionEquipoSerializer

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


class DocumentoClienteViewSet(viewsets.ModelViewSet):
    queryset = DocumentoCliente.objects.all()
    serializer_class = DocumentoClienteSerializer

    def get_queryset(self):
        qs = DocumentoCliente.objects.all()
        empresa_id = self.request.query_params.get('empresa')
        tipo = self.request.query_params.get('tipo')
        vigente = self.request.query_params.get('vigente')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        if tipo:
            qs = qs.filter(tipo=tipo)
        if vigente is not None:
            qs = qs.filter(vigente=(vigente.lower() == 'true'))
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class BitacoraClienteViewSet(viewsets.ModelViewSet):
    queryset = BitacoraCliente.objects.all()
    serializer_class = BitacoraClienteSerializer

    def get_queryset(self):
        qs = BitacoraCliente.objects.all()
        empresa_id = self.request.query_params.get('empresa')
        tipo = self.request.query_params.get('tipo')
        if empresa_id:
            qs = qs.filter(empresa_id=empresa_id)
        if tipo:
            qs = qs.filter(tipo=tipo)
        return qs
