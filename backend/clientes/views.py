from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Sum, Count
from django.db.models.functions import TruncMonth
from datetime import datetime, timedelta
from .models import (
    EmpresaCliente, ContactoCliente, ServicioContratado,
    AsignacionEquipo, BitacoraCliente, SolicitudFacturacion,
)
from .serializers import (
    EmpresaClienteSerializer, EmpresaClienteListSerializer,
    ContactoClienteSerializer, ServicioContratadoSerializer,
    AsignacionEquipoSerializer, BitacoraClienteSerializer,
    SolicitudFacturacionSerializer,
)


class EmpresaClienteViewSet(viewsets.ModelViewSet):
    queryset = EmpresaCliente.objects.all()

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

    @action(detail=False, methods=['post'])
    def from_sqf(self, request):
        """
        Recibe datos de un cliente registrado en FormulariosSQF y hace upsert
        en EmpresaCliente + ContactoCliente. Idempotente por NIT.
        """
        d = request.data
        nit = str(d.get('document') or d.get('nit') or '').strip()
        razon_social = str(d.get('name') or d.get('razon_social') or '').strip()

        if not nit or not razon_social:
            return Response(
                {'error': 'Se requieren los campos document/nit y name/razon_social.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        sqf_id = str(d.get('id') or '').strip() or None
        tipo_cliente = str(d.get('clientType') or '').strip() or None
        grupo_economico = str(d.get('economicGroup') or '').strip() or None

        empresa, created = EmpresaCliente.objects.get_or_create(
            nit=nit,
            defaults={
                'razon_social':    razon_social,
                'tipo_cliente':    tipo_cliente,
                'grupo_economico': grupo_economico,
                'direccion':       str(d.get('address') or '').strip() or None,
                'telefono':        str(d.get('phone') or '').strip() or None,
                'email_principal': str(d.get('email') or '').strip() or None,
                'sqf_id':          sqf_id,
                'sqf_status':      'pendiente',
                'estado':          'prospecto',
            }
        )

        if not created:
            # Actualiza campos que puedan estar vacíos pero no sobreescribe los que ya existen
            updates = {}
            if sqf_id and not empresa.sqf_id:
                updates['sqf_id'] = sqf_id
            if tipo_cliente and not empresa.tipo_cliente:
                updates['tipo_cliente'] = tipo_cliente
            if grupo_economico and not empresa.grupo_economico:
                updates['grupo_economico'] = grupo_economico
            if not empresa.sqf_status:
                updates['sqf_status'] = 'pendiente'
            if updates:
                EmpresaCliente.objects.filter(pk=empresa.pk).update(**updates)
                empresa.refresh_from_db()

        contact_name = str(d.get('contactName') or '').strip()
        contact_role = str(d.get('contactRole') or '').strip()
        if contact_name:
            ContactoCliente.objects.get_or_create(
                empresa=empresa,
                nombre=contact_name,
                defaults={
                    'cargo': 'otro',
                    'notas': contact_role,
                    'email':    str(d.get('email') or '').strip() or None,
                    'telefono': str(d.get('phone') or '').strip() or None,
                    'es_principal': True,
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

    @action(detail=False, methods=['post'])
    def from_sqf(self, request):
        """
        Recibe datos de un contrato registrado en FormulariosSQF y crea
        un ServicioContratado. Idempotente por sqf_id.
        """
        d = request.data
        sqf_id = str(d.get('id') or '').strip()
        if not sqf_id:
            return Response({'error': 'Se requiere el campo id (CTR-XXX).'}, status=status.HTTP_400_BAD_REQUEST)

        if ServicioContratado.objects.filter(sqf_id=sqf_id).exists():
            servicio = ServicioContratado.objects.get(sqf_id=sqf_id)
            return Response(
                {'created': False, 'servicio': ServicioContratadoSerializer(servicio).data},
                status=status.HTTP_200_OK
            )

        # Buscar empresa por clientId (nit) o clientName
        client_nit = str(d.get('clientId') or d.get('nit') or '').strip()
        empresa = None
        if client_nit:
            empresa = EmpresaCliente.objects.filter(
                Q(nit=client_nit) | Q(sqf_id=client_nit)
            ).first()

        contract_type = str(d.get('contractType') or '').lower()
        if 'mensual' in contract_type:
            tipo_contrato = 'mensual'
            periodicidad = 'mensual'
        elif 'proyecto' in contract_type:
            tipo_contrato = 'proyecto'
            periodicidad = 'unico'
        else:
            tipo_contrato = 'otro'
            periodicidad = 'mensual'

        raw_value = str(d.get('value') or '0').replace('.', '').replace(',', '').replace('$', '').strip()
        try:
            valor = float(raw_value) if raw_value else None
        except ValueError:
            valor = None

        start_date = str(d.get('startDate') or d.get('fecha_inicio') or '').strip()
        if not start_date:
            from datetime import date
            start_date = date.today().isoformat()

        servicio = ServicioContratado.objects.create(
            empresa=empresa,
            sqf_id=sqf_id,
            sqf_status='pendiente',
            nombre=str(d.get('name') or '').strip() or None,
            responsable=str(d.get('manager') or '').strip() or None,
            tipo_contrato=tipo_contrato,
            grupo_economico=str(d.get('economicGroup') or '').strip() or None,
            descripcion=str(d.get('service') or '').strip() or None,
            roles_json=str(d.get('roles') or '').strip() or None,
            fecha_inicio=start_date,
            fecha_fin=str(d.get('endDate') or '').strip() or None,
            valor_mensual=valor,
            periodicidad=periodicidad,
            estado='activo',
            notas=str(d.get('notes') or '').strip() or None,
        )

        return Response(
            {'created': True, 'servicio': ServicioContratadoSerializer(servicio).data},
            status=status.HTTP_201_CREATED
        )


class AsignacionEquipoViewSet(viewsets.ModelViewSet):
    queryset = AsignacionEquipo.objects.select_related('empleado__persona', 'empleado__cargo').all()
    serializer_class = AsignacionEquipoSerializer

    def create(self, request, *args, **kwargs):
        empresa_id  = request.data.get('empresa')
        area_id     = request.data.get('area')
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
        Idempotente por sqf_id.
        """
        d = request.data
        sqf_id = str(d.get('id') or '').strip()
        if not sqf_id:
            return Response({'error': 'Se requiere el campo id (BIL-XXX).'}, status=status.HTTP_400_BAD_REQUEST)

        if SolicitudFacturacion.objects.filter(sqf_id=sqf_id).exists():
            sol = SolicitudFacturacion.objects.get(sqf_id=sqf_id)
            return Response(
                {'created': False, 'solicitud': SolicitudFacturacionSerializer(sol).data},
                status=status.HTTP_200_OK
            )

        nit = str(d.get('nit') or d.get('clientDocument') or d.get('documento') or '').strip()
        empresa = EmpresaCliente.objects.filter(nit=nit).first() if nit else None

        def _int(val):
            try:
                return int(str(val or '0').replace('.', '').replace(',', '').replace('$', '').strip() or '0')
            except (ValueError, TypeError):
                return 0

        sol = SolicitudFacturacion.objects.create(
            sqf_id=sqf_id,
            empresa=empresa,
            nit=nit or None,
            client_name=str(d.get('clientName') or '').strip(),
            company=str(d.get('company') or '').strip() or None,
            billing_type=str(d.get('billingType') or '').strip() or None,
            billing_client_type=str(d.get('billingClientType') or d.get('billing_client_type') or '').strip() or None,
            billing_modality=str(d.get('billingModality') or d.get('billing_modality') or '').strip() or None,
            sale_type=str(d.get('saleType') or d.get('sale_type') or '').strip() or None,
            cross_sale_person=str(d.get('crossSalePerson') or d.get('cross_sale_person') or '').strip() or None,
            service_type=str(d.get('serviceType') or d.get('service_type') or '').strip() or None,
            valor_mes=_int(d.get('valorMes') or d.get('valor_mes')),
            valor_proyecto=_int(d.get('valorProyecto') or d.get('valor_proyecto')),
            origin=str(d.get('origin') or '').strip() or None,
            origin_ref=str(d.get('originRef') or d.get('origin_ref') or '').strip() or None,
            closer=str(d.get('closer') or '').strip() or None,
            mes_tipo=str(d.get('mes_tipo') or d.get('mesCorrienteOVencido') or '').strip() or None,
            areas_json=str(d.get('areas') or '').strip() or None,
            items_json=str(d.get('items_json') or d.get('items') or '').strip() or None,
            status='pendiente',
            solicitante_nombre=str(d.get('solicitante_nombre') or '').strip() or None,
            solicitante_id=str(d.get('solicitante_id') or '').strip() or None,
        )

        return Response(
            {'created': True, 'solicitud': SolicitudFacturacionSerializer(sol).data},
            status=status.HTTP_201_CREATED
        )
