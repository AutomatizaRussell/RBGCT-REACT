import hashlib

from django.db import migrations


def hash_existing_keys(apps, schema_editor):
    """Convierte las API keys almacenadas en texto plano a hashes SHA-256."""
    ApiKey = apps.get_model('sistema', 'ApiKey')
    for api_key in ApiKey.objects.all():
        # Si ya parece un hash SHA-256 (64 hex chars), no la tocamos.
        if api_key.key_hash and len(api_key.key_hash) == 64:
            continue
        api_key.key_hash = hashlib.sha256(
            api_key.key_hash.encode('utf-8')
        ).hexdigest()
        api_key.save(update_fields=['key_hash'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('sistema', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='apikey',
            old_name='key',
            new_name='key_hash',
        ),
        migrations.RunPython(hash_existing_keys, reverse_code=noop),
    ]
