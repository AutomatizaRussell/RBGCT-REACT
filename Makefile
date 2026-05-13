.PHONY: help dev prod build stop logs logs-backend logs-db logs-frontend migrate backup restore shell-django shell-db clean

help:
	@echo ""
	@echo "GCT - Sistema de Gestión de Capital de Talento"
	@echo "=============================================="
	@echo ""
	@echo "Comandos disponibles:"
	@echo "  make dev             - Iniciar desarrollo"
	@echo "  make prod            - Iniciar producción"
	@echo "  make build           - Construir imágenes"
	@echo "  make stop            - Detener contenedores"
	@echo "  make logs            - Ver todos los logs"
	@echo "  make logs-backend    - Ver logs del backend"
	@echo "  make logs-db         - Ver logs de BD"
	@echo "  make migrate         - Ejecutar migraciones"
	@echo "  make backup          - Backup de BD"
	@echo "  make restore         - Restaurar BD"
	@echo "  make shell-django    - Django shell"
	@echo "  make shell-db        - PostgreSQL shell"
	@echo "  make clean           - Limpiar todo"
	@echo ""

dev:
	@echo "🚀 Iniciando ambiente de DESARROLLO..."
	docker-compose -f docker-compose.yml up -d
	@echo "✓ Frontend:  http://localhost:5173"
	@echo "✓ Backend:   http://localhost:8000"
	@echo "✓ Admin:     http://localhost:8000/admin"
	@echo "✓ Nginx:     http://localhost"
	docker-compose ps

prod:
	@echo "🚀 Iniciando ambiente de PRODUCCIÓN..."
	@if [ ! -f ".env.prod" ]; then \
		echo "❌ .env.prod no existe"; \
		exit 1; \
	fi
	docker-compose -f docker-compose.prod.yml up -d
	docker-compose -f docker-compose.prod.yml ps

build:
	@echo "🔨 Construyendo imágenes..."
	docker-compose build --no-cache
	@echo "✓ Imágenes construidas"

stop:
	@echo "⏹️  Deteniendo contenedores..."
	docker-compose stop
	@echo "✓ Contenedores detenidos"

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

logs-db:
	docker-compose logs -f db

migrate:
	@echo "📦 Ejecutando migraciones..."
	docker-compose exec backend python manage.py migrate
	@echo "✓ Migraciones completadas"

backup:
	@echo "💾 Realizando backup..."
	@mkdir -p docker/backup
	@docker-compose exec -T db pg_dump -U rbgct rbgct > docker/backup/rbgct_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✓ Backup creado en docker/backup/"

restore:
	@echo "⚠️  Restaurando base de datos..."
	@if [ -z "$(FILE)" ]; then \
		echo "Uso: make restore FILE=docker/backup/rbgct_YYYYMMDD_HHMMSS.sql"; \
		exit 1; \
	fi
	docker-compose exec -T db psql -U rbgct rbgct < $(FILE)
	@echo "✓ Base de datos restaurada"

shell-django:
	docker-compose exec backend python manage.py shell

shell-db:
	docker-compose exec db psql -U rbgct -d rbgct

clean:
	@echo "🧹 Limpiando contenedores y volúmenes..."
	@echo "⚠️  ADVERTENCIA: Esto eliminará todos los datos"
	@read -p "¿Estás seguro? [s/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Ss]$$ ]]; then \
		docker-compose down -v; \
		docker system prune -f; \
		echo "✓ Limpieza completada"; \
	else \
		echo "Operación cancelada"; \
	fi
