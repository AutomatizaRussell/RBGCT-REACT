from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0016_movimiento_laboral'),
    ]

    operations = [
        migrations.CreateModel(
            name='CursoProgreso',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_completado', models.DateTimeField(auto_now_add=True)),
                ('contenido', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='progresos', to='api.cursocontenido')),
                ('curso', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='progresos', to='api.curso')),
                ('empleado', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='progresos_cursos', to='api.datosempleado')),
            ],
            options={
                'db_table': 'curso_progreso',
                'ordering': ['-fecha_completado'],
                'unique_together': {('empleado', 'contenido')},
            },
        ),
    ]
