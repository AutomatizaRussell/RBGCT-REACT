"""
ViewSet de tareas del calendario.
"""
import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count

from ..models import TareasCalendario, DatosEmpleado
from ..serializers import TareasCalendarioSerializer

from ._utils import _es_superadmin, _es_empleado

logger = logging.getLogger(__name__)


class TareasCalendarioViewSet(viewsets.ModelViewSet):
    queryset = TareasCalendario.objects.select_related(
        'area', 'empleado__persona'
    ).order_by('fecha_vencimiento')
    serializer_class = TareasCalendarioSerializer
    permission_classes = [IsAuthenticated]

    def _resolver_contexto_actor(self):
        user = self.request.user
        if _es_superadmin(user):
            return {
                'rol': 'superadmin',
                'puede_gestionar_todo': True,
                'empleado_id': None,
                'area_id': None,
            }

        if _es_empleado(user):
            permisos = int(getattr(user, 'id_permisos', 0) or 0)
            if permisos == 1:
                rol = 'admin'
            elif permisos == 2:
                rol = 'editor'
            else:
                rol = 'usuario'
            return {
                'rol': rol,
                'puede_gestionar_todo': permisos == 1,
                'empleado_id': getattr(user, 'id_empleado', None),
                'area_id': getattr(user, 'area_id', None),
            }

        return {
            'rol': 'desconocido',
            'puede_gestionar_todo': False,
            'empleado_id': None,
            'area_id': None,
        }

    def _queryset_base(self):
        return TareasCalendario.objects.select_related(
            'area', 'empleado__persona'
        ).order_by('fecha_vencimiento')

    def _filtrar_por_contexto(self, queryset, contexto):
        if not contexto['puede_gestionar_todo']:
            if contexto['rol'] == 'editor':
                if contexto['area_id']:
                    queryset = queryset.filter(
                        Q(area_id=contexto['area_id']) | Q(empleado_id=contexto['empleado_id'])
                    )
                else:
                    queryset = queryset.filter(empleado_id=contexto['empleado_id'])
            else:
                queryset = queryset.filter(empleado_id=contexto['empleado_id'])
        return queryset

    def get_queryset(self):
        contexto = self._resolver_contexto_actor()
        queryset = self._filtrar_por_contexto(self._queryset_base(), contexto)
        empleado_id = self.request.query_params.get('empleado_id')

        if empleado_id:
            try:
                queryset = queryset.filter(empleado_id=int(empleado_id))
            except (TypeError, ValueError):
                queryset = queryset.none()

        return queryset

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """
        Resumen de tareas por estado.
        Diseñado para dashboards sin traer todas las tareas.
        """
        contexto = self._resolver_contexto_actor()
        agregados = (
            self._filtrar_por_contexto(TareasCalendario.objects.all(), contexto)
            .values('estado')
            .annotate(total=Count('id'))
        )

        resumen = {
            'pendiente': 0,
            'en_proceso': 0,
            'completada': 0,
            'cancelada': 0,
            'total': 0,
            'filtro_aplicado': contexto['rol'],
        }

        for row in agregados:
            estado_nombre = row.get('estado')
            total = int(row.get('total') or 0)
            if estado_nombre in resumen:
                resumen[estado_nombre] = total
            resumen['total'] += total

        return Response(resumen)

    def create(self, request, *args, **kwargs):
        contexto = self._resolver_contexto_actor()
        area_id = request.data.get('area_id')
        empleado_id = request.data.get('empleado_id')

        if not area_id and not empleado_id:
            tipo = 'general'
        elif area_id and not empleado_id:
            tipo = 'area'
        else:
            tipo = 'personal'

        if contexto['rol'] == 'usuario':
            return Response(
                {'error': 'No tienes permisos para crear tareas'},
                status=status.HTTP_403_FORBIDDEN
            )

        if contexto['rol'] == 'editor':
            if tipo == 'general':
                return Response(
                    {'error': 'No tienes permisos para crear tareas generales'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if area_id:
                try:
                    area_id_int = int(area_id)
                except (TypeError, ValueError):
                    return Response({'error': 'area_id inválida'}, status=status.HTTP_400_BAD_REQUEST)
                if contexto['area_id'] and area_id_int != contexto['area_id']:
                    return Response(
                        {'error': 'Solo puedes crear tareas para tu área asignada'},
                        status=status.HTTP_403_FORBIDDEN
                    )

            if empleado_id:
                try:
                    empleado_id_int = int(empleado_id)
                except (TypeError, ValueError):
                    return Response({'error': 'empleado_id inválido'}, status=status.HTTP_400_BAD_REQUEST)
                empleado_destino = DatosEmpleado.objects.filter(id_empleado=empleado_id_int).first()
                if not empleado_destino:
                    return Response({'error': 'Empleado de destino no encontrado'}, status=status.HTTP_400_BAD_REQUEST)
                if contexto['area_id'] and empleado_destino.area_id != contexto['area_id']:
                    return Response(
                        {'error': 'Solo puedes asignar tareas a empleados de tu área'},
                        status=status.HTTP_403_FORBIDDEN
                    )

        data = request.data.copy()
        # Limpiar campos que el frontend envía pero no pertenecen al modelo
        for campo in ('user_role', 'user_id', 'user_area_id', 'asignado_a', 'creado_por', 'fecha_creacion'):
            data.pop(campo, None)
        request._full_data = data

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        """Auto-asigna creado_por desde el usuario autenticado."""
        user = self.request.user
        creado_por = None
        if _es_empleado(user):
            try:
                creado_por = DatosEmpleado.objects.get(id_empleado=user.id_empleado)
            except DatosEmpleado.DoesNotExist:
                pass
        serializer.save(creado_por=creado_por)

    def update(self, request, *args, **kwargs):
        """
        Compatibilidad y seguridad:
        - Usuarios normales solo pueden cambiar `estado` de sus tareas.
        - Si llega un PUT con solo `estado`, se procesa como parcial.
        """
        contexto = self._resolver_contexto_actor()
        incoming_fields = set(request.data.keys())

        if contexto['rol'] == 'usuario' and not incoming_fields.issubset({'estado'}):
            return Response(
                {'error': 'Solo puedes actualizar el estado de tus tareas'},
                status=status.HTTP_403_FORBIDDEN
            )

        if incoming_fields and incoming_fields.issubset({'estado'}):
            kwargs['partial'] = True

        return super().update(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def por_empleado(self, request):
        empleado_id = request.query_params.get('empleado_id')
        if not empleado_id:
            return Response({'error': 'empleado_id requerido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            empleado_id_int = int(empleado_id)
        except (TypeError, ValueError):
            return Response({'error': 'empleado_id inválido'}, status=status.HTTP_400_BAD_REQUEST)

        tareas = self.get_queryset().filter(empleado_id=empleado_id_int)
        serializer = self.get_serializer(tareas, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def por_rol(self, request):
        """
        Endpoint de compatibilidad. El filtro se aplica según el usuario autenticado.
        """
        contexto = self._resolver_contexto_actor()
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'tareas': serializer.data,
            'filtro_aplicado': contexto['rol'],
            'total': queryset.count()
        })
