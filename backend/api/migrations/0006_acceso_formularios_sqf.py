from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_performance_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='datosempleado',
            name='acceso_formularios_sqf',
            field=models.BooleanField(default=False),
        ),
    ]
