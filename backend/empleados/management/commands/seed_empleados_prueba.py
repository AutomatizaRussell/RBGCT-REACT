"""Crea 10 empleados de prueba para cada área existente."""
import random

from django.core.management.base import BaseCommand

from empleados.models import DatosArea, DatosCargo, DatosEmpleado, Persona


NOMBRES = [
    'Andrés', 'Mariana', 'Carlos', 'Daniela', 'Felipe', 'Sofía', 'Jorge', 'Valentina',
    'Santiago', 'Camila', 'Mateo', 'Luciana', 'Sebastián', 'Natalia', 'Tomás', 'María',
    'Nicolás', 'Paula', 'Alejandro', 'Isabella',
]

APELLIDOS = [
    'García', 'Rodríguez', 'Martínez', 'López', 'González', 'Pérez', 'Sánchez', 'Ramírez',
    'Torres', 'Díaz', 'Vargas', 'Moreno', 'Jiménez', 'Ruiz', 'Hernández', 'Muñoz',
    'Castro', 'Ortiz', 'Ríos', 'Mendoza',
]


class Command(BaseCommand):
    help = 'Crea 10 empleados de prueba para cada área existente'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Elimina primero los empleados de prueba existentes (correos @rbgct.test)',
        )

    def handle(self, *args, **options):
        if options['delete']:
            empleados_test = DatosEmpleado.objects.filter(correo_corporativo__endswith='@rbgct.test')
            count = empleados_test.count()
            empleados_test.delete()
            self.stdout.write(self.style.WARNING(f'Eliminados {count} empleados de prueba'))

        areas = list(DatosArea.objects.all())
        cargos = list(DatosCargo.objects.all())

        if not areas:
            self.stdout.write(self.style.ERROR('No hay áreas en la base de datos'))
            return

        if not cargos:
            self.stdout.write(self.style.ERROR('No hay cargos en la base de datos'))
            return

        creados = 0
        saltados = 0

        for area in areas:
            for i in range(1, 11):
                email = f'prueba.a{area.id_area}.e{i}@rbgct.test'
                documento = f'9900{area.id_area:02d}{i:03d}'

                if DatosEmpleado.objects.filter(correo_corporativo=email).exists():
                    saltados += 1
                    continue

                persona = Persona.objects.create(
                    primer_nombre=random.choice(NOMBRES),
                    primer_apellido=random.choice(APELLIDOS),
                    numero_documento=documento,
                )

                DatosEmpleado.objects.create(
                    persona=persona,
                    correo_corporativo=email,
                    area=area,
                    cargo=random.choice(cargos),
                    estado='ACTIVA',
                    id_permisos=3,
                )
                creados += 1

        self.stdout.write(
            self.style.SUCCESS(f'Creados {creados} empleados de prueba, saltados {saltados}')
        )
