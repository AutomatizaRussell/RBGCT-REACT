from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0002_delete_documentocliente'),
    ]

    operations = [
        # ── EmpresaCliente — nuevos campos SQF ──────────────────────────────
        migrations.AddField(
            model_name='empresacliente',
            name='tipo_cliente',
            field=models.CharField(
                blank=True, null=True, max_length=10,
                choices=[('juridica', 'Persona Jurídica'), ('natural', 'Persona Natural')],
            ),
        ),
        migrations.AddField(
            model_name='empresacliente',
            name='grupo_economico',
            field=models.CharField(blank=True, null=True, max_length=150),
        ),
        migrations.AddField(
            model_name='empresacliente',
            name='sqf_id',
            field=models.CharField(blank=True, null=True, max_length=30, unique=True),
        ),
        migrations.AddField(
            model_name='empresacliente',
            name='sqf_status',
            field=models.CharField(
                blank=True, null=True, max_length=15,
                choices=[('pendiente', 'Pendiente de revisión'), ('aprobado', 'Aprobado'), ('rechazado', 'Rechazado')],
            ),
        ),

        # ── ServicioContratado — nuevos campos SQF ──────────────────────────
        migrations.AddField(
            model_name='serviciocontratado',
            name='sqf_id',
            field=models.CharField(blank=True, null=True, max_length=30, unique=True),
        ),
        migrations.AddField(
            model_name='serviciocontratado',
            name='sqf_status',
            field=models.CharField(
                blank=True, null=True, max_length=15,
                choices=[('pendiente', 'Pendiente de revisión'), ('aprobado', 'Aprobado'), ('rechazado', 'Rechazado')],
            ),
        ),
        migrations.AddField(
            model_name='serviciocontratado',
            name='nombre',
            field=models.CharField(blank=True, null=True, max_length=255),
        ),
        migrations.AddField(
            model_name='serviciocontratado',
            name='responsable',
            field=models.CharField(blank=True, null=True, max_length=150),
        ),
        migrations.AddField(
            model_name='serviciocontratado',
            name='tipo_contrato',
            field=models.CharField(
                blank=True, null=True, max_length=15,
                choices=[('mensual', 'Fee Mensual'), ('proyecto', 'Proyecto'), ('otro', 'Otro')],
            ),
        ),
        migrations.AddField(
            model_name='serviciocontratado',
            name='grupo_economico',
            field=models.CharField(blank=True, null=True, max_length=150),
        ),
        migrations.AddField(
            model_name='serviciocontratado',
            name='roles_json',
            field=models.TextField(blank=True, null=True),
        ),

        # ── SolicitudFacturacion — modelo nuevo ─────────────────────────────
        migrations.CreateModel(
            name='SolicitudFacturacion',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sqf_id', models.CharField(max_length=30, unique=True)),
                ('empresa', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='solicitudes_facturacion',
                    to='clientes.empresacliente',
                )),
                ('nit', models.CharField(blank=True, null=True, max_length=20)),
                ('client_name', models.CharField(max_length=255)),
                ('company', models.CharField(blank=True, null=True, max_length=100)),
                ('billing_type', models.CharField(blank=True, null=True, max_length=50)),
                ('billing_client_type', models.CharField(blank=True, null=True, max_length=50)),
                ('billing_modality', models.CharField(blank=True, null=True, max_length=100)),
                ('sale_type', models.CharField(blank=True, null=True, max_length=50)),
                ('cross_sale_person', models.CharField(blank=True, null=True, max_length=150)),
                ('service_type', models.CharField(blank=True, null=True, max_length=50)),
                ('valor_mes', models.BigIntegerField(default=0)),
                ('valor_proyecto', models.BigIntegerField(default=0)),
                ('origin', models.CharField(blank=True, null=True, max_length=100)),
                ('origin_ref', models.CharField(blank=True, null=True, max_length=150)),
                ('closer', models.CharField(blank=True, null=True, max_length=150)),
                ('mes_tipo', models.CharField(blank=True, null=True, max_length=50)),
                ('areas_json', models.TextField(blank=True, null=True)),
                ('items_json', models.TextField(blank=True, null=True)),
                ('status', models.CharField(
                    default='pendiente', max_length=15,
                    choices=[('pendiente', 'Pendiente'), ('procesado', 'Procesado'), ('rechazado', 'Rechazado')],
                )),
                ('solicitante_nombre', models.CharField(blank=True, null=True, max_length=150)),
                ('solicitante_id', models.CharField(blank=True, null=True, max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': '"clientes"."cli_facturacion"',
                'ordering': ['-created_at'],
            },
        ),
    ]
