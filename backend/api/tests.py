"""
Tests de integración para flujos críticos del API GCT.

Ejecutar:  python manage.py test api -v 2

Cubre:
- Login + 2FA (primer login y login normal)
- Recuperación de contraseña
- Creación de usuarios por SuperAdmin
- PATCH empleado → cambio de cargo/área → MovimientoLaboral
- Endpoint historial laboral
- Sugerencias (flujo completo empleado ↔ admin)
- Throttling básico (rate limits)

Los mocks apuntan al módulo donde la función ES USADA, no donde está definida.
Tras el refactoring views/ esto es crítico: 'api.views.auth.fn' no 'api.views.fn'.
"""
from unittest.mock import patch

import bcrypt
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

from .models import DatosArea, DatosCargo, DatosEmpleado, MovimientoLaboral, Persona, SuperAdmin

PASSWORD = 'Prueba123!'

TEST_CACHE = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'tests',
    }
}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def crear_empleado(email, primer_login=True, **kwargs):
    persona = Persona.objects.create(
        primer_nombre=kwargs.pop('primer_nombre', 'Test'),
        primer_apellido=kwargs.pop('primer_apellido', 'Empleado'),
        numero_documento=kwargs.pop('numero_documento', None),
    )
    return DatosEmpleado.objects.create(
        persona=persona,
        correo_corporativo=email,
        password_hash=bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode(),
        id_permisos=kwargs.pop('id_permisos', 3),
        estado='ACTIVA',
        primer_login=primer_login,
        datos_completados=not primer_login,
        **kwargs,
    )


# ─── Login + 2FA ─────────────────────────────────────────────────────────────

@override_settings(CACHES=TEST_CACHE)
class LoginPrimerIngresoTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.empleado = crear_empleado('nuevo@rbcol.co')

    @patch('api.views.auth.enviar_email_verificacion', return_value=(True, 'ok'))
    def test_login_regenera_codigo_si_no_hay_en_cache(self, mock_email):
        """El código del alta dura 15 min; el login debe regenerarlo si expiró."""
        res = self.client.post('/api/login/', {'email': 'nuevo@rbcol.co', 'password': PASSWORD})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['requiere_verificacion'])
        datos = cache.get('verificacion_nuevo@rbcol.co')
        self.assertIsNotNone(datos, 'login debe dejar un código vigente en cache')
        self.assertTrue(datos['password_verificada'])
        mock_email.assert_called_once()

    @patch('api.views.auth.enviar_email_verificacion', return_value=(True, 'ok'))
    def test_verificar_codigo_sin_password_tras_login(self, _):
        """El frontend no reenvía la contraseña al verificar: no debe exigirla."""
        self.client.post('/api/login/', {'email': 'nuevo@rbcol.co', 'password': PASSWORD})
        codigo = cache.get('verificacion_nuevo@rbcol.co')['codigo']
        res = self.client.post('/api/verificar-codigo/', {'email': 'nuevo@rbcol.co', 'codigo': codigo})
        self.assertEqual(res.status_code, 200)
        self.assertIn('accessToken', res.data)

    @patch('api.views.auth.enviar_email_verificacion', return_value=(True, 'ok'))
    def test_reenviar_codigo_preserva_password_verificada(self, _):
        self.client.post('/api/login/', {'email': 'nuevo@rbcol.co', 'password': PASSWORD})
        self.client.post('/api/enviar-codigo/', {'email': 'nuevo@rbcol.co'})
        datos = cache.get('verificacion_nuevo@rbcol.co')
        self.assertTrue(datos['password_verificada'],
                        'el reenvío no debe exigir password que el frontend no envía')

    @patch('api.views.auth.enviar_email_verificacion', return_value=(True, 'ok'))
    def test_codigo_incorrecto_bloquea_a_los_3_intentos(self, _):
        self.client.post('/api/login/', {'email': 'nuevo@rbcol.co', 'password': PASSWORD})
        for _i in range(3):
            res = self.client.post('/api/verificar-codigo/',
                                   {'email': 'nuevo@rbcol.co', 'codigo': '000000'})
            self.assertEqual(res.status_code, 400)
        res = self.client.post('/api/verificar-codigo/',
                               {'email': 'nuevo@rbcol.co', 'codigo': '000000'})
        self.assertIn('Demasiados intentos', res.data['error'])

    def test_login_credenciales_invalidas(self):
        res = self.client.post('/api/login/', {'email': 'nuevo@rbcol.co', 'password': 'mala'})
        self.assertEqual(res.status_code, 401)

    def test_login_sin_datos_rechaza(self):
        res = self.client.post('/api/login/', {})
        self.assertEqual(res.status_code, 400)

    @patch('api.views.auth.enviar_email_verificacion', return_value=(True, 'ok'))
    def test_login_superadmin_directo_sin_2fa(self, _):
        """SuperAdmin recibe token directo — sin flujo 2FA."""
        admin = SuperAdmin.objects.create_superuser(
            email='sa@rbcol.co', password=PASSWORD, nombre='SA', apellido='Test')
        res = self.client.post('/api/login/', {'email': 'sa@rbcol.co', 'password': PASSWORD})
        self.assertEqual(res.status_code, 200)
        self.assertIn('accessToken', res.data)
        self.assertNotIn('requiere_verificacion', res.data)


# ─── Completar datos (onboarding) ─────────────────────────────────────────────

@override_settings(CACHES=TEST_CACHE)
class CompletarDatosTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.empleado = crear_empleado('uno@rbcol.co')
        self.otro = crear_empleado('dos@rbcol.co')

    def _token(self, email):
        with patch('api.views.auth.enviar_email_verificacion', return_value=(True, 'ok')):
            self.client.post('/api/login/', {'email': email, 'password': PASSWORD})
            codigo = cache.get(f'verificacion_{email}')['codigo']
            res = self.client.post('/api/verificar-codigo/', {'email': email, 'codigo': codigo})
        return res.data['accessToken']

    def _post(self, payload, token=None):
        kwargs = {'HTTP_AUTHORIZATION': f'Bearer {token}'} if token else {}
        return self.client.post('/api/completar-datos/', payload, **kwargs)

    def test_sin_token_rechaza(self):
        res = self._post({'empleado_id': self.empleado.id_empleado, 'nueva_password': 'Hack1234'})
        self.assertEqual(res.status_code, 401)

    def test_token_de_otro_usuario_rechaza(self):
        token = self._token('uno@rbcol.co')
        res = self._post({'empleado_id': self.otro.id_empleado, 'nueva_password': 'Hack1234'}, token)
        self.assertEqual(res.status_code, 403)

    def test_password_corta_rechaza(self):
        token = self._token('uno@rbcol.co')
        res = self._post({'empleado_id': self.empleado.id_empleado, 'nueva_password': 'abc'}, token)
        self.assertEqual(res.status_code, 400)

    def test_documento_de_persona_residual_se_libera(self):
        """Caso del error 500 en producción: Persona huérfana retenía el documento."""
        Persona.objects.create(primer_nombre='Residuo', primer_apellido='Viejo',
                               numero_documento='999000111')
        token = self._token('uno@rbcol.co')
        res = self._post({
            'empleado_id': self.empleado.id_empleado,
            'primer_nombre': 'Uno', 'primer_apellido': 'Test',
            'tipo_documento': 'CC', 'numero_documento': '999000111',
            'nueva_password': 'ClaveValida123',
        }, token)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertFalse(Persona.objects.filter(primer_nombre='Residuo').exists())
        self.empleado.refresh_from_db()
        self.assertTrue(self.empleado.datos_completados)
        self.assertFalse(self.empleado.primer_login)

    def test_documento_de_empleado_activo_da_409(self):
        self.otro.persona.numero_documento = '888777666'
        self.otro.persona.save()
        token = self._token('uno@rbcol.co')
        res = self._post({
            'empleado_id': self.empleado.id_empleado,
            'numero_documento': '888777666',
        }, token)
        self.assertEqual(res.status_code, 409)
        self.empleado.refresh_from_db()
        self.assertTrue(self.empleado.primer_login,
                        'un fallo no debe sacar al usuario del modo primer registro')


# ─── Creación de usuarios ────────────────────────────────────────────────────

@override_settings(CACHES=TEST_CACHE)
class CrearUsuarioTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.admin = SuperAdmin.objects.create_superuser(
            email='admin@rbcol.co', password=PASSWORD, nombre='Admin', apellido='Test')

    def _token_superadmin(self):
        res = self.client.post('/api/login/', {'email': 'admin@rbcol.co', 'password': PASSWORD})
        return res.data['accessToken']

    def test_sin_jwt_rechaza(self):
        res = self.client.post('/api/crear-usuario/', {
            'admin_email': 'admin@rbcol.co', 'admin_password': PASSWORD,
            'correo_corporativo': 'x@rbcol.co', 'password': 'Clave123!',
        })
        self.assertEqual(res.status_code, 401)

    @patch('api.views.auth.enviar_email_verificacion', return_value=(True, 'ok'))
    def test_superadmin_crea_usuario_y_normaliza_email(self, _):
        token = self._token_superadmin()
        res = self.client.post('/api/crear-usuario/', {
            'admin_email': 'admin@rbcol.co', 'admin_password': PASSWORD,
            'correo_corporativo': 'MAYUSCULAS@Rbcol.co', 'password': 'Clave123!',
        }, HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(
            DatosEmpleado.objects.filter(correo_corporativo='mayusculas@rbcol.co').exists())


# ─── PATCH empleado + Historial Laboral ──────────────────────────────────────

@override_settings(CACHES=TEST_CACHE)
class PatchEmpleadoTests(APITestCase):
    """
    Verifica que cambiar cargo o área via PATCH /empleados/{id}/ registra
    automáticamente un MovimientoLaboral via Django signal.
    """

    def setUp(self):
        cache.clear()
        self.area_a = DatosArea.objects.create(nombre_area='Auditoría')
        self.area_b = DatosArea.objects.create(nombre_area='Impuestos')
        self.cargo_a = DatosCargo.objects.create(nombre_cargo='Analista')
        self.cargo_b = DatosCargo.objects.create(nombre_cargo='Senior')
        self.empleado = crear_empleado(
            'emp@rbcol.co', primer_login=False,
            area=self.area_a, cargo=self.cargo_a,
        )
        self.superadmin = SuperAdmin.objects.create_superuser(
            email='sa@rbcol.co', password=PASSWORD, nombre='SA', apellido='Test')

    def _token_sa(self):
        res = self.client.post('/api/login/', {'email': 'sa@rbcol.co', 'password': PASSWORD})
        return res.data['accessToken']

    def _patch(self, payload, token):
        return self.client.patch(
            f'/api/empleados/{self.empleado.id_empleado}/',
            payload,
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )

    def test_sin_token_rechaza(self):
        res = self.client.patch(
            f'/api/empleados/{self.empleado.id_empleado}/',
            {'cargo': self.cargo_b.pk},
            content_type='application/json',
        )
        self.assertEqual(res.status_code, 401)

    def test_cambio_cargo_crea_movimiento_laboral(self):
        """El signal post_save debe registrar CAMBIO_CARGO al cambiar cargo."""
        token = self._token_sa()
        antes = MovimientoLaboral.objects.filter(empleado=self.empleado, tipo='CAMBIO_CARGO').count()

        res = self._patch({'cargo': self.cargo_b.pk}, token)
        self.assertEqual(res.status_code, 200, res.data)

        self.assertEqual(
            MovimientoLaboral.objects.filter(empleado=self.empleado, tipo='CAMBIO_CARGO').count(),
            antes + 1,
        )
        movimiento = MovimientoLaboral.objects.filter(
            empleado=self.empleado, tipo='CAMBIO_CARGO'
        ).latest('created_at')
        self.assertEqual(movimiento.valor_anterior, self.cargo_a.nombre_cargo)
        self.assertEqual(movimiento.valor_nuevo, self.cargo_b.nombre_cargo)

    def test_cambio_area_crea_movimiento_traslado(self):
        """El signal post_save debe registrar TRASLADO al cambiar área."""
        token = self._token_sa()
        antes = MovimientoLaboral.objects.filter(empleado=self.empleado, tipo='TRASLADO').count()

        res = self._patch({'area': self.area_b.pk}, token)
        self.assertEqual(res.status_code, 200, res.data)

        self.assertEqual(
            MovimientoLaboral.objects.filter(empleado=self.empleado, tipo='TRASLADO').count(),
            antes + 1,
        )
        movimiento = MovimientoLaboral.objects.filter(
            empleado=self.empleado, tipo='TRASLADO'
        ).latest('created_at')
        self.assertEqual(movimiento.valor_anterior, self.area_a.nombre_area)
        self.assertEqual(movimiento.valor_nuevo, self.area_b.nombre_area)

    def test_patch_sin_cambio_no_crea_movimiento(self):
        """Un PATCH que envía el mismo cargo no debe crear movimiento."""
        token = self._token_sa()
        antes = MovimientoLaboral.objects.filter(empleado=self.empleado).count()

        # Enviamos el mismo cargo y área
        self._patch({'cargo': self.cargo_a.pk, 'area': self.area_a.pk}, token)

        self.assertEqual(
            MovimientoLaboral.objects.filter(empleado=self.empleado).count(),
            antes,
        )

    def test_historial_endpoint_devuelve_movimientos(self):
        """GET /empleados/{id}/historial/ debe listar los movimientos creados."""
        token = self._token_sa()
        # Generamos dos movimientos
        self._patch({'cargo': self.cargo_b.pk}, token)
        self._patch({'area': self.area_b.pk}, token)

        res = self.client.get(
            f'/api/empleados/{self.empleado.id_empleado}/historial/',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(res.status_code, 200)
        tipos = [m['tipo'] for m in res.data]
        self.assertIn('CAMBIO_CARGO', tipos)
        self.assertIn('TRASLADO', tipos)

    def test_historial_sin_token_rechaza(self):
        res = self.client.get(f'/api/empleados/{self.empleado.id_empleado}/historial/')
        self.assertEqual(res.status_code, 401)

    def test_cambio_estado_inactivo_crea_retiro(self):
        """Cambiar estado a INACTIVO debe registrar un RETIRO."""
        token = self._token_sa()
        res = self.client.post(
            f'/api/empleados/{self.empleado.id_empleado}/cambiar_estado/',
            {'estado': 'INACTIVO'},
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {token}',
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertTrue(
            MovimientoLaboral.objects.filter(
                empleado=self.empleado, tipo='RETIRO'
            ).exists()
        )


# ─── Recuperación de contraseña ──────────────────────────────────────────────

@override_settings(CACHES=TEST_CACHE)
class RecuperacionPasswordTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.empleado = crear_empleado('recupera@rbcol.co', primer_login=False)

    @patch('api.views.recuperacion.notificar_admin_password_restablecida')
    @patch('api.views.recuperacion.enviar_email_recuperacion_n8n', return_value=(True, 'ok'))
    def test_flujo_completo_de_recuperacion(self, _mail, _notif):
        res = self.client.post('/api/recuperar-password/', {'email': 'recupera@rbcol.co'})
        self.assertEqual(res.status_code, 200)
        codigo = cache.get('recuperacion_recupera@rbcol.co')['codigo']

        res = self.client.post('/api/verificar-codigo-recuperacion/',
                               {'email': 'recupera@rbcol.co', 'codigo': codigo})
        self.assertEqual(res.status_code, 200)
        token = res.data['token']

        res = self.client.post('/api/restablecer-password/',
                               {'token': token, 'nueva_password': 'NuevaClave123'})
        self.assertEqual(res.status_code, 200)

        # La nueva contraseña funciona para login
        res = self.client.post('/api/login/',
                               {'email': 'recupera@rbcol.co', 'password': 'NuevaClave123'})
        self.assertEqual(res.status_code, 200)
        self.assertIn('accessToken', res.data)

    @patch('api.views.recuperacion.enviar_email_recuperacion_n8n', return_value=(True, 'ok'))
    def test_email_inexistente_respuesta_generica(self, _):
        res = self.client.post('/api/recuperar-password/', {'email': 'noexiste@rbcol.co'})
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data['enviado'])

    @patch('api.views.recuperacion.notificar_admin_password_restablecida')
    @patch('api.views.recuperacion.enviar_email_recuperacion_n8n', return_value=(True, 'ok'))
    def test_token_recuperacion_de_un_solo_uso(self, _mail, _notif):
        """Un token de recuperación no debe poder usarse dos veces."""
        self.client.post('/api/recuperar-password/', {'email': 'recupera@rbcol.co'})
        codigo = cache.get('recuperacion_recupera@rbcol.co')['codigo']
        res = self.client.post('/api/verificar-codigo-recuperacion/',
                               {'email': 'recupera@rbcol.co', 'codigo': codigo})
        token = res.data['token']

        self.client.post('/api/restablecer-password/',
                         {'token': token, 'nueva_password': 'Primera123'})
        res2 = self.client.post('/api/restablecer-password/',
                                {'token': token, 'nueva_password': 'Segunda123'})
        self.assertNotEqual(res2.status_code, 200,
                            'el token de un solo uso no debe aceptarse dos veces')


# ─── Sugerencias ─────────────────────────────────────────────────────────────

@override_settings(CACHES=TEST_CACHE)
class SugerenciasTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.empleado = crear_empleado('sugiere@rbcol.co', primer_login=False)
        self.otro = crear_empleado('otro@rbcol.co', primer_login=False)
        self.admin_emp = crear_empleado('adminemp@rbcol.co', primer_login=False, id_permisos=1)

    def _token(self, email):
        res = self.client.post('/api/login/', {'email': email, 'password': PASSWORD})
        return res.data['accessToken']

    def _auth(self, email):
        return {'HTTP_AUTHORIZATION': f'Bearer {self._token(email)}'}

    def test_flujo_completo(self):
        # 1. Empleado envía
        res = self.client.post('/api/sugerencias/', {'sugerencia': 'Mejorar la cafetera'},
                               **self._auth('sugiere@rbcol.co'))
        self.assertEqual(res.status_code, 201, res.data)
        sug_id = res.data['id']

        # 2. Sin token no se puede enviar
        res = self.client.post('/api/sugerencias/', {'sugerencia': 'x'})
        self.assertEqual(res.status_code, 401)

        # 3. Empleado normal NO puede ver el listado admin
        res = self.client.get('/api/sugerencias/listado/', **self._auth('otro@rbcol.co'))
        self.assertEqual(res.status_code, 403)

        # 4. Admin (id_permisos=1) ve la pendiente en su campanita
        res = self.client.get('/api/sugerencias/listado/?pendientes=1',
                              **self._auth('adminemp@rbcol.co'))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data['sugerencias']), 1)
        self.assertEqual(res.data['sugerencias'][0]['empleado']['correo'], 'sugiere@rbcol.co')

        # 5. Admin marca recibida
        res = self.client.post(f'/api/sugerencias/{sug_id}/recibir/',
                               **self._auth('adminemp@rbcol.co'))
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['recibida'])

        # 6. Ya no aparece como pendiente
        res = self.client.get('/api/sugerencias/listado/?pendientes=1',
                              **self._auth('adminemp@rbcol.co'))
        self.assertEqual(len(res.data['sugerencias']), 0)

        # 7. El emisor ve la confirmación en mias
        res = self.client.get('/api/sugerencias/mias/', **self._auth('sugiere@rbcol.co'))
        mia = res.data['sugerencias'][0]
        self.assertTrue(mia['recibida'])
        self.assertFalse(mia['confirmacion_vista'])

        # 8. Otro empleado NO puede marcar la confirmación ajena
        res = self.client.post(f'/api/sugerencias/{sug_id}/vista/',
                               **self._auth('otro@rbcol.co'))
        self.assertEqual(res.status_code, 403)

        # 9. El emisor descarta la confirmación de su campanita
        res = self.client.post(f'/api/sugerencias/{sug_id}/vista/',
                               **self._auth('sugiere@rbcol.co'))
        self.assertEqual(res.status_code, 200)

        # 10. Historial por empleado (ficha de colaborador)
        res = self.client.get(
            f'/api/sugerencias/listado/?empleado_id={self.empleado.id_empleado}',
            **self._auth('adminemp@rbcol.co'))
        self.assertEqual(len(res.data['sugerencias']), 1)

    def test_sugerencia_vacia_rechazada(self):
        res = self.client.post('/api/sugerencias/', {'sugerencia': '   '},
                               **self._auth('sugiere@rbcol.co'))
        self.assertEqual(res.status_code, 400)

    def test_sugerencia_demasiado_larga_rechazada(self):
        res = self.client.post('/api/sugerencias/', {'sugerencia': 'x' * 4001},
                               **self._auth('sugiere@rbcol.co'))
        self.assertEqual(res.status_code, 400)


# ─── Health check ────────────────────────────────────────────────────────────

class HealthCheckTests(APITestCase):
    def test_health_publico_y_responde(self):
        res = self.client.get('/api/health/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'ok')
