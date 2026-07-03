from django.apps import AppConfig


class ContratosConfig(AppConfig):
    name = 'contratos'
    verbose_name = 'Contratos'

    def ready(self):
        import contratos.signals  # noqa: F401
