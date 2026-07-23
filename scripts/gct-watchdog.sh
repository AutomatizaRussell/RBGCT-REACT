#!/bin/bash
# =============================================================================
# Watchdog GCT (conecta-gct.rbgct.cloud) — auto-recuperación del stack Coolify.
#
# Instalación (cron del host, cada minuto):
#   * * * * * /opt/rbgct/scripts/gct-watchdog.sh >> /var/log/gct-watchdog.log 2>&1
#
# Qué hace:
#  1. Reinicia contenedores del recurso 'conecta-gct' que Docker marque unhealthy.
#  2. Chequeo interno (nginx del stack): si falla, el problema es nginx→backend.
#  3. Chequeo externo (Traefik/HTTPS): si falla 3 veces seguidas CON el interno
#     sano, el problema es Traefik→nginx (keepalive colgado) → reinicia nginx.
#  Protecciones: ignora contenedores recién arrancados (deploy en curso),
#  cooldown de 5 min entre acciones, exige fallos consecutivos (el chequeo
#  externo desde la propia VPS tiene falsos negativos esporádicos por hairpin).
#
# DRY_RUN=1 para probar sin reiniciar nada.
# =============================================================================
set -u

RESOURCE_LABEL="coolify.resourceName=conecta-gct"
EXT_HOST="${EXT_HOST:-conecta-gct.rbgct.cloud}"
EXT_URL="${EXT_URL:-https://$EXT_HOST/api/health/}"
STATE_DIR=/var/tmp/gct-watchdog
COOLDOWN_S=300         # 5 min entre acciones
MIN_UPTIME_S=180       # no tocar contenedores con menos de 3 min (deploy en curso)
EXT_FAILS_REQUIRED=3   # fallos externos consecutivos antes de actuar
LOG_MAX_BYTES=1048576  # truncar log a 1MB

mkdir -p "$STATE_DIR"
LOG=/var/log/gct-watchdog.log
[ -f "$LOG" ] && [ "$(stat -c%s "$LOG" 2>/dev/null || echo 0)" -gt "$LOG_MAX_BYTES" ] && : > "$LOG"

ts() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(ts)] $*"; }

en_cooldown() {
  local f="$STATE_DIR/last-action"
  [ -f "$f" ] && [ $(( $(date +%s) - $(cat "$f") )) -lt $COOLDOWN_S ]
}

marcar_accion() { date +%s > "$STATE_DIR/last-action"; }

uptime_s() {
  local started
  started=$(docker inspect "$1" --format '{{.State.StartedAt}}' 2>/dev/null) || return 1
  echo $(( $(date +%s) - $(date -d "$started" +%s) ))
}

reiniciar() {
  local ctn="$1" motivo="$2"
  if [ "${DRY_RUN:-0}" = "1" ]; then
    log "DRY_RUN: reiniciaría $ctn ($motivo)"
    return
  fi
  log "ACCIÓN: docker restart $ctn ($motivo)"
  docker restart "$ctn" >/dev/null 2>&1 && marcar_accion
}

# ── Localizar contenedores del stack ─────────────────────────────────────────
NGINX=$(docker ps --filter "label=$RESOURCE_LABEL" --format '{{.Names}}' | grep '^nginx-' | head -1)
BACKEND=$(docker ps --filter "label=$RESOURCE_LABEL" --format '{{.Names}}' | grep '^backend-' | head -1)

if [ -z "$NGINX" ] || [ -z "$BACKEND" ]; then
  log "AVISO: stack conecta incompleto (nginx='$NGINX' backend='$BACKEND') — ¿deploy en curso?"
  exit 0
fi

# ── 1. Contenedores unhealthy ────────────────────────────────────────────────
UNHEALTHY=$(docker ps --filter "label=$RESOURCE_LABEL" --filter health=unhealthy --format '{{.Names}}')
for ctn in $UNHEALTHY; do
  up=$(uptime_s "$ctn" || echo 0)
  if [ "$up" -lt $MIN_UPTIME_S ]; then
    log "unhealthy $ctn pero lleva ${up}s (deploy/arranque) — espero"
  elif en_cooldown; then
    log "unhealthy $ctn pero estoy en cooldown — espero"
  else
    reiniciar "$ctn" "Docker lo marca unhealthy hace >${MIN_UPTIME_S}s"
  fi
done

# ── 2. Chequeo interno: nginx del stack responde y enruta al backend ─────────
NGINX_IP=$(docker inspect "$NGINX" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' | awk '{print $1}')
INT_CODE=$(curl -s -m 8 -o /dev/null -w '%{http_code}' -H "Host: $EXT_HOST" "http://$NGINX_IP/api/health/" 2>/dev/null)
INT_CODE=${INT_CODE:-000}

if [ "$INT_CODE" != "200" ]; then
  log "FALLO interno: nginx($NGINX_IP)/api/health/ -> $INT_CODE"
  up=$(uptime_s "$BACKEND" || echo 0)
  if en_cooldown; then
    log "en cooldown — no actúo"
  elif [ "$INT_CODE" = "503" ]; then
    # Django responde pero BD/cache degradadas: reiniciar backend no arregla la BD;
    # solo registrar (el unhealthy de Docker actuará si aplica).
    log "503 = BD o cache degradadas; revisar db/redis manualmente"
  elif [ "$up" -ge $MIN_UPTIME_S ]; then
    reiniciar "$NGINX" "ruta interna nginx→backend rota (código $INT_CODE)"
  fi
  # Con el interno roto no evaluamos el externo este ciclo.
  rm -f "$STATE_DIR/ext-fails"
  exit 0
fi

# ── 3. Chequeo externo: Traefik → nginx (HTTPS, vía loopback para no depender
#       del hairpin NAT del VPS; prueba TLS + routing + nginx + backend) ─────
EXT_CODE=$(curl -s -m 10 -o /dev/null -w '%{http_code}' \
  --resolve "$EXT_HOST:443:127.0.0.1" "$EXT_URL" 2>/dev/null)
EXT_CODE=${EXT_CODE:-000}

if [ "$EXT_CODE" = "200" ]; then
  rm -f "$STATE_DIR/ext-fails"
  exit 0
fi

FAILS=$(( $(cat "$STATE_DIR/ext-fails" 2>/dev/null || echo 0) + 1 ))
echo "$FAILS" > "$STATE_DIR/ext-fails"
log "FALLO externo #$FAILS: $EXT_URL -> $EXT_CODE (interno OK)"

if [ "$FAILS" -ge $EXT_FAILS_REQUIRED ]; then
  if en_cooldown; then
    log "umbral alcanzado pero en cooldown — espero"
  else
    # Interno sano + externo roto = Traefik↔nginx (keepalive colgado conocido).
    reiniciar "$NGINX" "Traefik no alcanza nginx hace $FAILS min con ruta interna sana"
    rm -f "$STATE_DIR/ext-fails"
  fi
fi
