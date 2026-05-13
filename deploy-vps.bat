@echo off
setlocal

REM ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
set VPS_IP=72.60.165.161
set VPS_USER=root
set VPS_PATH=/home/gct
set SSH=%VPS_USER%@%VPS_IP%

REM ─────────────────────────────────────────────────────────────────────────────

if "%1"=="upload" goto UPLOAD
if "%1"=="deploy" goto DEPLOY
if "%1"=="logs" goto LOGS
if "%1"=="restart" goto RESTART
if "%1"=="ssh" goto SSH_CONNECT
if "%1"=="status" goto STATUS
goto HELP

:UPLOAD
echo.
echo [1/4] Creando paquete limpio con git archive...
git archive --format=zip HEAD -o gct-deploy.zip
if errorlevel 1 (
    echo ERROR: Fallo git archive. Asegurate de tener commits en el repo.
    goto END
)
echo [2/4] Creando directorio en el VPS...
ssh %SSH% "mkdir -p %VPS_PATH%"
echo [3/4] Subiendo paquete al VPS...
scp gct-deploy.zip %SSH%:%VPS_PATH%/gct-deploy.zip
echo [4/4] Extrayendo en el VPS y subiendo .env...
ssh %SSH% "cd %VPS_PATH% && unzip -o gct-deploy.zip && rm gct-deploy.zip"
scp backend\.env %SSH%:%VPS_PATH%/backend/.env
del gct-deploy.zip
echo.
echo Listo. Ahora ejecuta: deploy-vps.bat deploy
goto END

:DEPLOY
echo.
echo Desplegando en el VPS (puede tardar 10-15 min la primera vez)...
ssh %SSH% "cd %VPS_PATH% && docker compose -f docker-compose.prod.yml --env-file backend/.env up -d --build"
echo.
echo Para ver el progreso: deploy-vps.bat logs
goto END

:LOGS
ssh %SSH% "cd %VPS_PATH% && docker compose -f docker-compose.prod.yml logs --tail=50 -f"
goto END

:STATUS
ssh %SSH% "cd %VPS_PATH% && docker compose -f docker-compose.prod.yml ps"
goto END

:RESTART
ssh %SSH% "cd %VPS_PATH% && docker compose -f docker-compose.prod.yml restart"
goto END

:SSH_CONNECT
ssh %SSH%
goto END

:HELP
echo.
echo  Uso: deploy-vps.bat [comando]
echo.
echo  Comandos:
echo    upload    Empaca solo el codigo (sin node_modules) y lo sube al VPS
echo    deploy    Compila imagenes Docker y levanta los contenedores
echo    logs      Ver logs en tiempo real
echo    status    Ver estado de los contenedores
echo    restart   Reiniciar contenedores
echo    ssh       Abrir terminal SSH en el VPS
echo.

:END
endlocal
