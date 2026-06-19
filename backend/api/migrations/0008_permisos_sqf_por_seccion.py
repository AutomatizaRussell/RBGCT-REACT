from django.db import migrations, models


def copiar_acceso_general_a_secciones(apps, schema_editor):
    """Quien tenía acceso al formulario conserva acceso a las 4 secciones."""
    DatosEmpleado = apps.get_model('api', 'DatosEmpleado')
    DatosEmpleado.objects.filter(acceso_formularios_sqf=True).update(
        acceso_sqf_clientes=True,
        acceso_sqf_contratos=True,
        acceso_sqf_facturacion=True,
        acceso_sqf_auditoria=True,
    )


def revertir_secciones_a_acceso_general(apps, schema_editor):
    DatosEmpleado = apps.get_model('api', 'DatosEmpleado')
    DatosEmpleado.objects.filter(
        models.Q(acceso_sqf_clientes=True)
        | models.Q(acceso_sqf_contratos=True)
        | models.Q(acceso_sqf_facturacion=True)
        | models.Q(acceso_sqf_auditoria=True)
    ).update(acceso_formularios_sqf=True)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_reglamentoitem_archivo'),
    ]

    operations = [
        migrations.AddField(
            model_name='datosempleado',
            name='acceso_sqf_clientes',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='datosempleado',
            name='acceso_sqf_contratos',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='datosempleado',
            name='acceso_sqf_facturacion',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='datosempleado',
            name='acceso_sqf_auditoria',
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(
            copiar_acceso_general_a_secciones,
            revertir_secciones_a_acceso_general,
        ),
        migrations.RemoveField(
            model_name='datosempleado',
            name='acceso_formularios_sqf',
        ),
    ]
