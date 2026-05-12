from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_seed_entidades_ss'),
        ('clientes', '0001_initial'),
    ]

    operations = [
        # Remove old constraint (empresa+empleado+servicio) from both state and DB.
        # SeparateDatabaseAndState is required because Django can't schema-qualify the
        # DROP INDEX for partial indexes in a custom PostgreSQL schema.
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveConstraint(
                    model_name='asignacionequipo',
                    name='unique_asignacion_activa',
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql='DROP INDEX IF EXISTS clientes.unique_asignacion_activa;',
                    reverse_sql='',
                ),
            ],
        ),
        migrations.AddField(
            model_name='asignacionequipo',
            name='area',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='asignaciones_clientes',
                to='api.datosarea',
            ),
        ),
        migrations.AlterField(
            model_name='asignacionequipo',
            name='servicio',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='equipo',
                to='clientes.serviciocontratado',
            ),
        ),
        # Add new constraint (empresa + area + empleado).
        migrations.AddConstraint(
            model_name='asignacionequipo',
            constraint=models.UniqueConstraint(
                condition=models.Q(('activo', True)),
                fields=('empresa', 'area', 'empleado'),
                name='unique_asignacion_activa',
            ),
        ),
    ]
