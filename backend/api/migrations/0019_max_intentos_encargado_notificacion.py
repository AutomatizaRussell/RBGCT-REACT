from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0018_cuestionario_intento'),
    ]

    operations = [
        # max_intentos en CursoContenido
        migrations.AddField(
            model_name='cursocontenido',
            name='max_intentos',
            field=models.PositiveIntegerField(default=0),
        ),
        # es_encargado_cursos en DatosEmpleado
        migrations.AddField(
            model_name='datosempleado',
            name='es_encargado_cursos',
            field=models.BooleanField(default=False),
        ),
        # Modelo NotificacionCurso
        migrations.CreateModel(
            name='NotificacionCurso',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('leida', models.BooleanField(default=False)),
                ('fecha', models.DateTimeField(auto_now_add=True)),
                ('curso', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notificaciones', to='api.curso')),
                ('destinatario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notificaciones_cursos', to='api.datosempleado')),
                ('empleado', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cursos_completados_notif', to='api.datosempleado')),
            ],
            options={
                'db_table': 'notificacion_curso',
                'ordering': ['-fecha'],
                'unique_together': {('destinatario', 'empleado', 'curso')},
            },
        ),
    ]
