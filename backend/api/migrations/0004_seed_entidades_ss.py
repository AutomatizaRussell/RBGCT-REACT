from django.db import migrations


EPS = [
    (1,  'Nueva EPS',              'NE'),
    (2,  'Sanitas EPS',            'SA'),
    (3,  'EPS Sura',               'SU'),
    (4,  'Compensar EPS',          'CO'),
    (5,  'Famisanar EPS',          'FA'),
    (6,  'Salud Total EPS',        'ST'),
    (7,  'Medimás EPS',            'ME'),
    (8,  'Coosalud EPS',           'CS'),
    (9,  'Mutual Ser EPS',         'MS'),
    (10, 'Comfenalco Valle EPS',   'CV'),
    (11, 'Comfacor EPS',           'CF'),
    (12, 'Emssanar EPS',           'EM'),
    (13, 'Asmet Salud EPS',        'AS'),
    (14, 'Capital Salud EPS',      'CA'),
    (15, 'Ferrocarriles EPS',      'FE'),
    (16, 'Cajacopi Atlántico EPS', 'CJ'),
]

AFP = [
    (1, 'Porvenir',             'PV'),
    (2, 'Protección',           'PR'),
    (3, 'Colfondos',            'CF'),
    (4, 'Skandia (Old Mutual)', 'SK'),
    (5, 'Colpensiones',         'CP'),
]

ARL = [
    (1, 'ARL Sura',     'SU'),
    (2, 'ARL Positiva', 'PO'),
    (3, 'ARL Liberty',  'LI'),
    (4, 'ARL Colmena',  'CO'),
    (5, 'ARL Bolívar',  'BO'),
    (6, 'ARL Equidad',  'EQ'),
    (7, 'ARL Axa',      'AX'),
]

CAJAS = [
    (1,  'Compensar',              'COM'),
    (2,  'Cafam',                  'CAF'),
    (3,  'Colsubsidio',            'COL'),
    (4,  'Comfenalco Antioquia',   'CAN'),
    (5,  'Comfenalco Valle',       'CVA'),
    (6,  'Comfama',                'CMA'),
    (7,  'Comfamiliar Risaralda',  'CRI'),
    (8,  'Comfamiliar Huila',      'CHU'),
    (9,  'Comfamiliar Nariño',     'CNA'),
    (10, 'Comfamiliar Cartagena',  'CCA'),
    (11, 'Combarranquilla',        'CBA'),
    (12, 'Cajacopi Atlántico',     'CJA'),
    (13, 'Comfacor',               'CCO'),
    (14, 'Comfacundi',             'CCU'),
    (15, 'Comfatolima',            'CTO'),
    (16, 'Cajasalud',              'CJS'),
]


def seed(apps, schema_editor):
    EntidadEPS      = apps.get_model('api', 'EntidadEPS')
    EntidadAFP      = apps.get_model('api', 'EntidadAFP')
    EntidadARL      = apps.get_model('api', 'EntidadARL')
    CajaCompensacion= apps.get_model('api', 'CajaCompensacion')

    for pk, nombre, codigo in EPS:
        obj, _ = EntidadEPS.objects.get_or_create(id=pk)
        obj.nombre = nombre; obj.codigo = codigo; obj.save()

    for pk, nombre, codigo in AFP:
        obj, _ = EntidadAFP.objects.get_or_create(id=pk)
        obj.nombre = nombre; obj.codigo = codigo; obj.save()

    for pk, nombre, codigo in ARL:
        obj, _ = EntidadARL.objects.get_or_create(id=pk)
        obj.nombre = nombre; obj.codigo = codigo; obj.save()

    for pk, nombre, codigo in CAJAS:
        obj, _ = CajaCompensacion.objects.get_or_create(id=pk)
        obj.nombre = nombre; obj.codigo = codigo; obj.save()


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_contrato_modulo'),
    ]

    operations = [
        migrations.RunPython(seed, reverse_code=noop),
    ]
