"""
ViewSets del módulo de contratos y seguridad social.
"""
import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import (
    EntidadEPS, EntidadAFP, EntidadARL, CajaCompensacion,
    Contrato, AfiliacionSeguridadSocial, ContratoRenovacion,
)
from ..serializers import (
    EntidadEPSSerializer, EntidadAFPSerializer, EntidadARLSerializer, CajaCompensacionSerializer,
    ContratoSerializer, AfiliacionSeguridadSocialSerializer, ContratoRenovacionSerializer,
)

logger = logging.getLogger(__name__)


class EntidadEPSViewSet(viewsets.ModelViewSet):
    queryset = EntidadEPS.objects.all().order_by('nombre')
    serializer_class = EntidadEPSSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('activas') == 'true':
            qs = qs.filter(activa=True)
        return qs


class EntidadAFPViewSet(viewsets.ModelViewSet):
    queryset = EntidadAFP.objects.all().order_by('nombre')
    serializer_class = EntidadAFPSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('activas') == 'true':
            qs = qs.filter(activa=True)
        return qs


class EntidadARLViewSet(viewsets.ModelViewSet):
    queryset = EntidadARL.objects.all().order_by('nombre')
    serializer_class = EntidadARLSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('activas') == 'true':
            qs = qs.filter(activa=True)
        return qs


class CajaCompensacionViewSet(viewsets.ModelViewSet):
    queryset = CajaCompensacion.objects.all().order_by('nombre')
    serializer_class = CajaCompensacionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('activas') == 'true':
            qs = qs.filter(activa=True)
        return qs


class ContratoViewSet(viewsets.ModelViewSet):
    serializer_class = ContratoSerializer
    queryset = Contrato.objects.select_related(
        'empleado__persona', 'empleado__area', 'empleado__cargo'
    ).prefetch_related('renovaciones').order_by('-created_at')

    def get_queryset(self):
        qs = super().get_queryset()
        empleado_id = self.request.query_params.get('empleado_id')
        estado      = self.request.query_params.get('estado')
        tipo        = self.request.query_params.get('tipo_contrato')
        if empleado_id:
            qs = qs.filter(empleado_id=empleado_id)
        if estado:
            qs = qs.filter(estado=estado)
        if tipo:
            qs = qs.filter(tipo_contrato=tipo)
        return qs

    @action(detail=False, methods=['get'], url_path='activo/(?P<empleado_id>[0-9]+)')
    def activo(self, request, empleado_id=None):
        """Devuelve el contrato ACTIVO del empleado, o 204 si no tiene."""
        try:
            contrato = Contrato.objects.select_related(
                'empleado__persona', 'empleado__area', 'empleado__cargo'
            ).prefetch_related('renovaciones').get(empleado_id=empleado_id, estado='ACTIVO')
            return Response(self.get_serializer(contrato).data)
        except Contrato.DoesNotExist:
            return Response(None, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='terminar')
    def terminar(self, request, pk=None):
        """Marca el contrato como TERMINADO."""
        contrato = self.get_object()
        if contrato.estado != 'ACTIVO':
            return Response({'error': 'Solo se puede terminar un contrato ACTIVO'}, status=status.HTTP_400_BAD_REQUEST)
        contrato.estado = 'TERMINADO'
        contrato.motivo_terminacion = request.data.get('motivo_terminacion')
        contrato.fecha_terminacion  = request.data.get('fecha_terminacion')
        contrato.observaciones      = request.data.get('observaciones', contrato.observaciones)
        contrato.save()
        return Response(self.get_serializer(contrato).data)

    @action(detail=True, methods=['post'], url_path='renovar')
    def renovar(self, request, pk=None):
        """Registra una renovación y extiende la fecha de vencimiento."""
        contrato = self.get_object()
        if contrato.estado != 'ACTIVO':
            return Response({'error': 'Solo se puede renovar un contrato ACTIVO'}, status=status.HTTP_400_BAD_REQUEST)
        if contrato.tipo_contrato not in ('termino_fijo', 'obra_labor'):
            return Response({'error': 'Solo los contratos a término fijo u obra/labor se renuevan'}, status=status.HTTP_400_BAD_REQUEST)

        nueva_fecha_fin = request.data.get('nueva_fecha_fin')
        nuevo_salario   = request.data.get('nuevo_salario')

        renovacion = ContratoRenovacion.objects.create(
            contrato=contrato,
            fecha_renovacion=request.data.get('fecha_renovacion'),
            nueva_fecha_fin=nueva_fecha_fin,
            nuevo_salario=nuevo_salario,
            observaciones=request.data.get('observaciones'),
        )
        if nueva_fecha_fin:
            contrato.fecha_fin = nueva_fecha_fin
        if nuevo_salario:
            contrato.salario = nuevo_salario
        contrato.save(update_fields=['fecha_fin', 'salario', 'updated_at'])

        serializer = ContratoRenovacionSerializer(renovacion, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AfiliacionSeguridadSocialViewSet(viewsets.ModelViewSet):
    serializer_class = AfiliacionSeguridadSocialSerializer
    queryset = AfiliacionSeguridadSocial.objects.select_related(
        'empleado__persona', 'eps', 'afp', 'arl', 'caja_compensacion'
    )

    def get_queryset(self):
        qs = super().get_queryset()
        empleado_id = self.request.query_params.get('empleado_id')
        if empleado_id:
            qs = qs.filter(empleado_id=empleado_id)
        return qs

    @action(detail=False, methods=['get'], url_path='empleado/(?P<empleado_id>[0-9]+)')
    def por_empleado(self, request, empleado_id=None):
        """Devuelve la afiliación del empleado o 204 si no tiene."""
        try:
            afiliacion = AfiliacionSeguridadSocial.objects.select_related(
                'empleado__persona', 'eps', 'afp', 'arl', 'caja_compensacion'
            ).get(empleado_id=empleado_id)
            return Response(self.get_serializer(afiliacion).data)
        except AfiliacionSeguridadSocial.DoesNotExist:
            return Response(None, status=status.HTTP_204_NO_CONTENT)


class ContratoRenovacionViewSet(viewsets.ModelViewSet):
    serializer_class = ContratoRenovacionSerializer
    queryset = ContratoRenovacion.objects.all().order_by('-fecha_renovacion')

    def get_queryset(self):
        qs = super().get_queryset()
        contrato_id = self.request.query_params.get('contrato_id')
        if contrato_id:
            qs = qs.filter(contrato_id=contrato_id)
        return qs
