from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_superadmin_fecha_ingreso'),
    ]

    operations = [
        migrations.CreateModel(
            name='N8nLog',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('workflow_name', models.CharField(max_length=255)),
                ('status', models.CharField(choices=[('SUCCESS', 'Exitoso'), ('ERROR', 'Error')], max_length=20)),
                ('message', models.TextField(blank=True, null=True)),
                ('destinatario', models.EmailField(blank=True, max_length=255, null=True)),
                ('tipo_evento', models.CharField(blank=True, max_length=100, null=True)),
                ('response_data', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'n8n_log',
                'managed': True,
                'ordering': ['-created_at'],
            },
        ),
    ]
