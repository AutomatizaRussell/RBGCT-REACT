"""
Tests del módulo de clientes.

Cubre:
- Parseo de payloads SQF (sqf_parser).
- Endpoints /from_sqf/ (empresa, servicio, facturación).
- Idempotencia de facturación.
- Permisos por rol (admin/editor vs usuario).
- Gestión de asignaciones de equipo.
- Endpoint /mis_clientes/.
"""
import json
from decimal import Decimal

import bcrypt
from django.test import override_settings
from rest_framework.test import APITestCase
from rest_framework import status

from api.models import DatosArea, DatosCargo, DatosEmpleado, Persona, SuperAdmin
from clientes.models import (
    EmpresaCliente, ContactoCliente, ServicioContratado,
    AsignacionEquipo, SolicitudFacturacion,
)
from clientes import sqf_parser


PASSWORD = 'Prueba123!'


# ─── Helpers ─────────────────────────────────────────────────────────────────

def crear_superadmin(email='admin@rbcol.co'):
    return SuperAdmin.objects.create_user(
        email=email,
        password=PASSWORD,
        nombre='Admin Test',
    )


def crear_empleado(email, id_permisos=3, **kwargs):
    persona = Persona.objects.create(
        primer_nombre=kwargs.pop('primer_nombre', 'Test'),
        primer_apellido=kwargs.pop('primer_apellido', 'Empleado'),
        numero_documento=kwargs.pop('numero_documento', None),
    )
    return DatosEmpleado.objects.create(
        persona=persona,
        correo_corporativo=email,
        password_hash=bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode(),
        id_permisos=id_permisos,
        estado='ACTIVA',
        primer_login=False,
        datos_completados=True,
        **kwargs,
    )


def payload_cliente():
    return {
        'id': 'CLI-TEST-001',
        'clientType': 'juridica',
        'document': '900123456',
        'documentDv': '7',
        'name': 'EMPRESA DE PRUEBA SAS',
        'contactName': 'Juan Pérez',
        'contactRole': 'gerente',
        'economicGroup': 'GRUPO PRUEBA',
        'email': 'facturacion@prueba.co',
        'phone': '6011234567',
        'address': 'Calle 123 # 45-67',
    }


def payload_facturacion(sqf_id='BIL-TEST-001', areas=None):
    return {
        'id': sqf_id,
        'clientName': 'EMPRESA DE PRUEBA SAS',
        'contactName': 'Juan Pérez',
        'contactRole': 'gerente',
        'nit': '900123456',
        'company': 'GCT',
        'billingType': 'Servicio nuevo',
        'billingClientType': 'Cliente nuevo',
        'billingModality': 'Mensual',
        'saleType': 'Nueva venta',
        'serviceType': '0101',
        'valorMes': 15000000,
        'closer': 'Gerente Test',
        'mes_tipo': 'MES CORRIENTE',
        'areas': json.dumps(areas or [
            {'centro': 'CONTABILIDAD', 'concepto': 'CONT - Honorarios', 'valor': 10000000},
            {'centro': 'IMPUESTOS', 'concepto': 'IMP - Declaración', 'valor': 5000000},
        ]),
        'solicitante_nombre': 'Vendedor Test',
        'solicitante_id': '12345',
    }


# ─── Tests de sqf_parser ─────────────────────────────────────────────────────

class SQFParserTests(APITestCase):
    def test_parse_empresa_normaliza_nit(self):
        data = payload_cliente()
        data['document'] = '900.123.456-7'
        parsed = sqf_parser.parse_empresa(data)
        self.assertEqual(parsed['nit'], '900123456')
        self.assertEqual(parsed['digito_verificacion'], '7')
        self.assertEqual(parsed['razon_social'], 'EMPRESA DE PRUEBA SAS')

    def test_parse_empresa_requiere_nit(self):
        with self.assertRaises(sqf_parser.ValidationError):
            sqf_parser.parse_empresa({'name': 'SIN NIT'})

    def test_clean_email_invalido_devuelve_none(self):
        self.assertIsNone(sqf_parser.clean_email('no-es-email'))

    def test_parse_areas_facturacion(self):
        DatosArea.objects.get_or_create(id_area=1, defaults={'nombre_area': 'Contabilidad'})
        DatosArea.objects.get_or_create(id_area=2, defaults={'nombre_area': 'Impuestos'})
        areas = sqf_parser.parse_areas_facturacion(payload_facturacion(), DatosArea.objects.all())
        self.assertEqual(len(areas), 2)
        self.assertIsNotNone(areas[0]['area'])
        self.assertEqual(areas[0]['area'].nombre_area, 'Contabilidad')
        self.assertEqual(areas[1]['area'].nombre_area, 'Impuestos')

    def test_validar_payload_facturacion_rechaza_sin_id(self):
        with self.assertRaises(sqf_parser.ValidationError):
            sqf_parser.validar_payload_facturacion({'nit': '123'})


# ─── Tests de endpoints from_sqf ─────────────────────────────────────────────

class ClientesFromSQFTests(APITestCase):
    def setUp(self):
        self.superadmin = crear_superadmin()
        self.admin = crear_empleado('admin@rbcol.co', id_permisos=1)
        self.vendedor_sqf = crear_empleado(
            'vendedor@rbcol.co',
            id_permisos=3,
            acceso_sqf_facturacion=True,
        )
        self.area_contabilidad, _ = DatosArea.objects.get_or_create(id_area=1, defaults={'nombre_area': 'Contabilidad'})
        self.area_impuestos, _ = DatosArea.objects.get_or_create(id_area=2, defaults={'nombre_area': 'Impuestos'})

    def test_empleado_sqf_puede_enviar_facturacion(self):
        self.client.force_authenticate(user=self.vendedor_sqf)
        res = self.client.post('/api/clientes/facturacion/from_sqf/', payload_facturacion(), format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data['created'])

    def test_from_sqf_facturacion_crea_empresa_contacto_servicios_y_solicitud(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/clientes/facturacion/from_sqf/', payload_facturacion(), format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        self.assertTrue(res.data['created'])
        self.assertEqual(res.data['areas_count'], 2)
        self.assertEqual(len(res.data['servicios_creados']), 2)

        empresa = EmpresaCliente.objects.get(nit='900123456')
        self.assertEqual(empresa.razon_social, 'EMPRESA DE PRUEBA SAS')
        self.assertEqual(empresa.contactos.filter(es_principal=True).count(), 1)

        self.assertEqual(ServicioContratado.objects.filter(empresa=empresa).count(), 2)
        self.assertTrue(SolicitudFacturacion.objects.filter(sqf_id='BIL-TEST-001').exists())

    def test_from_sqf_facturacion_es_idempotente(self):
        self.client.force_authenticate(user=self.admin)
        payload = payload_facturacion()
        self.client.post('/api/clientes/facturacion/from_sqf/', payload, format='json')
        res2 = self.client.post('/api/clientes/facturacion/from_sqf/', payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertFalse(res2.data['created'])
        self.assertEqual(SolicitudFacturacion.objects.filter(sqf_id='BIL-TEST-001').count(), 1)
        self.assertEqual(ServicioContratado.objects.filter(empresa__nit='900123456').count(), 2)

    def test_from_sqf_empresa_reutiliza_nit_existente(self):
        self.client.force_authenticate(user=self.admin)
        EmpresaCliente.objects.create(
            nit='900123456',
            razon_social='EMPRESA EXISTENTE',
            estado='activo',
        )
        res = self.client.post('/api/clientes/facturacion/from_sqf/', payload_facturacion(), format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        empresa = EmpresaCliente.objects.get(nit='900123456')
        # No debe sobreescribir razón social de cliente ya existente.
        self.assertEqual(empresa.razon_social, 'EMPRESA EXISTENTE')

    def test_from_sqf_rechaza_payload_invalido(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/clientes/facturacion/from_sqf/', {'id': 'BIL-X'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


# ─── Tests de permisos ───────────────────────────────────────────────────────

class ClientesPermisosTests(APITestCase):
    def setUp(self):
        self.superadmin = crear_superadmin()
        self.admin = crear_empleado('admin@rbcol.co', id_permisos=1)
        self.usuario = crear_empleado('usuario@rbcol.co', id_permisos=3)
        self.area, _ = DatosArea.objects.get_or_create(id_area=1, defaults={'nombre_area': 'Contabilidad'})
        self.empresa = EmpresaCliente.objects.create(nit='123', razon_social='Cliente A', estado='activo')

    def test_usuario_no_puede_crear_asignacion(self):
        self.client.force_authenticate(user=self.usuario)
        res = self.client.post('/api/clientes/asignaciones/', {
            'empresa': self.empresa.id,
            'area': self.area.id_area,
            'empleado': self.usuario.id_empleado,
            'rol': 'analista',
            'fecha_inicio': '2026-01-01',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_puede_crear_asignacion(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/clientes/asignaciones/', {
            'empresa': self.empresa.id,
            'area': self.area.id_area,
            'empleado': self.admin.id_empleado,
            'rol': 'gerente',
            'fecha_inicio': '2026-01-01',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)


# ─── Tests de asignaciones y mis clientes ────────────────────────────────────

class AsignacionesYMisClientesTests(APITestCase):
    def setUp(self):
        self.admin = crear_empleado('admin@rbcol.co', id_permisos=1)
        self.usuario = crear_empleado('usuario@rbcol.co', id_permisos=3)
        self.area, _ = DatosArea.objects.get_or_create(id_area=1, defaults={'nombre_area': 'Contabilidad'})
        self.empresa = EmpresaCliente.objects.create(nit='123', razon_social='Cliente Asignado', estado='activo')
        AsignacionEquipo.objects.create(
            empresa=self.empresa,
            area=self.area,
            empleado=self.usuario,
            rol='analista',
            fecha_inicio='2026-01-01',
            activo=True,
        )

    def test_mis_clientes_devuelve_cliente_asignado(self):
        self.client.force_authenticate(user=self.usuario)
        res = self.client.get('/api/clientes/empresas/mis_clientes/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['clientes'][0]['nit'], '123')

    def test_mis_clientes_vacio_sin_asignaciones(self):
        otro = crear_empleado('otro@rbcol.co', id_permisos=3)
        self.client.force_authenticate(user=otro)
        res = self.client.get('/api/clientes/empresas/mis_clientes/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['count'], 0)

    def test_bulk_create_asignaciones(self):
        self.client.force_authenticate(user=self.admin)
        otro_empleado = crear_empleado('otro2@rbcol.co', id_permisos=3)
        res = self.client.post('/api/clientes/asignaciones/bulk_create/', {
            'asignaciones': [
                {
                    'empresa': self.empresa.id,
                    'area': self.area.id_area,
                    'empleado': self.admin.id_empleado,
                    'rol': 'gerente',
                    'fecha_inicio': '2026-01-01',
                },
                {
                    'empresa': self.empresa.id,
                    'area': self.area.id_area,
                    'empleado': otro_empleado.id_empleado,
                    'rol': 'analista',
                    'fecha_inicio': '2026-01-01',
                },
            ]
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(res.data['creadas']), 2)
        self.assertEqual(AsignacionEquipo.objects.filter(empresa=self.empresa).count(), 3)  # 1 previa + 2 nuevas
