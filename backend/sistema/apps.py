from django.apps import AppConfig


class SistemaConfig(AppConfig):
    name = 'sistema'
    verbose_name = 'Sistema'

    def ready(self):
        pass  # signals si se añaden en el futuro
