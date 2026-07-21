@echo off
setlocal

REM VPS configuration: sobrescribir con variables de entorno o editar antes de usar.
set VPS_IP=%VPS_IP%
if "%VPS_IP%"=="" set VPS_IP=72.60.165.161
set VPS_USER=%VPS_USER%
if "%VPS_USER%"=="" set VPS_USER=root
set VPS_PATH=%VPS_PATH%
if "%VPS_PATH%"=="" set VPS_PATH=/home/gct
set SSH=%VPS_USER%@%VPS_IP%

if "%1"=="upload" goto UPLOAD
if "%1"=="deploy" goto DEPLOY
if "%1"=="logs" goto LOGS
if "%1"=="restart" goto RESTART
if "%1"=="ssh" goto SSH_CONNECT
if "%1"=="status" goto STATUS
goto HELP

:UPLOAD
if not exist .env.prod (
    echo ERROR: .env.prod no existe. Crea uno desde .env.production.example antes de subir.
    goto END
)
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
echo [4/4] Extrayendo codigo y subiendo .env.prod...
ssh %SSH% "cd %VPS_PATH% && unzip -o gct-deploy.zip && rm gct-deploy.zip"
scp .env.prod %SSH%:%VPS_PATH%/.env.prod
del gct-deploy.zip
echo.
echo Listo. Ahora ejecuta: deploy-vps.bat deploy
goto END

:DEPLOY
echo.
echo Desplegando en el VPS (puede tardar 10-15 min la primera vez)...
ssh %SSH% "cd %VPS_PATH% && test -f .env.prod && docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build"
echo.
echo Para ver el progreso: deploy-vps.bat logs
goto END

:LOGS
ssh %SSH% "cd %VPS_PATH% && docker compose --env-file .env.prod -f docker-compose.prod.yml logs --tail=50 -f"
goto END

:STATUS
ssh %SSH% "cd %VPS_PATH% && docker compose --env-file .env.prod -f docker-compose.prod.yml ps"
goto END

:RESTART
ssh %SSH% "cd %VPS_PATH% && docker compose --env-file .env.prod -f docker-compose.prod.yml restart"
goto END

:SSH_CONNECT
ssh %SSH%
goto END

:HELP
echo.
echo  Uso: deploy-vps.bat [comando]
echo.
echo  Comandos:
echo    upload    Empaca solo el codigo y sube .env.prod al VPS
echo    deploy    Compila imagenes Docker y levanta los contenedores
echo    logs      Ver logs en tiempo real
echo    status    Ver estado de los contenedores
echo    restart   Reiniciar contenedores
echo    ssh       Abrir terminal SSH en el VPS
echo.
echo  Produccion usa siempre .env.prod. Crea el archivo desde .env.production.example.
echo.

:END
endlocal
