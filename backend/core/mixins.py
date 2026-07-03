class UppercaseFieldsMixin:
    """Convierte a mayúsculas los campos listados en UPPERCASE_FIELDS antes de guardar."""
    UPPERCASE_FIELDS: list[str] = []

    def save(self, *args, **kwargs):
        for field in self.UPPERCASE_FIELDS:
            v = getattr(self, field, None)
            if v:
                setattr(self, field, v.upper())
        super().save(*args, **kwargs)
