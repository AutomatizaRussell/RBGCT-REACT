from django.db import migrations


AREAS = [
    (1,  'Revisoría Fiscal y Auditoría'),
    (2,  'Contabilidad'),
    (3,  'BPO'),
    (4,  'Legal'),
    (5,  'Impuestos'),
    (6,  'Administración'),
    (7,  'Financiera'),
]

CARGOS = [
    (1,  'Socio',                  'Socio'),
    (2,  'Gerente 1',              'Gerente'),
    (3,  'Gerente 2',              'Gerente'),
    (4,  'Gerente 3',              'Gerente'),
    (5,  'Senior 1',               'Senior'),
    (6,  'Senior 2',               'Senior'),
    (7,  'Senior 3',               'Senior'),
    (8,  'Líder/Semi-Senior 1',    'Líder/Semi-Senior'),
    (9,  'Líder/Semi-Senior 2',    'Líder/Semi-Senior'),
    (10, 'Líder/Semi-Senior 3',    'Líder/Semi-Senior'),
    (11, 'Analista/Asistente 1',   'Analista/Asistente'),
    (12, 'Analista/Asistente 2',   'Analista/Asistente'),
    (13, 'Analista/Asistente 3',   'Analista/Asistente'),
    (14, 'Analista/Asistente 4',   'Analista/Asistente'),
]


def seed_areas_cargos(apps, schema_editor):
    DatosArea = apps.get_model('api', 'DatosArea')
    DatosCargo = apps.get_model('api', 'DatosCargo')

    for id_area, nombre in AREAS:
        obj, created = DatosArea.objects.get_or_create(id_area=id_area)
        if obj.nombre_area != nombre:
            obj.nombre_area = nombre
            obj.save(update_fields=['nombre_area'])

    for id_cargo, nombre, nivel in CARGOS:
        obj, created = DatosCargo.objects.get_or_create(id_cargo=id_cargo)
        changed = False
        if obj.nombre_cargo != nombre:
            obj.nombre_cargo = nombre
            changed = True
        if obj.nivel != nivel:
            obj.nivel = nivel
            changed = True
        if changed:
            obj.save(update_fields=['nombre_cargo', 'nivel'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial_rrhh_schema'),
    ]

    operations = [
        migrations.RunPython(seed_areas_cargos, reverse_code=noop),
    ]
