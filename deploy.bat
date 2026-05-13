@echo off
REM =============================================================================
REM GCT - Script de Deployment con Docker (Windows)
REM =============================================================================

setlocal enabledelayedexpansion

set RED=[91m
set GREEN=[92m
set YELLOW=[93m
set NC=[0m

if "%1%"=="" (
    echo.
    echo %YELLOW%=========================================================%NC%
    echo %YELLOW%GCT - Sistema de Gestión de Capital de Talento%NC%
    echo %YELLOW%=========================================================%NC%
    echo.
    echo Opciones disponibles:
    echo   dev                 - Iniciar ambiente de desarrollo
    echo   prod                - Iniciar ambiente de producción
    echo   build               - Construir imágenes Docker
    echo   stop                - Detener contenedores
    echo   logs                - Ver logs en tiempo real
    echo   logs-backend        - Ver logs del backend
    echo   logs-db             - Ver logs de la BD
    echo   migrate             - Ejecutar migraciones
    echo   backup-db           - Hacer backup de la BD
    echo   shell-django        - Entrar a shell de Django
    echo   clean               - Limpiar contenedores
    echo.
    exit /b 0
)

if "%1%"=="dev" (
    echo %YELLOW%Iniciando ambiente de DESARROLLO%NC%
    docker-compose -f docker-compose.yml up -d
    echo %GREEN%✓ Contenedores iniciados%NC%
    echo.
    echo URLs disponibles:
    echo   - Frontend:  http://localhost:5173
    echo   - Backend:   http://localhost:8000
    echo   - Nginx:     http://localhost
    echo.
    docker-compose ps
    exit /b 0
)

if "%1%"=="prod" (
    echo %YELLOW%Iniciando ambiente de PRODUCCIÓN%NC%
    if not exist .env.prod (
        echo %RED%✗ .env.prod no existe%NC%
        exit /b 1
    )
    docker-compose -f docker-compose.prod.yml up -d
    echo %GREEN%✓ Contenedores iniciados en producción%NC%
    exit /b 0
)

if "%1%"=="build" (
    echo %YELLOW%Construyendo imágenes Docker%NC%
    docker-compose -f docker-compose.yml build --no-cache
    echo %GREEN%✓ Imágenes construidas%NC%
    exit /b 0
)

if "%1%"=="stop" (
    echo %YELLOW%Deteniendo contenedores%NC%
    docker-compose stop
    echo %GREEN%✓ Contenedores detenidos%NC%
    exit /b 0
)

if "%1%"=="logs" (
    docker-compose logs -f
    exit /b 0
)

if "%1%"=="logs-backend" (
    docker-compose logs -f backend
    exit /b 0
)

if "%1%"=="logs-db" (
    docker-compose logs -f db
    exit /b 0
)

if "%1%"=="migrate" (
    echo %YELLOW%Ejecutando migraciones%NC%
    docker-compose exec backend python manage.py migrate
    echo %GREEN%✓ Migraciones completadas%NC%
    exit /b 0
)

if "%1%"=="backup-db" (
    echo %YELLOW%Realizando backup de la base de datos%NC%
    if not exist docker\backup mkdir docker\backup
    for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
    for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
    set BACKUP_FILE=docker\backup\rbgct_!mydate!_!mytime!.sql
    docker-compose exec -T db pg_dump -U rbgct rbgct > !BACKUP_FILE!
    echo %GREEN%✓ Backup creado: !BACKUP_FILE!%NC%
    exit /b 0
)

if "%1%"=="shell-django" (
    docker-compose exec backend python manage.py shell
    exit /b 0
)

if "%1%"=="clean" (
    echo %YELLOW%Limpiando contenedores y volúmenes%NC%
    docker-compose down -v
    docker system prune -f
    echo %GREEN%✓ Limpieza completada%NC%
    exit /b 0
)

echo %RED%✗ Comando desconocido: %1%%NC%
exit /b 1
