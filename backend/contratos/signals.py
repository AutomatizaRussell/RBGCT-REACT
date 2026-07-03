from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone


@receiver(pre_save, sender='contratos.Contrato')
def _capturar_prev_contrato(sender, instance, **kwargs):
    if instance.pk:
        try:
            from contratos.models import Contrato
            prev = Contrato.objects.get(pk=instance.pk)
            instance._prev_salario       = prev.salario
            instance._prev_modalidad     = prev.modalidad
            instance._prev_tipo_contrato = prev.tipo_contrato
        except Exception:
            instance._prev_salario = instance._prev_modalidad = instance._prev_tipo_contrato = None
    else:
        instance._prev_salario = instance._prev_modalidad = instance._prev_tipo_contrato = None


@receiver(post_save, sender='contratos.Contrato')
def _registrar_movimiento_contrato(sender, instance, created, **kwargs):
    from empleados.models import MovimientoLaboral
    hoy = timezone.now().date()

    if created:
        MovimientoLaboral.objects.create(
            empleado=instance.empleado,
            tipo='NUEVO_CONTRATO',
            campo='contrato',
            valor_anterior=None,
            valor_nuevo=instance.get_tipo_contrato_display(),
            fecha_movimiento=instance.fecha_inicio or hoy,
            observaciones=f'Salario: ${instance.salario:,.0f} | {instance.get_modalidad_display()}',
        )
        return

    prev_salario       = getattr(instance, '_prev_salario',       None)
    prev_modalidad     = getattr(instance, '_prev_modalidad',     None)
    prev_tipo_contrato = getattr(instance, '_prev_tipo_contrato', None)

    if prev_salario is not None and prev_salario != instance.salario:
        MovimientoLaboral.objects.create(
            empleado=instance.empleado, tipo='AJUSTE_SALARIAL', campo='salario',
            valor_anterior=f'${prev_salario:,.0f}', valor_nuevo=f'${instance.salario:,.0f}',
            fecha_movimiento=hoy,
        )

    if prev_modalidad is not None and prev_modalidad != instance.modalidad:
        MovimientoLaboral.objects.create(
            empleado=instance.empleado, tipo='CAMBIO_MODALIDAD', campo='modalidad',
            valor_anterior=prev_modalidad, valor_nuevo=instance.modalidad,
            fecha_movimiento=hoy,
        )

    if prev_tipo_contrato is not None and prev_tipo_contrato != instance.tipo_contrato:
        MovimientoLaboral.objects.create(
            empleado=instance.empleado, tipo='CAMBIO_CONTRATO', campo='tipo_contrato',
            valor_anterior=prev_tipo_contrato, valor_nuevo=instance.tipo_contrato,
            fecha_movimiento=hoy,
        )


@receiver(post_save, sender='contratos.ContratoRenovacion')
def _registrar_renovacion(sender, instance, created, **kwargs):
    if not created:
        return
    from empleados.models import MovimientoLaboral
    hoy = timezone.now().date()
    obs = f'Nuevo salario: ${instance.nuevo_salario:,.0f}' if instance.nuevo_salario else None
    MovimientoLaboral.objects.create(
        empleado=instance.contrato.empleado,
        tipo='RENOVACION',
        campo='contrato',
        valor_anterior=str(instance.contrato.fecha_fin) if instance.contrato.fecha_fin else None,
        valor_nuevo=str(instance.nueva_fecha_fin) if instance.nueva_fecha_fin else None,
        fecha_movimiento=instance.fecha_renovacion or hoy,
        observaciones=obs,
    )
