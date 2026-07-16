from django.db import connection, migrations


AREAS = [
    (1, 'Revisoría Fiscal y Auditoría'),
    (2, 'Contabilidad'),
    (3, 'BPO'),
    (4, 'Legal'),
    (5, 'Impuestos'),
    (6, 'Administración'),
    (7, 'Financiera'),
]

# nivel indica el grupo jerárquico para el organigrama
CARGOS = [
    # Comunes a todas las áreas
    (1,  'Socio',              'Socio'),
    (2,  'Gerente Asociado 1', 'Gerente'),
    (3,  'Gerente Asociado 2', 'Gerente'),
    (4,  'Gerente Asociado 3', 'Gerente'),
    (5,  'Senior 1',           'Senior'),
    (6,  'Senior 2',           'Senior'),
    (7,  'Senior 3',           'Senior'),
    # Revisoría Fiscal y Auditoría
    (8,  'Semi-Senior 1',      'Semi-Senior'),
    (9,  'Semi-Senior 2',      'Semi-Senior'),
    (10, 'Asistente 1',        'Asistente'),
    (11, 'Asistente 2',        'Asistente'),
    (12, 'Asistente 3',        'Asistente'),
    (13, 'Asistente 4',        'Asistente'),
    # Resto de áreas
    (14, 'Líder de Equipo 1',  'Líder de Equipo'),
    (15, 'Líder de Equipo 2',  'Líder de Equipo'),
    (16, 'Analista 1',         'Analista'),
    (17, 'Analista 2',         'Analista'),
    (18, 'Analista 3',         'Analista'),
    (19, 'Analista 4',         'Analista'),
]


def seed(apps, schema_editor):
    DatosArea = apps.get_model('empleados', 'DatosArea')
    DatosCargo = apps.get_model('empleados', 'DatosCargo')

    for id_area, nombre in AREAS:
        obj, _ = DatosArea.objects.get_or_create(id_area=id_area)
        if obj.nombre_area != nombre:
            obj.nombre_area = nombre
            obj.save(update_fields=['nombre_area'])

    for id_cargo, nombre, nivel in CARGOS:
        obj, _ = DatosCargo.objects.get_or_create(id_cargo=id_cargo)
        changed = False
        if obj.nombre_cargo != nombre:
            obj.nombre_cargo = nombre
            changed = True
        if obj.nivel != nivel:
            obj.nivel = nivel
            changed = True
        if changed:
            obj.save(update_fields=['nombre_cargo', 'nivel'])

    # PostgreSQL IDENTITY / serial sequences must be reset after inserting
    # fixed IDs; otherwise the next .create() will try to reuse id 1..N and
    # raise a duplicate key violation.
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT setval(
                pg_get_serial_sequence('empleados.datos_area', 'id_area'),
                COALESCE((SELECT MAX(id_area) FROM empleados.datos_area), 0)
            );
        """)
        cursor.execute("""
            SELECT setval(
                pg_get_serial_sequence('empleados.datos_cargo', 'id_cargo'),
                COALESCE((SELECT MAX(id_cargo) FROM empleados.datos_cargo), 0)
            );
        """)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('empleados', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed, reverse_code=noop),
    ]
