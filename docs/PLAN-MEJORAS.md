# Plan de Mejoras — GCT (conecta.rbgct.cloud)

> Generado tras revisión profunda del código (backend, frontend, proxy, configs).
> Fecha: 2026-06-10 · Rama: `ui/redesign-rb`
> Estado: ✅ = aplicado · ⏳ = pendiente (priorizado)

---

## P0 — Seguridad (urgente)

| # | Item | Estado |
|---|------|--------|
| 1 | `completar-datos` era `AllowAny`: cualquiera con un `empleado_id` podía ponerle contraseña a una cuenta pendiente de onboarding (toma de cuenta). Ahora exige JWT y ownership. | ✅ |
| 2 | CORS: con env vacío se activaba `CORS_ALLOW_ALL_ORIGINS=True` **con credenciales**. Ahora lista explícita, nunca allow-all. | ✅ |
| 3 | `.env.docker` con secretos reales estaba **commiteado**. Sacado del índice (`git rm --cached`), añadido a `.gitignore`, creado `.env.docker.example`. | ✅ |
| 4 | **Rotar los secretos que quedaron expuestos en el historial de git**: `DB_PASSWORD` (¡es el mismo de producción!), `SUPERADMIN_PASSWORD`, `APPWRITE_API_KEY`, `N8N_WEBHOOK_API_KEY`, `GEMINI_API_KEY`. El `DJANGO_SECRET_KEY` de producción es distinto al commiteado (verificado), ese no urge. Cambiarlos en Coolify UI → Deploy. Opcional: limpiar historial con BFG/git-filter-repo. | ⏳ |
| 5 | Coolify env del recurso `conecta`: borrar `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL` (apuntan a `intranetrb.rbgct.cloud`, dominio viejo) y `CACHE_BACKEND=file` para que apliquen los defaults correctos del compose (`conecta...` y `redis`). Con Redis, los códigos 2FA sobreviven a los redeploys. | ⏳ |
| 6 | `habilitar-edicion` y `crear-usuario` validan credenciales de admin en el body en vez de usar el JWT. Migrarlos a `IsAdminOrSuperAdmin`/`IsSuperAdminUser` (coordinar cambio con frontend, que hoy envía `admin_email`/`admin_password`). | ⏳ |
| 7 | API Keys guardadas en texto plano en BD (`ApiKey.key`). Guardar hash (sha256) y mostrar la key solo al crearla. | ⏳ |
| 8 | Subir mínimo de contraseña de 6 → 8+ caracteres (unificado en `completar-datos` y `restablecer-password`). | ⏳ |

## P1 — Confiabilidad / Operación

| # | Item | Estado |
|---|------|--------|
| 1 | Flujo 2FA: login regenera código si expiró; reenviar preserva `password_verificada`; `completar-datos` transaccional y maneja documentos duplicados (residuos liberados / 409 claro). | ✅ |
| 2 | Cadena de proxy: headers explícitos en `location /api/` (la herencia de `proxy_set_header` se anula al definir uno); `ALLOWED_HOSTS`/`CSRF` blindados con el dominio de producción. | ✅ |
| 3 | Stack manual `rbgct-*-prod` detenido y sin auto-restart (era un duplicado sin tráfico que causaba confusión de BDs). **No borrar volúmenes sin backup.** | ✅ |
| 4 | Configurar webhook GitHub → Coolify para auto-deploy al hacer push a `ui/redesign-rb` (hoy el deploy es manual). | ⏳ |
| 5 | Backups automáticos de la BD de Coolify (los scripts `docker/backup-*.sh` apuntaban al stack manual). Configurar backup programado en Coolify o cron contra `db-hqso...`. | ⏳ |
| 6 | Monitoreo de errores (Sentry u otro) en Django y React; hoy los 500 solo se ven en `docker logs`. | ⏳ |
| 7 | Healthcheck de la API más allá de `/` (p. ej. `GET /api/ping/` anónimo devolviendo 200 liviano para health, hoy responde 401). | ⏳ |

## P2 — Calidad / Organización del código

| # | Item | Estado |
|---|------|--------|
| 1 | `api/views.py` tiene **4.350+ líneas**. Partirlo en módulos: `views/auth.py`, `views/empleados.py`, `views/tareas.py`, `views/cursos.py`, `views/herramientas.py`, `views/recuperacion.py`, `views/integraciones.py` (paquete `views/` con re-exports en `__init__.py` para no romper imports). | ⏳ |
| 2 | Tests automatizados (pytest-django) para los flujos críticos: login/2FA, recuperación, completar-datos (incluye caso documento duplicado), permisos por rol. Hoy no hay ningún test. | ⏳ |
| 3 | CI en GitHub Actions: lint (ruff + eslint) + tests + build de imágenes en cada PR. | ⏳ |
| 4 | Validación de entrada con serializers DRF en los endpoints manuales (hoy hacen `request.data.get(...)` a mano). | ⏳ |
| 5 | Unificar configs de nginx: existen `nginx.conf`, `nginx-prod.conf` y `nginx-proxy.conf`, pero Coolify solo usa `nginx-proxy.conf` (vía `Dockerfile.nginx`). Eliminar/archivar los otros dos y documentarlo. | ⏳ |
| 6 | VerifyCode: `navigate()` durante render movido a `useEffect`. | ✅ |
| 7 | Normalización de emails a minúsculas en creación de usuarios (login y cache 2FA lo asumen). Pendiente: migración que normalice los existentes + `CITextField` o constraint. | ✳️ parcial |
| 8 | Frontend: code-splitting por ruta con `React.lazy` (los 4 dashboards cargan todo en un bundle); `build.rollupOptions.manualChunks` para vendor (recharts, jspdf, xlsx, pdfjs son pesados). | ⏳ |
| 9 | Frontend: eliminar `console.log` en build (`esbuild.drop`) y limpiar los 5 restantes. | ⏳ |
| 10 | `App.css` (scaffold de Vite sin uso) y assets sin referencia: eliminar. | ⏳ |

## P3 — Rendimiento (cuando haya más usuarios)

| # | Item |
|---|------|
| 1 | Revisar N+1 en ViewSets (usar `select_related('persona', 'persona__contacto')` consistentemente; ya se hace en login). |
| 2 | Índices: verificar índice en `datos_empleado.correo_corporativo` (lookup de login) y FKs de tareas/bitácora. |
| 3 | Paginación DRF por defecto (hoy varios listados devuelven todo). |
| 4 | Cache Redis para dashboards (ya existe patrón con `CACHE_KEY_*`, extenderlo). |

---

## Decisiones de arquitectura documentadas

- **Despliegue:** 100% Coolify (`conecta`, rama `ui/redesign-rb`). Traefik → nginx interno → Django/React. Ver CLAUDE.md sección "Despliegue real".
- **Hot-fixes en contenedores:** son temporales; siempre commitear + push + Deploy en Coolify. Tras cambiar conf de nginx usar `docker restart` (no `nginx -s reload`, deja conexiones colgadas con Traefik).
- **2FA:** códigos en Django cache. Con `CACHE_BACKEND=file` viven en el contenedor (se pierden al redeploy); pasar a Redis (P0.5).
