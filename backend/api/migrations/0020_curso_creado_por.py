from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0019_max_intentos_encargado_notificacion'),
    ]

    operations = [
        migrations.AddField(
            model_name='curso',
            name='creado_por',
            field=models.ForeignKey(
                blank=True,
                db_column='creado_por_id',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='cursos_creados',
                to='api.datosempleado',
            ),
        ),
    ]
