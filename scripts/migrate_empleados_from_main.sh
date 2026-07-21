#!/usr/bin/env bash
# Migración de datos personales y de empleado desde la BD de "main" a "stiben".
# Uso: ejecutar desde /opt/rbgct (raíz del proyecto stiben).
# No modifica NADA en la base de datos de main; solo lee con pg_dump.

set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

# ── Configuración ───────────────────────────────────────────────────────────
# Cargar variables de entorno del proyecto stiben si existe un .env
[ -f .env ] && source .env

DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-rbgct}"
DB_PASSWORD="${DB_PASSWORD:-}"

if [ -z "$DB_PASSWORD" ]; then
  echo "ERROR: DB_PASSWORD no está definida. Asegúrate de tener un .env cargado."
  exit 1
fi

DB_MAIN_CONTAINER=$(docker ps -aq --filter "name=db-hqso6bdpvt" | head -1)
DB_STIBEN_CONTAINER=$(docker ps -aq --filter "name=db-n10dvijz" | head -1)

if [ -z "$DB_MAIN_CONTAINER" ]; then
  echo "ERROR: No se encontró el contenedor de BD de main (filtro: db-hqso6bdpvt)"
  exit 1
fi

if [ -z "$DB_STIBEN_CONTAINER" ]; then
  echo "ERROR: No se encontró el contenedor de BD de stiben (filtro: db-n10dvijz)"
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/stiben_backup_${TIMESTAMP}.sql"
DUMP_FILE="/tmp/main_empleados_${TIMESTAMP}.sql"
TRANSFORMED_FILE="/tmp/main_empleados_${TIMESTAMP}_transformed.sql"

echo "Contenedor BD main:   $DB_MAIN_CONTAINER"
echo "Contenedor BD stiben: $DB_STIBEN_CONTAINER"
echo "Base de datos:        $DB_NAME"
echo "Usuario:              $DB_USER"
echo ""

# ── 1. Backup de stiben ───────────────────────────────────────────────────
echo "[1/6] Creando backup completo de stiben en $BACKUP_FILE ..."
docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_STIBEN_CONTAINER" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
echo "Backup completado: $BACKUP_FILE"
echo ""

# ── 2. Dump de datos de empleados desde main ───────────────────────────────
echo "[2/6] Exportando datos de empleados desde main ..."
docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_MAIN_CONTAINER" \
  pg_dump --data-only --inserts --no-owner --no-privileges \
    -U "$DB_USER" -d "$DB_NAME" \
    -t datos_area -t datos_cargo -t persona -t datos_contacto -t empleado \
    > "$DUMP_FILE"
echo "Dump completado: $DUMP_FILE"
echo ""

# ── 3. Transformar SQL para esquemas de stiben ────────────────────────────
echo "[3/6] Transformando SQL para insertar en esquemas 'empleados.*' ..."
{
  echo "SET search_path = empleados, public;"
  echo "BEGIN;"
  # Truncar tablas destino para evitar duplicados (el usuario pidió "traer" los datos)
  echo "TRUNCATE TABLE empleados.datos_area, empleados.datos_cargo, empleados.persona, empleados.datos_contacto, empleados.empleado CASCADE;"
  # Forzar nombres de tabla con schema empleados
  sed \
    -e 's/INSERT INTO "\?datos_area"\?/INSERT INTO empleados.datos_area/g' \
    -e 's/INSERT INTO "\?datos_cargo"\?/INSERT INTO empleados.datos_cargo/g' \
    -e 's/INSERT INTO "\?persona"\?/INSERT INTO empleados.persona/g' \
    -e 's/INSERT INTO "\?datos_contacto"\?/INSERT INTO empleados.datos_contacto/g' \
    -e 's/INSERT INTO "\?empleado"\?/INSERT INTO empleados.empleado/g' \
    -e 's/SET search_path = [^;]*;//g' \
    "$DUMP_FILE"
  echo "COMMIT;"
} > "$TRANSFORMED_FILE"
echo "Transformación completada: $TRANSFORMED_FILE"
echo ""

# ── 4. Cargar en stiben ────────────────────────────────────────────────────
echo "[4/6] Cargando datos transformados en stiben ..."
docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$DB_STIBEN_CONTAINER" \
  psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$TRANSFORMED_FILE"
echo "Carga completada."
echo ""

# ── 5. Reiniciar secuencias ─────────────────────────────────────────────────
echo "[5/6] Reiniciando secuencias de autoincrementales ..."
docker exec -e PGPASSWORD="$DB_PASSWORD" "$DB_STIBEN_CONTAINER" \
  psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -c "
SELECT setval('empleados.datos_area_id_area_seq', COALESCE((SELECT MAX(id_area) FROM empleados.datos_area), 1), true);
SELECT setval('empleados.datos_cargo_id_cargo_seq', COALESCE((SELECT MAX(id_cargo) FROM empleados.datos_cargo), 1), true);
SELECT setval('empleados.persona_id_persona_seq', COALESCE((SELECT MAX(id_persona) FROM empleados.persona), 1), true);
SELECT setval('empleados.datos_contacto_id_seq', COALESCE((SELECT MAX(id) FROM empleados.datos_contacto), 1), true);
SELECT setval('empleados.empleado_id_empleado_seq', COALESCE((SELECT MAX(id_empleado) FROM empleados.empleado), 1), true);
"
echo "Secuencias reiniciadas."
echo ""

# ── 6. Verificación ────────────────────────────────────────────────────────
echo "[6/6] Verificando conteos ..."
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
echo "Migración completada."
echo "Backup de stiben: $BACKUP_FILE"
