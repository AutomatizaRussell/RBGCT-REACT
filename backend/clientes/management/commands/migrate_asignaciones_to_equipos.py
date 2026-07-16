from django.core.management.base import BaseCommand
from django.db import transaction
from datetime import date

from clientes.models import AsignacionEquipo, Equipo, MiembroEquipo


ROL_MAP = {
    'responsable_principal': 'gerente',
    'gerente': 'gerente',
    'senior': 'senior',
    'analista': 'analista',
    'revisor': 'revisor',
    'apoyo': 'apoyo',
}


def _nombre_equipo(asig):
    area = asig.area.nombre_area if asig.area else 'General'
    return f"Equipo {area} — {asig.empresa.razon_social}"


class Command(BaseCommand):
    help = 'Migra asignaciones del modelo antiguo (AsignacionEquipo) al nuevo modelo Equipo/MiembroEquipo.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Muestra que se crearía sin hacer cambios en la BD.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        asignaciones = AsignacionEquipo.objects.filter(activo=True).select_related(
            'empresa', 'area', 'servicio', 'empleado'
        ).order_by('id')

        if not asignaciones.exists():
            self.stdout.write(self.style.WARNING('No hay asignaciones activas para migrar.'))
            return

        equipos_creados = 0
        miembros_creados = 0
        equipos_por_clave = {}

        with transaction.atomic():
            for asig in asignaciones:
                clave = (asig.empresa_id, asig.area_id, asig.servicio_id)
                equipo = equipos_por_clave.get(clave)

                if not equipo and not dry_run:
                    equipo = Equipo.objects.filter(
                        empresa=asig.empresa,
                        area=asig.area,
                        servicio=asig.servicio,
                    ).first()
                    if equipo:
                        equipos_por_clave[clave] = equipo

                if not equipo:
                    equipos_creados += 1
                    if dry_run:
                        continue
                    equipo = Equipo.objects.create(
                        empresa=asig.empresa,
                        area=asig.area,
                        servicio=asig.servicio,
                        nombre=_nombre_equipo(asig),
                        descripcion='Equipo migrado automáticamente desde AsignacionEquipo.',
                        estado='activo',
                        fecha_inicio=asig.fecha_inicio or date.today(),
                        activo=True,
                    )
                    equipos_por_clave[clave] = equipo

                rol = ROL_MAP.get(asig.rol, 'apoyo')
                if dry_run:
                    miembros_creados += 1
                    continue

                _, miembro_created = MiembroEquipo.objects.get_or_create(
                    equipo=equipo,
                    empleado=asig.empleado,
                    defaults={
                        'rol': rol,
                        'fecha_inicio': asig.fecha_inicio or date.today(),
                        'activo': True,
                    },
                )
                if miembro_created:
                    miembros_creados += 1

            if dry_run:
                self.stdout.write(self.style.WARNING(
                    f'DRY-RUN: se crearían aproximadamente {equipos_creados} equipos '
                    f'y se migrarían {asignaciones.count()} miembros.'
                ))
            else:
                self.stdout.write(self.style.SUCCESS(
                    f'Migración completa: {equipos_creados} equipos creados y '
                    f'{miembros_creados} miembros migrados.'
                ))
