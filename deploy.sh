#!/bin/bash

# =============================================================================
# GCT - Script de Deployment con Docker
# =============================================================================

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funciones
print_header() {
    echo -e "\n${YELLOW}═══════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado. Por favor instala Docker Desktop."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose no está instalado."
    exit 1
fi

# Menu
if [ "$1" == "" ]; then
    print_header "GCT - Sistema de Gestión de Capital de Talento"
    echo "Opciones disponibles:"
    echo "  dev                 - Iniciar ambiente de desarrollo"
    echo "  prod                - Iniciar ambiente de producción"
    echo "  build               - Construir imágenes Docker"
    echo "  stop                - Detener contenedores"
    echo "  logs                - Ver logs en tiempo real"
    echo "  logs-backend        - Ver logs del backend"
    echo "  logs-frontend       - Ver logs del frontend"
    echo "  logs-db             - Ver logs de la BD"
    echo "  migrate             - Ejecutar migraciones"
    echo "  backup-db           - Hacer backup de la BD"
    echo "  restore-db          - Restaurar BD desde backup"
    echo "  shell-django        - Entrar a shell de Django"
    echo "  shell-db            - Conectar a la BD"
    echo "  clean               - Limpiar contenedores y volúmenes"
    echo "  help                - Ver esta ayuda"
    exit 0
fi

# Comandos
case "$1" in
    dev)
        print_header "Iniciando ambiente de DESARROLLO"
        docker-compose -f docker-compose.yml up -d
        print_success "Contenedores iniciados"
        echo ""
        echo "URLs disponibles:"
        echo "  - Frontend:  http://localhost:5173"
        echo "  - Backend:   http://localhost:8000"
        echo "  - Admin:     http://localhost:8000/admin"
        echo "  - Nginx:     http://localhost"
        echo ""
        docker-compose ps
        ;;

    prod)
        print_header "Iniciando ambiente de PRODUCCIÓN"
        if [ ! -f ".env.prod" ]; then
            print_error ".env.prod no existe. Crea uno basado en .env.docker"
            exit 1
        fi
        docker-compose -f docker-compose.prod.yml up -d
        print_success "Contenedores iniciados en producción"
        docker-compose -f docker-compose.prod.yml ps
        ;;

    build)
        print_header "Construyendo imágenes Docker"
        docker-compose -f docker-compose.yml build --no-cache
        print_success "Imágenes construidas"
        ;;

    stop)
        print_header "Deteniendo contenedores"
        docker-compose stop
        print_success "Contenedores detenidos"
        ;;

    logs)
        print_header "Mostrando logs en tiempo real"
        docker-compose logs -f
        ;;

    logs-backend)
        docker-compose logs -f backend
        ;;

    logs-frontend)
        docker-compose logs -f frontend
        ;;

    logs-db)
        docker-compose logs -f db
        ;;

    migrate)
        print_header "Ejecutando migraciones"
        docker-compose exec backend python manage.py migrate
        print_success "Migraciones completadas"
        ;;

    backup-db)
        print_header "Realizando backup de la base de datos"
        mkdir -p docker/backup
        BACKUP_FILE="docker/backup/rbgct_$(date +%Y%m%d_%H%M%S).sql"
        docker-compose exec -T db pg_dump -U rbgct rbgct > "$BACKUP_FILE"
        print_success "Backup creado: $BACKUP_FILE"
        ;;

    restore-db)
        print_header "Restaurar base de datos desde backup"
        if [ -z "$2" ]; then
            echo "Backups disponibles:"
            ls -lh docker/backup/
            echo ""
            echo "Uso: $0 restore-db <archivo_backup>"
            exit 1
        fi
        if [ ! -f "$2" ]; then
            print_error "Archivo no encontrado: $2"
            exit 1
        fi
        docker-compose exec -T db psql -U rbgct rbgct < "$2"
        print_success "Base de datos restaurada desde: $2"
        ;;

    shell-django)
        print_header "Entrando a Django shell"
        docker-compose exec backend python manage.py shell
        ;;

    shell-db)
        print_header "Conectando a la base de datos"
        docker-compose exec db psql -U rbgct -d rbgct
        ;;

    clean)
        print_header "Limpiando contenedores, volúmenes e imágenes"
        echo "Esto eliminará:"
        echo "  - Todos los contenedores parados"
        echo "  - Todos los volúmenes no utilizados"
        echo "  - Todos los archivos de datos"
        echo ""
        read -p "¿Estás seguro? (s/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            docker-compose down -v
            docker system prune -f
            print_success "Limpieza completada"
        else
            echo "Operación cancelada"
        fi
        ;;

    help)
        bash "$0"
        ;;

    *)
        print_error "Comando desconocido: $1"
        bash "$0" help
        exit 1
        ;;
esac
