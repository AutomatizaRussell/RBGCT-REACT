from django.apps import AppConfig


class TareasConfig(AppConfig):
    name = 'tareas'
    verbose_name = 'Tareas'

    def ready(self):
        pass
