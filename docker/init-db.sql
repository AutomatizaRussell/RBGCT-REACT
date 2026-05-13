-- Crear schemas
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS clientes;

-- Conceder permisos al usuario rbgct
GRANT ALL PRIVILEGES ON SCHEMA public TO rbgct;
GRANT ALL PRIVILEGES ON SCHEMA clientes TO rbgct;

-- Establecer búsqueda de esquemas
ALTER USER rbgct SET search_path TO public, clientes;
