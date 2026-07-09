from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0001_initial'),
    ]

    operations = [
        migrations.DeleteModel(
            name='DocumentoCliente',
        ),
    ]
