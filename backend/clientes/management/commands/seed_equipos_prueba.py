"""
Crea equipos de trabajo de prueba a partir de los servicios activos existentes.

Cada servicio activo genera un equipo con miembros tomados de los empleados de
prueba (correos @rbgct.test). El rol de cada miembro se infiere de su cargo.
"""
import random
from datetime import date
from django.core.management.base import BaseCommand
from django.db import transaction

from clientes.models import ServicioContratado, Equipo, MiembroEquipo
from empleados.models import DatosEmpleado


def rol_desde_cargo(nombre_cargo):
    n = (nombre_cargo or '').upper()
    if 'GERENTE' in n:
        return 'gerente'
    if 'SENIOR' in n and 'SEMI' not in n:
        return 'senior'
    if 'LÍDER' in n or 'LIDER' in n:
        return 'lider_equipo'
    if 'SEMI' in n:
        return 'semi_senior'
    if 'ANALISTA' in n:
        return 'analista'
    if 'ASISTENTE' in n:
        return 'asistente'
    if 'REVISOR' in n:
        return 'revisor'
    return 'apoyo'


class Command(BaseCommand):
    help = 'Crea equipos de trabajo de prueba a partir de servicios activos.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limite',
            type=int,
            default=30,
            help='Cantidad máxima de equipos a crear (default: 30).'
        )
        parser.add_argument(
            '--borrar',
            action='store_true',
            help='Borra equipos de prueba previos antes de crear nuevos.'
        )

    def handle(self, *args, **options):
        limite = options['limite']
        borrar = options['borrar']

        with transaction.atomic():
            if borrar:
                previos = Equipo.objects.filter(nombre__startswith='[Prueba]')
                self.stdout.write(f"Borrando {previos.count()} equipos de prueba previos...")
                previos.delete()

            empleados_prueba = list(
                DatosEmpleado.objects.filter(
                    correo_corporativo__endswith='@rbgct.test',
                    estado='ACTIVA'
                ).select_related('persona', 'cargo')
            )
            if not empleados_prueba:
                self.stdout.write(self.style.WARNING(
                    "No se encontraron empleados de prueba. Ejecuta seed_empleados_prueba primero."
                ))
                return

            servicios = list(
                ServicioContratado.objects.filter(
                    estado='activo',
                    area__isnull=False
                ).select_related('empresa', 'area')[:limite]
            )

            creados = 0
            miembros_creados = 0

            for servicio in servicios:
                equipo = Equipo.objects.create(
                    empresa=servicio.empresa,
                    area=servicio.area,
                    servicio=servicio,
                    nombre=f"[Prueba] {servicio.nombre or 'Equipo'} — {servicio.area.nombre_area}",
                    descripcion=f"Equipo de prueba generado automáticamente para el servicio {servicio.nombre or '#'+str(servicio.id)}.",
                    estado='activo',
                    fecha_inicio=servicio.fecha_inicio,
                    activo=True,
                )

                # Tomar entre 3 y 6 empleados aleatorios de prueba.
                cantidad = min(random.randint(3, 6), len(empleados_prueba))
                elegidos = random.sample(empleados_prueba, cantidad)

                for emp in elegidos:
                    MiembroEquipo.objects.create(
                        equipo=equipo,
                        empleado=emp,
                        rol=rol_desde_cargo(emp.cargo.nombre_cargo if emp.cargo else ''),
                        fecha_inicio=date.today(),
                        activo=True,
                    )
                    miembros_creados += 1

                creados += 1

        self.stdout.write(self.style.SUCCESS(
            f"Creados {creados} equipos con {miembros_creados} miembros de prueba."
        ))
