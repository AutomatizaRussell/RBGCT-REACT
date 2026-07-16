#!/usr/bin/env python
"""
Scheduler simple para sincronizar clientes desde n8n todos los días a medianoche.
Se ejecuta como servicio Docker independiente (rbgct-scheduler).
"""
import os
import time
import logging
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rbgct.settings')
import django  # noqa: E402
django.setup()

from clientes.n8n_clientes import importar_clientes_desde_n8n  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
)
logger = logging.getLogger(__name__)


def segundos_hasta_medianoche():
    ahora = datetime.now()
    siguiente = (ahora + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return (siguiente - ahora).total_seconds()


def main():
    logger.info('Scheduler de sincronización de clientes iniciado.')
    while True:
        segundos = segundos_hasta_medianoche()
        logger.info(f'Esperando {segundos:.0f} segundos hasta la medianoche...')
        time.sleep(segundos)

        logger.info('Ejecutando sincronización de clientes desde n8n...')
        try:
            resultado = importar_clientes_desde_n8n(solo_nuevos=True)
            if 'error' in resultado:
                logger.error(f'Sincronización fallida: {resultado["error"]}')
            else:
                logger.info(
                    'Sincronización finalizada: recibidos=%(recibidos)d, '
                    'creados=%(creados)d, actualizados=%(actualizados)d, '
                    'contactos=%(contactos_creados)d, errores=%(errores)d, omitidos=%(omitidos)d',
                    resultado,
                )
        except Exception as e:
            logger.exception(f'Error inesperado sincronizando clientes: {e}')


if __name__ == '__main__':
    main()
