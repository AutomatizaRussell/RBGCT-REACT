"""
Integraciones externas: proxy n8n.
"""
import hashlib
import logging

from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
import requests

from ..permissions import IsAdminOrSuperAdmin

from ._utils import (
    N8N_STATUS_CACHE_TTL,
    N8N_EXECUTIONS_CACHE_TTL,
    N8N_FAILURE_COOLDOWN,
    _es_superadmin,
)
from ..n8n_gateway import sincronizar_ejecuciones_async

logger = logging.getLogger(__name__)


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrSuperAdmin])
@throttle_classes([UserRateThrottle])
def n8n_proxy(request):
    """
    Proxy server-side hacia n8n.
    actions:
      ?action=status      → verifica si n8n está online
      ?action=executions  → retorna historial de ejecuciones (requiere API key)
      ?action=pendientes  → retorna solicitudes pendientes (webhook Pendientes)
    """
    from django.conf import settings as django_settings
    import time

    action = request.query_params.get('action', 'executions')
    sync_logs = request.query_params.get('sync', 'false').lower() == 'true'
    base_url = getattr(django_settings, 'N8N_BASE_URL', '')
    api_key = getattr(django_settings, 'N8N_WEBHOOK_API_KEY', '')

    if not base_url:
        return Response({'error': 'N8N_BASE_URL no configurado en el backend'}, status=503)

    base_hash = hashlib.sha1(base_url.encode('utf-8')).hexdigest()[:10]

    if action == 'status':
        cache_key = f'api:n8n:status:v2:{base_hash}'
        fail_key = f'{cache_key}:fail'
        cached_payload = cache.get(cache_key)

        if cached_payload and cache.get(fail_key):
            return Response({**cached_payload, 'cached': True, 'stale': True})

        try:
            start = time.time()
            resp = requests.get(f'{base_url}/healthz', timeout=(2, 3))
            ms = round((time.time() - start) * 1000)
            payload = {
                'connected': resp.status_code in (200, 204),
                'ping': ms,
                'base_url': base_url,
            }
            cache.set(cache_key, payload, timeout=N8N_STATUS_CACHE_TTL)
            cache.delete(fail_key)
            return Response(payload)
        except requests.exceptions.ConnectionError:
            cache.set(fail_key, True, timeout=N8N_FAILURE_COOLDOWN)
            if cached_payload:
                return Response({**cached_payload, 'cached': True, 'stale': True,
                                 'warning': 'n8n no disponible; mostrando último estado exitoso'})
            return Response({'error': f'No se pudo conectar con n8n en {base_url}'}, status=503)
        except requests.exceptions.Timeout:
            cache.set(fail_key, True, timeout=N8N_FAILURE_COOLDOWN)
            if cached_payload:
                return Response({**cached_payload, 'cached': True, 'stale': True,
                                 'warning': 'n8n tardó en responder; mostrando último estado exitoso'})
            return Response({'error': 'n8n tardó demasiado en responder'}, status=504)
        except Exception as e:
            logger.error(f"[N8N PROXY] Error en status: {e}")
            if cached_payload:
                return Response({**cached_payload, 'cached': True, 'stale': True})
            return Response({'error': 'Error interno consultando estado de n8n'}, status=500)

    if action == 'pendientes':
        webhook_url = f'{base_url}/webhook/Pendientes' if base_url else 'https://n8n.rbgct.cloud/webhook/Pendientes'
        try:
            if request.method == 'POST':
                resp = requests.post(webhook_url, json=request.data, timeout=(3, 12))
            else:
                resp = requests.get(webhook_url, timeout=(3, 12))
            if resp.status_code == 500 and 'No Respond to Webhook node found' in (resp.text or ''):
                return Response({'ok': True,
                                 'warning': 'n8n ejecutó el webhook sin nodo de respuesta.'}, status=200)
            if resp.status_code >= 400:
                detail = ''
                try:
                    detail = resp.text[:2000]
                except Exception:
                    pass
                payload = {'error': f'n8n devolvió HTTP {resp.status_code} en Pendientes'}
                if detail:
                    payload['detail'] = detail
                return Response(payload, status=502)
            if not resp.text:
                return Response({}, status=200)
            try:
                payload = resp.json()
            except Exception:
                return Response({'error': 'Respuesta inválida desde Pendientes'}, status=502)
            return Response(payload)
        except requests.exceptions.Timeout:
            return Response({'error': 'n8n tardó demasiado en responder (Pendientes)'}, status=504)
        except requests.exceptions.ConnectionError:
            return Response({'error': 'No se pudo conectar con n8n (Pendientes)'}, status=503)
        except Exception as e:
            logger.error(f"[N8N PROXY] Error en pendientes: {e}")
            return Response({'error': 'Error interno consultando Pendientes'}, status=500)

    if action == 'clientes_sqf':
        webhook_url = f'{base_url}/webhook/clientes-crud' if base_url else 'https://n8n.rbgct.cloud/webhook/clientes-crud'
        cache_key = 'api:n8n:clientes_sqf:v1'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)
        try:
            resp = requests.get(webhook_url, timeout=(3, 15))
            if resp.status_code >= 400:
                return Response({'error': f'n8n devolvió HTTP {resp.status_code}'}, status=502)
            if not resp.text:
                return Response([], status=200)
            data = resp.json()
            if not isinstance(data, list):
                data = [data] if isinstance(data, dict) else []
            cache.set(cache_key, data, timeout=120)
            return Response(data)
        except requests.exceptions.Timeout:
            return Response({'error': 'n8n tardó demasiado en responder'}, status=504)
        except requests.exceptions.ConnectionError:
            return Response({'error': 'No se pudo conectar con n8n'}, status=503)
        except Exception as e:
            logger.error(f"[N8N PROXY] Error en clientes_sqf: {e}")
            return Response({'error': 'Error consultando clientes SQF'}, status=500)

    if action == 'executions':
        if not api_key:
            return Response({'error': 'N8N_WEBHOOK_API_KEY no configurado'}, status=503)

        status_filter = request.query_params.get('status')
        limit = request.query_params.get('limit', 50)
        try:
            limit = int(limit)
        except (TypeError, ValueError):
            limit = 50
        limit = max(1, min(limit, 100))

        if sync_logs and not _es_superadmin(request.user):
            return Response({'error': 'Solo SuperAdmin puede sincronizar logs de n8n'},
                            status=status.HTTP_403_FORBIDDEN)

        status_key = (status_filter or 'ALL').upper()
        cache_key = f'api:n8n:executions:v2:{base_hash}:{status_key}:{limit}'
        fail_key = f'{cache_key}:fail'
        cached_payload = cache.get(cache_key)

        if cached_payload and cache.get(fail_key) and not sync_logs:
            return Response({**cached_payload, 'cached': True, 'stale': True})

        if cached_payload and not sync_logs:
            return Response({**cached_payload, 'cached': True})

        params = {'limit': limit}
        if status_filter and status_filter.upper() != 'ALL':
            params['status'] = status_filter.lower()

        try:
            resp = requests.get(
                f'{base_url}/api/v1/executions',
                headers={'X-N8N-API-KEY': api_key},
                params=params,
                timeout=(3, 5),
            )
        except requests.exceptions.ConnectionError:
            cache.set(fail_key, True, timeout=N8N_FAILURE_COOLDOWN)
            if cached_payload and not sync_logs:
                return Response({**cached_payload, 'cached': True, 'stale': True,
                                 'warning': 'n8n no disponible; mostrando último resultado exitoso'})
            return Response({'error': f'No se pudo conectar con n8n en {base_url}'}, status=503)
        except requests.exceptions.Timeout:
            cache.set(fail_key, True, timeout=N8N_FAILURE_COOLDOWN)
            if cached_payload and not sync_logs:
                return Response({**cached_payload, 'cached': True, 'stale': True,
                                 'warning': 'n8n tardó en responder; mostrando último resultado exitoso'})
            return Response({'error': 'n8n tardó demasiado en responder'}, status=504)

        if resp.status_code != 200:
            if cached_payload and not sync_logs:
                return Response({**cached_payload, 'cached': True, 'stale': True,
                                 'warning': f'n8n devolvió HTTP {resp.status_code}; mostrando último resultado exitoso'})
            return Response({'error': f'n8n respondió con HTTP {resp.status_code}'}, status=resp.status_code)

        try:
            raw = resp.json()
        except ValueError:
            return Response({'error': 'Respuesta inválida de n8n'}, status=502)
        execs = raw.get('data', raw) if isinstance(raw, dict) else raw
        execs = execs if isinstance(execs, list) else []

        synced = 0
        if sync_logs and execs:
            sincronizar_ejecuciones_async(execs[:100])
            synced = 'enqueued'

        payload = {'data': execs, 'synced': synced}
        if not sync_logs:
            cache.set(cache_key, payload, timeout=N8N_EXECUTIONS_CACHE_TTL)
            cache.delete(fail_key)
        return Response(payload)

    return Response({'error': 'Acción no válida. Usa action=status o action=executions'}, status=400)
