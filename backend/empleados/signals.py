from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone


@receiver(pre_save, sender='empleados.DatosEmpleado')
def _capturar_prev_empleado(sender, instance, **kwargs):
    if instance.pk:
        try:
            from empleados.models import DatosEmpleado
            prev = DatosEmpleado.objects.get(pk=instance.pk)
            instance._prev_area_id  = prev.area_id
            instance._prev_cargo_id = prev.cargo_id
            instance._prev_estado   = prev.estado
            instance._prev_permisos = prev.id_permisos
        except Exception:
            instance._prev_area_id = instance._prev_cargo_id = None
            instance._prev_estado = instance._prev_permisos = None
    else:
        instance._prev_area_id = instance._prev_cargo_id = None
        instance._prev_estado = instance._prev_permisos = None


@receiver(post_save, sender='empleados.DatosEmpleado')
def _registrar_movimiento_empleado(sender, instance, created, **kwargs):
    from empleados.models import DatosArea, DatosCargo, MovimientoLaboral
    hoy = timezone.now().date()

    if created:
        MovimientoLaboral.objects.create(
            empleado=instance,
            tipo='INGRESO',
            campo='ingreso',
            valor_anterior=None,
            valor_nuevo=str(instance.fecha_ingreso or hoy),
            fecha_movimiento=instance.fecha_ingreso or hoy,
            observaciones='Ingreso al sistema',
        )
        return

    prev_area_id  = getattr(instance, '_prev_area_id',  None)
    prev_cargo_id = getattr(instance, '_prev_cargo_id', None)
    prev_estado   = getattr(instance, '_prev_estado',   None)
    prev_permisos = getattr(instance, '_prev_permisos', None)

    if prev_area_id is not None and prev_area_id != instance.area_id:
        anterior = DatosArea.objects.filter(pk=prev_area_id).values_list('nombre_area', flat=True).first() or str(prev_area_id)
        nuevo    = DatosArea.objects.filter(pk=instance.area_id).values_list('nombre_area', flat=True).first() or 'Sin área'
        MovimientoLaboral.objects.create(
            empleado=instance, tipo='TRASLADO', campo='area',
            valor_anterior=anterior, valor_nuevo=nuevo, fecha_movimiento=hoy,
        )

    if prev_cargo_id is not None and prev_cargo_id != instance.cargo_id:
        anterior = DatosCargo.objects.filter(pk=prev_cargo_id).values_list('nombre_cargo', flat=True).first() or str(prev_cargo_id)
        nuevo    = DatosCargo.objects.filter(pk=instance.cargo_id).values_list('nombre_cargo', flat=True).first() or 'Sin cargo'
        MovimientoLaboral.objects.create(
            empleado=instance, tipo='CAMBIO_CARGO', campo='cargo',
            valor_anterior=anterior, valor_nuevo=nuevo, fecha_movimiento=hoy,
        )

    if prev_estado is not None and prev_estado != instance.estado:
        tipo = 'RETIRO' if instance.estado == 'INACTIVO' else 'REINTEGRO'
        MovimientoLaboral.objects.create(
            empleado=instance, tipo=tipo, campo='estado',
            valor_anterior=prev_estado, valor_nuevo=instance.estado, fecha_movimiento=hoy,
        )

    if prev_permisos is not None and prev_permisos != instance.id_permisos:
        permisos_map = {1: 'Administrador', 2: 'Editor', 3: 'Usuario'}
        anterior = permisos_map.get(prev_permisos, str(prev_permisos))
        nuevo    = permisos_map.get(instance.id_permisos, str(instance.id_permisos))
        tipo     = 'ASCENSO' if instance.id_permisos < prev_permisos else 'DEGRADACION'
        MovimientoLaboral.objects.create(
            empleado=instance, tipo=tipo, campo='id_permisos',
            valor_anterior=anterior, valor_nuevo=nuevo, fecha_movimiento=hoy,
        )
