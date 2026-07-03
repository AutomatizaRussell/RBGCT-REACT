"""
ViewSets de Onboarding: PlanOnboarding, PasoOnboarding, AsignacionOnboarding.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.db.models import Q
from ..models import PlanOnboarding, PasoOnboarding, Curso, AsignacionOnboarding, DatosEmpleado
from ..serializers import PlanOnboardingSerializer, PasoOnboardingSerializer, AsignacionOnboardingSerializer
from ..permissions import IsAdminOrSuperAdmin
from ._utils import _es_empleado, _es_superadmin


class PlanOnboardingViewSet(viewsets.ModelViewSet):
    queryset = PlanOnboarding.objects.all()
    serializer_class = PlanOnboardingSerializer

    def get_permissions(self):
        write_actions = {'create', 'update', 'partial_update', 'destroy',
                         'agregar_paso', 'eliminar_paso', 'reordenar_pasos',
                         'toggle_asignacion', 'batch_asignar'}
        if self.action in write_actions:
            return [IsAdminOrSuperAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = PlanOnboarding.objects.prefetch_related('pasos__curso').select_related('area', 'creado_por')
        activo = self.request.query_params.get('activo')
        if activo is not None:
            qs = qs.filter(activo=activo.lower() in ('true', '1'))
        area_id = self.request.query_params.get('area')
        if area_id:
            qs = qs.filter(area_id=area_id)
        return qs

    def perform_create(self, serializer):
        creado_por = self.request.user if _es_empleado(self.request.user) else None
        serializer.save(creado_por=creado_por)

    # ── Pasos ──────────────────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='pasos')
    def agregar_paso(self, request, pk=None):
        plan = self.get_object()
        curso_id    = request.data.get('curso_id')
        dias_limite = request.data.get('dias_limite', None)

        if not curso_id:
            return Response({'error': 'curso_id es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            curso = Curso.objects.get(pk=curso_id)
        except Curso.DoesNotExist:
            return Response({'error': 'Curso no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        max_orden = plan.pasos.aggregate(__max=__import__('django.db.models', fromlist=['Max']).Max('orden'))['__max']
        orden = (max_orden or -1) + 1

        paso, created = PasoOnboarding.objects.get_or_create(
            plan=plan, curso=curso,
            defaults={'orden': orden, 'dias_limite': dias_limite},
        )
        if not created:
            return Response({'error': 'Este curso ya está en el plan'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(PlanOnboardingSerializer(plan).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='pasos/(?P<paso_id>[0-9]+)')
    def eliminar_paso(self, request, pk=None, paso_id=None):
        plan = self.get_object()
        try:
            paso = PasoOnboarding.objects.get(pk=paso_id, plan=plan)
        except PasoOnboarding.DoesNotExist:
            return Response({'error': 'Paso no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        paso.delete()
        return Response(PlanOnboardingSerializer(plan).data)

    @action(detail=True, methods=['post'], url_path='reordenar')
    def reordenar_pasos(self, request, pk=None):
        plan  = self.get_object()
        items = request.data.get('pasos', [])
        for item in items:
            PasoOnboarding.objects.filter(pk=item['id'], plan=plan).update(orden=item['orden'])
        return Response(PlanOnboardingSerializer(plan).data)

    # ── Asignaciones de empleados ──────────────────────────────────────────────

    @action(detail=False, methods=['get'], url_path='resumen-area')
    def resumen_area(self, request):
        """Devuelve planes activos del área (por área o por nivel de cargo de los empleados del área)."""
        area_id = request.query_params.get('area_id')
        if not area_id:
            return Response({'error': 'area_id requerido'}, status=status.HTTP_400_BAD_REQUEST)

        # Niveles de cargo presentes en el área (misma lógica que CursoViewSet)
        from ..views.empleados import _nivel_cargo as _nc
        from ..models import DatosCargo
        empleados_area = DatosEmpleado.objects.filter(area_id=area_id, estado='ACTIVA').select_related()
        niveles_presentes = set()
        for emp in empleados_area:
            try:
                cargo_nombre = DatosCargo.objects.filter(pk=emp.cargo_id).values_list('nombre_cargo', flat=True).first() or ''
                nivel = _nc(cargo_nombre)
                if nivel != 99:
                    niveles_presentes.add(nivel)
            except Exception:
                pass

        planes = PlanOnboarding.objects.filter(
            activo=True
        ).filter(
            Q(area_id=area_id) | Q(nivel_cargo__in=niveles_presentes)
        ).distinct()

        plan_ids = list(planes.values_list('id', flat=True))

        asignaciones_qs = AsignacionOnboarding.objects.filter(plan_id__in=plan_ids)

        # mapa: { empleado_id: [plan_id, ...] }
        asignaciones = {}
        for a in asignaciones_qs:
            emp_id = str(a.empleado_id)
            asignaciones.setdefault(emp_id, [])
            asignaciones[emp_id].append(a.plan_id)

        return Response({
            'planes':       PlanOnboardingSerializer(planes, many=True).data,
            'asignaciones': asignaciones,
        })

    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle_asignacion(self, request):
        """Asigna o quita un plan de onboarding a un empleado."""
        empleado_id = request.data.get('empleado_id')
        plan_id     = request.data.get('plan_id')

        if not empleado_id or not plan_id:
            return Response({'error': 'empleado_id y plan_id requeridos'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            empleado = DatosEmpleado.objects.get(pk=empleado_id)
            plan     = PlanOnboarding.objects.get(pk=plan_id)
        except (DatosEmpleado.DoesNotExist, PlanOnboarding.DoesNotExist):
            return Response({'error': 'Empleado o plan no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        asignado_por = request.user if _es_empleado(request.user) else None
        obj, created = AsignacionOnboarding.objects.get_or_create(
            empleado=empleado, plan=plan,
            defaults={'asignado_por': asignado_por},
        )
        if not created:
            obj.delete()
            return Response({'accion': 'removido'})
        return Response({'accion': 'asignado'})

    @action(detail=False, methods=['get'], url_path='mis-planes')
    def mis_planes(self, request):
        """Planes de onboarding asignados al empleado autenticado."""
        if not _es_empleado(request.user):
            return Response([])
        asignaciones = AsignacionOnboarding.objects.filter(
            empleado=request.user, plan__activo=True
        ).select_related('plan').prefetch_related('plan__pasos__curso')
        planes = [a.plan for a in asignaciones]
        return Response(PlanOnboardingSerializer(planes, many=True).data)

    @action(detail=False, methods=['post'], url_path='batch-asignar')
    def batch_asignar(self, request):
        """Asigna un plan a múltiples empleados de una vez."""
        plan_id     = request.data.get('plan_id')
        empleado_ids = request.data.get('empleado_ids', [])

        if not plan_id or not empleado_ids:
            return Response({'error': 'plan_id y empleado_ids requeridos'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan = PlanOnboarding.objects.get(pk=plan_id)
        except PlanOnboarding.DoesNotExist:
            return Response({'error': 'Plan no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        asignado_por = request.user if _es_empleado(request.user) else None

        # Si el plan tiene nivel_cargo, importar la función de nivel para filtrar
        nivel_plan = plan.nivel_cargo
        if nivel_plan is not None:
            from ..views.empleados import _nivel_cargo as _nc
            from ..models import DatosCargo

        creados = 0
        for emp_id in empleado_ids:
            try:
                empleado = DatosEmpleado.objects.get(pk=emp_id)
                # Validar nivel de cargo si el plan lo requiere
                if nivel_plan is not None:
                    try:
                        cargo_nombre = DatosCargo.objects.filter(pk=empleado.cargo_id).values_list('nombre_cargo', flat=True).first() or ''
                        if _nc(cargo_nombre) != nivel_plan:
                            continue
                    except Exception:
                        continue
                _, created = AsignacionOnboarding.objects.get_or_create(
                    empleado=empleado, plan=plan,
                    defaults={'asignado_por': asignado_por},
                )
                if created:
                    creados += 1
            except DatosEmpleado.DoesNotExist:
                continue

        return Response({'asignados': creados})
