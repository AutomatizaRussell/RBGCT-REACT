"""
Validación centralizada de contraseñas para el proyecto RBGCT.

Se aplica en todos los endpoints que crean o cambian contraseñas de empleados
y superadmins, garantizando una política mínima de seguridad coherente en toda
la aplicación.
"""
import re


class PasswordValidationError(ValueError):
    """Contraseña rechazada por no cumplir la política de seguridad."""
    pass


# Contraseñas comunes que no deben permitirse nunca.
# Se puede ampliar con una lista más completa si es necesario.
COMMON_PASSWORDS = {
    'password', '123456', '12345678', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey',
}


def validate_password(password: str, min_length: int = 8) -> None:
    """
    Valida que una contraseña cumpla la política de seguridad del sistema.

    Requisitos:
      - Mínimo `min_length` caracteres (por defecto 8).
      - Al menos una letra mayúscula.
      - Al menos una letra minúscula.
      - Al menos un dígito.
      - Al menos un carácter especial.
      - No puede ser una contraseña común.
      - No puede contener espacios al inicio o final.

    Levanta PasswordValidationError con un mensaje descriptivo si no cumple.
    """
    if not password:
        raise PasswordValidationError('La contraseña es requerida.')

    if len(password) < min_length:
        raise PasswordValidationError(
            f'La contraseña debe tener al menos {min_length} caracteres.'
        )

    if password != password.strip():
        raise PasswordValidationError(
            'La contraseña no puede contener espacios al inicio o final.'
        )

    if not re.search(r'[A-Z]', password):
        raise PasswordValidationError(
            'La contraseña debe contener al menos una letra mayúscula.'
        )

    if not re.search(r'[a-z]', password):
        raise PasswordValidationError(
            'La contraseña debe contener al menos una letra minúscula.'
        )

    if not re.search(r'\d', password):
        raise PasswordValidationError(
            'La contraseña debe contener al menos un número.'
        )

    if not re.search(r'[!@#$%^&*(),.?":{}|<>\[\]\\/\-_=+`~\'";]', password):
        raise PasswordValidationError(
            'La contraseña debe contener al menos un carácter especial.'
        )

    if password.lower() in COMMON_PASSWORDS:
        raise PasswordValidationError(
            'La contraseña es demasiado común. Elige una más segura.'
        )


def validate_password_or_400(password: str, min_length: int = 8) -> dict | None:
    """
    Envuelve validate_password para devolver un dict de error compatible con
    los endpoints que devuelven {'success': False, 'error': ...}.

    Devuelve None si la contraseña es válida.
    """
    try:
        validate_password(password, min_length)
        return None
    except PasswordValidationError as exc:
        return {'success': False, 'error': str(exc)}
