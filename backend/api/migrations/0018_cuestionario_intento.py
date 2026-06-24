from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0017_curso_progreso'),
    ]

    operations = [
        migrations.CreateModel(
            name='CuestionarioIntento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('respuestas', models.JSONField(default=dict)),
                ('puntaje', models.FloatField()),
                ('aprobado', models.BooleanField()),
                ('num_intento', models.PositiveIntegerField(default=1)),
                ('tiempo_segundos', models.PositiveIntegerField(blank=True, null=True)),
                ('fecha_intento', models.DateTimeField(auto_now_add=True)),
                ('contenido', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='intentos', to='api.cursocontenido')),
                ('curso', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='intentos_cuestionarios', to='api.curso')),
                ('empleado', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='intentos_cuestionarios', to='api.datosempleado')),
            ],
            options={
                'db_table': 'cuestionario_intento',
                'ordering': ['-fecha_intento'],
            },
        ),
    ]
