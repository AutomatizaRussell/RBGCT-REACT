from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_seed_entidades_ss'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='superadmin',
            index=models.Index(fields=['last_login'], name='superadmin_last_login_idx'),
        ),
        migrations.AddIndex(
            model_name='datosempleado',
            index=models.Index(fields=['estado', 'ultima_actividad'], name='emp_estado_act_idx'),
        ),
        migrations.AddIndex(
            model_name='datosempleado',
            index=models.Index(fields=['ultima_actividad'], name='emp_ult_act_idx'),
        ),
        migrations.AddIndex(
            model_name='datosempleado',
            index=models.Index(fields=['estado'], name='emp_estado_idx'),
        ),
        migrations.AddIndex(
            model_name='alerta',
            index=models.Index(fields=['tipo', 'fecha_creacion'], name='alerta_tipo_fecha_idx'),
        ),
        migrations.AddIndex(
            model_name='alerta',
            index=models.Index(fields=['estado_alerta', 'fecha_creacion'], name='alerta_estado_fecha_idx'),
        ),
        migrations.AddIndex(
            model_name='alerta',
            index=models.Index(fields=['email_solicitante'], name='alerta_email_idx'),
        ),
    ]
