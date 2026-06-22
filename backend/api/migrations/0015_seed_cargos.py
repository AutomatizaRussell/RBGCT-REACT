from django.db import migrations

CARGOS = [
    'Socio',
    'Gerente Asociado 1',
    'Gerente Asociado 2',
    'Gerente Asociado 3',
    'Senior 1',
    'Senior 2',
    'Senior 3',
    'Líder/Semi-Senior 1',
    'Líder/Semi-Senior 2',
    'Analista/Asistente 1',
    'Analista/Asistente 2',
    'Analista/Asistente 3',
    'Analista/Asistente 4',
]


def seed_cargos(apps, schema_editor):
    DatosCargo = apps.get_model('api', 'DatosCargo')
    for nombre in CARGOS:
        obj = DatosCargo.objects.filter(nombre_cargo__iexact=nombre).first()
        if obj:
            if obj.nombre_cargo != nombre:
                obj.nombre_cargo = nombre
                obj.save()
        else:
            DatosCargo.objects.create(nombre_cargo=nombre)

    nombres_validos = [n.upper() for n in CARGOS]
    DatosCargo.objects.exclude(nombre_cargo__in=nombres_validos + CARGOS).delete()


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0014_datos_academicos'),
    ]

    operations = [
        migrations.RunPython(seed_cargos, noop),
    ]
