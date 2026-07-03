from django.db import models
from rbgct.sharepoint_storage import SharePointN8nStorage


class ReglamentoItem(models.Model):
    titulo    = models.CharField(max_length=200)
    contenido = models.TextField(blank=True, default='')
    archivo   = models.FileField(
        upload_to='reglamento/', blank=True, null=True,
        storage=SharePointN8nStorage(), max_length=500,
    )
    orden      = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"formacion"."reglamento_item"'
        ordering = ['orden']

    def __str__(self):
        return self.titulo
