#!/usr/bin/env python
"""
Script para establecer la contraseña del SuperAdmin.
Ejecutar: python set_admin_password.py
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rbgct.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

import bcrypt
from api.models import SuperAdmin

def set_superadmin_password(email, new_password):
    """Establece la contraseña de un SuperAdmin"""
    try:
        admin = SuperAdmin.objects.get(email=email)
        
        # Generar hash con bcrypt
        hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        admin.password_hash = hashed.decode('utf-8')
        admin.save()
        
        print(f"✅ Contraseña actualizada exitosamente para: {email}")
        print(f"   Hash generado: {admin.password_hash[:20]}...")
        return True
    except SuperAdmin.DoesNotExist:
        print(f"❌ SuperAdmin no encontrado: {email}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == '__main__':
    # Cambiar estos valores según necesites
    ADMIN_EMAIL = "test-admin@rbcol.co"  # Email del SuperAdmin
    NEW_PASSWORD = "admin123"  # Nueva contraseña
    
    print("=" * 50)
    print("CONFIGURACIÓN DE CONTRASEÑA SUPERADMIN")
    print("=" * 50)
    
    success = set_superadmin_password(ADMIN_EMAIL, NEW_PASSWORD)
    
    if success:
        print("\n✅ Listo! Ahora puedes usar 'Cambiar Contraseña' con estas credenciales:")
        print(f"   Email: {ADMIN_EMAIL}")
        print(f"   Contraseña: {NEW_PASSWORD}")
    else:
        print("\n❌ No se pudo actualizar la contraseña")
        sys.exit(1)
