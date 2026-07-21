#!/usr/bin/env bash
# Script automático: restaura stiben desde el backup anterior y migra datos de empleados desde main.
# Uso: bash scripts/auto_migrate_empleados.sh

set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

DB_MAIN_CONTAINER=$(docker ps -aq --filter "name=db-hqso6bdpvt" | head -1)
DB_STIBEN_CONTAINER=$(docker ps -aq --filter "name=db-n10dvijz" | head -1)

if [ -z "$DB_MAIN_CONTAINER" ]; then
  echo "ERROR: No se encontró el contenedor de BD de main (db-hqso6bdpvt)"
  exit 1
fi

if [ -z "$DB_STIBEN_CONTAINER" ]; then
  echo "ERROR: No se encontró el contenedor de BD de stiben (db-n10dvijz)"
  exit 1
fi

# Extraer credenciales automáticamente del contenedor de stiben
DB_USER=$(docker exec "$DB_STIBEN_CONTAINER" printenv POSTGRES_USER || docker exec "$DB_STIBEN_CONTAINER" printenv DB_USER || echo "")
DB_PASSWORD=$(docker exec "$DB_STIBEN_CONTAINER" printenv POSTGRES_PASSWORD || docker exec "$DB_STIBEN_CONTAINER" printenv DB_PASSWORD || echo "")
DB_NAME=$(docker exec "$DB_STIBEN_CONTAINER" printenv POSTGRES_DB || docker exec "$DB_STIBEN_CONTAINER" printenv DB_NAME || echo "")

if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
  echo "ERROR: No se pudieron obtener las credenciales del contenedor de BD de stiben."
  echo "Variables esperadas: POSTGRES_USER/DB_USER, POSTGRES_PASSWORD/DB_PASSWORD, POSTGRES_DB/DB_NAME"
  exit 1
fi

echo "Usuario: $DB_USER"
echo "Base:    $DB_NAME"
echo "Contenedor main:   $DB_MAIN_CONTAINER"
echo "Contenedor stiben: $DB_STIBEN_CONTAINER"
echo ""

# Buscar el backup más reciente de stiben
BACKUP_FILE=$(ls -t /tmp/stiben_backup_*.sql 2>/dev/null | head -1)

if [ -z "$BACKUP_FILE" ]; then
  echo "ERROR: No se encontró un backup de stiben en /tmp/stiben_backup_*.sql"
  echo "No se puede restaurar. Abortando."
  exit 1
fi

echo "Backup encontrado: $BACKUP_FILE"
echo "[1/3] Restaurando stiben desde el backup ..."
docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$DB_STIBEN_CONTAINER" \
  psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
echo "Restauración completada."
echo ""

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="/tmp/main_empleados_${TIMESTAMP}.sql"
TRANSFORMED_FILE="/tmp/main_empleados_${TIMESTAMP}_transformed.sql"

echo "[2/3] Exportando datos de empleados desde main ..."
docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_MAIN_CONTAINER" \
  pg_dump --data-only --inserts --no-owner --no-privileges \
    -U "$DB_USER" -d "$DB_NAME" \
    -t datos_area -t datos_cargo -t persona -t datos_contacto -t empleado \
    > "$DUMP_FILE"
echo "Dump completado: $DUMP_FILE"
echo ""

echo "[3/3] Cargando datos en stiben ..."
{
  echo "SET search_path = empleados, public;"
  echo "BEGIN;"
  # Truncar tablas destino sin CASCADE, en orden correcto
  echo "TRUNCATE TABLE empleados.empleado;"
  echo "TRUNCATE TABLE empleados.datos_contacto;"
  echo "TRUNCATE TABLE empleados.persona;"
  echo "TRUNCATE TABLE empleados.datos_area;"
  echo "TRUNCATE TABLE empleados.datos_cargo;"
  # Reemplazar esquemas y nombres de tabla
  sed \
    -e 's/INSERT INTO "\?public\.\?datos_area"\?/INSERT INTO empleados.datos_area/g' \
    -e 's/INSERT INTO "\?public\.\?datos_cargo"\?/INSERT INTO empleados.datos_cargo/g' \
    -e 's/INSERT INTO "\?public\.\?persona"\?/INSERT INTO empleados.persona/g' \
    -e 's/INSERT INTO "\?public\.\?datos_contacto"\?/INSERT INTO empleados.datos_contacto/g' \
    -e 's/INSERT INTO "\?public\.\?empleado"\?/INSERT INTO empleados.empleado/g' \
    -e 's/INSERT INTO "\?datos_area"\?/INSERT INTO empleados.datos_area/g' \
    -e 's/INSERT INTO "\?datos_cargo"\?/INSERT INTO empleados.datos_cargo/g' \
    -e 's/INSERT INTO "\?persona"\?/INSERT INTO empleados.persona/g' \
    -e 's/INSERT INTO "\?datos_contacto"\?/INSERT INTO empleados.datos_contacto/g' \
    -e 's/INSERT INTO "\?empleado"\?/INSERT INTO empleados.empleado/g' \
    -e 's/SET search_path = [^;]*;//g' \
    "$DUMP_FILE"
  echo "COMMIT;"
  # Reiniciar secuencias
  echo "SELECT setval('empleados.datos_area_id_area_seq', COALESCE((SELECT MAX(id_area) FROM empleados.datos_area), 1), true);"
  echo "SELECT setval('empleados.datos_cargo_id_cargo_seq', COALESCE((SELECT MAX(id_cargo) FROM empleados.datos_cargo), 1), true);"
  echo "SELECT setval('empleados.persona_id_persona_seq', COALESCE((SELECT MAX(id_persona) FROM empleados.persona), 1), true);"
  echo "SELECT setval('empleados.datos_contacto_id_seq', COALESCE((SELECT MAX(id) FROM empleados.datos_contacto), 1), true);"
  echo "SELECT setval('empleados.empleado_id_empleado_seq', COALESCE((SELECT MAX(id_empleado) FROM empleados.empleado), 1), true);"
} > "$TRANSFORMED_FILE"

docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$DB_STIBEN_CONTAINER" \
  psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$TRANSFORMED_FILE"

echo ""
echo "Migración completada. Conteos:"
docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_STIBEN_CONTAINER" \
  psql -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 'areas' AS tabla, COUNT(*) AS total FROM empleados.datos_area
UNION ALL
SELECT 'cargos', COUNT(*) FROM empleados.datos_cargo
UNION ALL
SELECT 'personas', COUNT(*) FROM empleados.persona
UNION ALL
SELECT 'contactos', COUNT(*) FROM empleados.datos_contacto
UNION ALL
SELECT 'empleados', COUNT(*) FROM empleados.empleado;
"

echo ""
echo "Backup de stiben: $BACKUP_FILE"
