"""
Siembra las áreas y cargos oficiales de Russell Bedford RBG.
Ejecutar una vez después de crear la base de datos:

    python seed_areas_cargos.py

Es idempotente: puede correrse varias veces sin duplicar datos.
"""
import os, sys, django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rbgct.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from empleados.models import DatosArea, DatosCargo

# ─── Áreas ────────────────────────────────────────────────────────────────────

AREAS = [
    (1, 'Revisoría Fiscal y Auditoría'),
    (2, 'Contabilidad'),
    (3, 'BPO'),
    (4, 'Legal'),
    (5, 'Impuestos'),
    (6, 'Administración'),
    (7, 'Financiera'),
]

# ─── Cargos ───────────────────────────────────────────────────────────────────
# nivel = grupo jerárquico usado por el organigrama y filtrado de formularios
#
# Cargos 1-7  → comunes a TODAS las áreas
# Cargos 8-13 → exclusivos de Revisoría Fiscal y Auditoría
#               (Semi-Senior 1/2, Asistente 1/2/3/4)
# Cargos 14-19→ resto de áreas
#               (Líder de Equipo 1/2, Analista 1/2/3/4)

CARGOS = [
    # Comunes
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

# ─── Ejecución ────────────────────────────────────────────────────────────────

def seed():
    print("Sembrando áreas...")
    for id_area, nombre in AREAS:
        obj, created = DatosArea.objects.get_or_create(id_area=id_area)
        if obj.nombre_area != nombre:
            obj.nombre_area = nombre
            obj.save(update_fields=['nombre_area'])
        print(f"  {'✓ creada' if created else '· existe'} → {nombre}")

    print("\nSembrando cargos...")
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
        print(f"  {'✓ creado' if created else '· existe'} → {nombre} ({nivel})")

    print(f"\nListo: {DatosArea.objects.count()} áreas, {DatosCargo.objects.count()} cargos.")

if __name__ == '__main__':
    seed()
