from django.apps import AppConfig


class EmpleadosConfig(AppConfig):
    name = 'empleados'
    verbose_name = 'Empleados'

    def ready(self):
        import empleados.signals  # noqa: F401
