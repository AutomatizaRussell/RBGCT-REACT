import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('formacion', '0002_cursocontenido_modulo'),
    ]

    operations = [
        # 1. Crear la tabla curso_modulo
        migrations.CreateModel(
            name='CursoModulo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=200)),
                ('orden', models.IntegerField(default=0)),
                ('curso', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='modulos',
                    to='formacion.curso',
                )),
            ],
            options={
                'db_table': '"formacion"."curso_modulo"',
                'ordering': ['orden'],
            },
        ),
        # 2. Eliminar el CharField anterior (columna modulo varchar)
        migrations.RemoveField(
            model_name='cursocontenido',
            name='modulo',
        ),
        # 3. Agregar la FK nullable (columna modulo_id integer)
        migrations.AddField(
            model_name='cursocontenido',
            name='modulo',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='contenidos',
                to='formacion.cursomodulo',
            ),
        ),
    ]
