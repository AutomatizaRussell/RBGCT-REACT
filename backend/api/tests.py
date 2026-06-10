"""
Tests de los flujos críticos de autenticación y onboarding.

Ejecutar:  python manage.py test api -v 2

Cubren los bugs reales encontrados en producción (jun 2026):
- Código 2FA expirado al primer login (se generaba solo al crear el usuario).
- Error 500 en completar-datos por Personas residuales reteniendo documentos.
- completar-datos abierto (AllowAny) permitía tomar cuentas en onboarding.
"""
from unittest.mock import patch

import bcrypt
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

from .models import DatosEmpleado, Persona, SuperAdmin

PASSWORD = 'Prueba123!'

TEST_CACHE = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'tests',
    }
}


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


@override_settings(CACHES=TEST_CACHE)
class LoginPrimerIngresoTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.empleado = crear_empleado('nuevo@rbcol.co')

    @patch('api.views.enviar_email_verificacion', return_value=(True, 'ok'))
    def test_login_regenera_codigo_si_no_hay_en_cache(self, mock_email):
        """El código del alta dura 15 min; el login debe regenerarlo si expiró."""
        res = self.client.post('/api/login/', {'email': 'nuevo@rbcol.co', 'password': PASSWORD})
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['requiere_verificacion'])
        datos = cache.get('verificacion_nuevo@rbcol.co')
        self.assertIsNotNone(datos, 'login debe dejar un código vigente en cache')
        self.assertTrue(datos['password_verificada'])
        mock_email.assert_called_once()

    @patch('api.views.enviar_email_verificacion', return_value=(True, 'ok'))
    def test_verificar_codigo_sin_password_tras_login(self, _):
        """El frontend no reenvía la contraseña al verificar: no debe exigirla."""
        self.client.post('/api/login/', {'email': 'nuevo@rbcol.co', 'password': PASSWORD})
        codigo = cache.get('verificacion_nuevo@rbcol.co')['codigo']
        res = self.client.post('/api/verificar-codigo/', {'email': 'nuevo@rbcol.co', 'codigo': codigo})
        self.assertEqual(res.status_code, 200)
        self.assertIn('accessToken', res.data)

    @patch('api.views.enviar_email_verificacion', return_value=(True, 'ok'))
    def test_reenviar_codigo_preserva_password_verificada(self, _):
        self.client.post('/api/login/', {'email': 'nuevo@rbcol.co', 'password': PASSWORD})
        self.client.post('/api/enviar-codigo/', {'email': 'nuevo@rbcol.co'})
        datos = cache.get('verificacion_nuevo@rbcol.co')
        self.assertTrue(datos['password_verificada'],
                        'el reenvío no debe exigir password que el frontend no envía')

    @patch('api.views.enviar_email_verificacion', return_value=(True, 'ok'))
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


@override_settings(CACHES=TEST_CACHE)
class CompletarDatosTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.empleado = crear_empleado('uno@rbcol.co')
        self.otro = crear_empleado('dos@rbcol.co')

    def _token(self, email):
        with patch('api.views.enviar_email_verificacion', return_value=(True, 'ok')):
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

    @patch('api.views.enviar_email_verificacion', return_value=(True, 'ok'))
    def test_superadmin_crea_usuario_y_normaliza_email(self, _):
        token = self._token_superadmin()
        res = self.client.post('/api/crear-usuario/', {
            'admin_email': 'admin@rbcol.co', 'admin_password': PASSWORD,
            'correo_corporativo': 'MAYUSCULAS@Rbcol.co', 'password': 'Clave123!',
        }, HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertTrue(
            DatosEmpleado.objects.filter(correo_corporativo='mayusculas@rbcol.co').exists())


@override_settings(CACHES=TEST_CACHE)
class RecuperacionPasswordTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.empleado = crear_empleado('recupera@rbcol.co', primer_login=False)

    @patch('api.views.notificar_admin_password_restablecida')
    @patch('api.views.enviar_email_recuperacion_n8n', return_value=(True, 'ok'))
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

    @patch('api.views.enviar_email_recuperacion_n8n', return_value=(True, 'ok'))
    def test_email_inexistente_respuesta_generica(self, _):
        res = self.client.post('/api/recuperar-password/', {'email': 'noexiste@rbcol.co'})
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data['enviado'])
