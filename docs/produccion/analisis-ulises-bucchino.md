# Análisis de Infraestructura — Ulises Bucchino

Fecha: 4 de junio de 2026

---

## 1.1. Analizar la infraestructura Docker actual

## Resumen

| # | Problema | Archivo | Impacto |
|---|----------|---------|---------|
| 1 | Credenciales hardcodeadas en texto plano | `docker-compose.yml` L6-8, L29 | **Alto** |
| 2 | Contenedores ejecutándose como `root` | `api/Dockerfile`, `web/Dockerfile` | **Alto** |
| 3 | Comandos de desarrollo en entorno productivo | `docker-compose.yml` L34-36, L56 | **Alto** |
| 4 | Sin multi-stage build (imágenes pesadas) | `api/Dockerfile`, `web/Dockerfile` | **Medio** |
| 5 | Sin límites de recursos ni healthchecks en api/web | `docker-compose.yml` L18-58 | **Medio** |

---

## Problema 1 — Credenciales hardcodeadas en texto plano

**¿Dónde ocurre?**
- `docker-compose.yml` — líneas 6-8 (credenciales de base de datos)
- `docker-compose.yml` — línea 29 (`DATABASE_URL` con usuario y contraseña)

**Impacto:** ALTO

**Explicación:**
Las credenciales de PostgreSQL (`admin` / `password123`) y la URL de conexión completa están escritas directamente en el archivo de configuración. Cualquier persona con acceso al repositorio (o al historial de Git) puede ver la contraseña en texto plano.

**Solución propuesta:**
Usar un archivo `.env` (excluido del repositorio con `.gitignore`) y referenciar las variables con la sintaxis `${VARIABLE}`:

```yaml
# .env (no subir al repo)
POSTGRES_USER=admin
POSTGRES_PASSWORD=s3cr3t_pr0d
POSTGRES_DB=alentapp_db

# docker-compose.yml
environment:
    POSTGRES_USER: ${POSTGRES_USER}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
```

---

## Problema 2 — Contenedores ejecutándose como `root`

**¿Dónde ocurre?**
- `packages/api/Dockerfile` — sin directiva `USER` (todo el archivo)
- `packages/web/Dockerfile` — sin directiva `USER` (todo el archivo)

**Impacto:** ALTO

**Explicación:**
Ninguno de los dos Dockerfiles define un usuario no-privilegiado. Por defecto, los procesos dentro del contenedor corren como `root` (UID 0). Si un atacante logra ejecutar código arbitrario en la aplicación, tendrá privilegios de root dentro del contenedor, lo que facilita escapes de contenedor y movimiento lateral.

**Solución propuesta:**
Crear un usuario de aplicación sin privilegios en ambos Dockerfiles, antes del `CMD`:

```dockerfile
USER node
```

---

## Problema 3 — Comandos de desarrollo usados en entorno productivo

**¿Dónde ocurre?**
- `docker-compose.yml` — línea 34: `prisma migrate dev`
- `docker-compose.yml` — línea 36: `npx tsx watch` (hot-reload)
- `docker-compose.yml` — línea 56: `npm run dev` (Vite dev server)
- `packages/web/Dockerfile` — línea 15: `CMD npm run dev`
- `packages/api/Dockerfile` — línea 21: `CMD npm run dev`

**Impacto:** ALTO

**Explicación:**
`prisma migrate dev` está diseñado **exclusivamente para desarrollo**: genera migraciones nuevas, puede resetear la base de datos y no es seguro para producción. `tsx watch` y `npm run dev` (Vite) son servidores con hot-reload que consumen más recursos, exponen source maps y no están optimizados. En producción se pierde rendimiento, se expone código fuente y se corre el riesgo de pérdida de datos en la DB.

**Solución propuesta:**

```yaml
# docker-compose.prod.yml

    # Ejecuta 'prisma migrate deploy' antes de iniciar el servidor.
    # migrate deploy aplica migraciones SQL pendientes de forma segura (no genera nuevas).
    # node_modules/.bin/prisma está disponible porque 'prisma' está en dependencies.
    command:
      - sh
      - -c
      - "printf 'DATABASE_URL=%s\\n' \"$DATABASE_URL\" > /tmp/.env && node node_modules/.bin/prisma migrate deploy --config packages/api/prisma.config.ts && node packages/api/dist/app.js"
```

Para el frontend, compilar primero con `vite build` y servir los estáticos con `nginx` (ver Problema 4).

---

## Problema 4 — Sin multi-stage build: imágenes pesadas con dependencias de desarrollo

**¿Dónde ocurre?**
- `packages/api/Dockerfile` — archivo completo (single-stage)
- `packages/web/Dockerfile` — archivo completo (single-stage)

**Impacto:** MEDIO

**Explicación:**
Ambos Dockerfiles tienen una sola etapa de construcción. La imagen final incluye todas las `devDependencies` (TypeScript, tsx, Vite, ESLint, etc.), los archivos de código fuente `.ts` y herramientas de build. Para el frontend, el resultado correcto para producción son archivos estáticos que deberían servirse con `nginx` (~25 MB), no con el servidor de desarrollo de Vite corriendo Node.js (~600 MB+).

**Solución propuesta:**

```dockerfile
# =============================================================================
# packages/web/Dockerfile.prod
# Multi-stage build (3 etapas) para el frontend React/Vite servido con Nginx.
# Build context esperado: raíz del monorepo (.)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1 — deps
# Instala todas las dependencias npm (incluyendo devDeps como vite y tsc,
# necesarios en el stage de build). No hay "solo producción" aquí porque
# todos los paquetes son build-time para una app estática.
# -----------------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

# Manifiestos primero para aprovechar la caché de capas Docker:
# esta capa solo se invalida si cambian las dependencias, no el código fuente.
COPY package.json package-lock.json ./
COPY packages/web/package.json     ./packages/web/
COPY packages/shared/package.json  ./packages/shared/

RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2 — build
# Compila @alentapp/shared, luego genera el bundle de producción con Vite.
# La URL de la API (VITE_API_URL) se inyecta en tiempo de compilación porque
# Vite reemplaza las variables import.meta.env.VITE_* estáticamente en el bundle.
# -----------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Recibe la URL pública de la API (accesible desde el navegador del cliente).
# Se pasa como build arg en docker-compose.prod.yml.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Trae node_modules del stage anterior (evita reinstalar)
COPY --from=deps /app/node_modules/ ./node_modules/

# Copia manifiestos y código fuente
COPY package.json ./
COPY tsconfig.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/web/    ./packages/web/

# 1. Compila @alentapp/shared → packages/shared/dist/
#    (requerido por el build del web: resuelve @alentapp/shared vía workspace symlink)
# 2. Compila y empaqueta el frontend → packages/web/dist/
#    (tsc -b valida tipos; vite build genera los assets optimizados)
RUN npm run build -w packages/shared \
    && cd packages/web && npx vite build

# -----------------------------------------------------------------------------
# Stage 3 — runtime
# Imagen final con solo Nginx + assets estáticos. Sin Node.js.
# Tamaño esperado < 30MB.
# -----------------------------------------------------------------------------
FROM nginx:stable-alpine AS runtime

# Copia el bundle estático generado al directorio raíz de Nginx
COPY --from=build /app/packages/web/dist/ /usr/share/nginx/html/

# Reemplaza la configuración de Nginx con la personalizada:
# gzip, caché de assets, security headers, SPA routing y soporte read-only.
COPY packages/web/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

# Verifica que Nginx responde en el puerto 80.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

```dockerfile
# =============================================================================
# packages/api/Dockerfile.prod
# Multi-stage build (3 etapas) para la API Fastify/Prisma/PostgreSQL.
# Build context esperado: raíz del monorepo (.)
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1 — deps
# Instala SOLO las dependencias de producción (--omit=dev).
# El resultado se copia al runtime stage, evitando incluir devDependencies.
# -----------------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

# Copia únicamente los manifiestos de paquetes para aprovechar la caché de
# Docker: esta capa solo se invalida cuando cambian las dependencias.
COPY package.json package-lock.json ./
COPY packages/api/package.json        ./packages/api/
COPY packages/shared/package.json     ./packages/shared/
COPY packages/web/package.json        ./packages/web/

# npm ci es determinista y respeta el lockfile.
# --omit=dev excluye devDependencies → node_modules de producción limpio.
RUN npm ci --omit=dev

# -----------------------------------------------------------------------------
# Stage 2 — build
# Instala todas las dependencias (incluidas devDeps) y compila TypeScript a JS.
# Este stage no llega al runtime: solo genera los artefactos de compilación.
# -----------------------------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Manifiestos primero (caché de dependencias)
COPY package.json package-lock.json ./
COPY packages/api/package.json        ./packages/api/
COPY packages/shared/package.json     ./packages/shared/
COPY packages/web/package.json        ./packages/web/

# npm ci es determinista y respeta el lockfile.
# --omit=dev excluye devDependencies → node_modules de producción limpio.
# --workspace filtra solo las workspaces necesarias para la API: evita instalar
# las dependencias de packages/web (React, Vite, Chakra UI, etc.) en la imagen.
RUN npm ci --omit=dev \
    --workspace=packages/api \
    --workspace=packages/shared \
    --include-workspace-root

# Copia el código fuente completo del monorepo
COPY tsconfig.json ./
COPY packages/shared/     ./packages/shared/
COPY packages/api/        ./packages/api/

# Secuencia de compilación en un único RUN para minimizar layers:
# 1. Compila @alentapp/shared → packages/shared/dist/
#    (necesario antes de compilar la API: packages/api resuelve @alentapp/shared
#     a través del symlink de workspace → packages/shared/dist/index.js)
# 2. Genera el Prisma Client en packages/api/src/generated/client/
#    (usa DATABASE_URL vacía; en build solo se genera el tipo, no se conecta)
# 3. Compila la API con tsc → packages/api/dist/
# 4. Copia los archivos JS runtime del Prisma Client al directorio dist/
#    (Prisma genera .js pre-compilados que tsc no copia automáticamente)
RUN npm run build -w packages/shared \
    && DATABASE_URL="postgresql://x:x@localhost/x" \
       npx prisma generate --config packages/api/prisma.config.ts \
    && npm run build -w packages/api \
    && cp -r packages/api/src/generated packages/api/dist/

# -----------------------------------------------------------------------------
# Stage 3 — runtime
# Imagen final minimalista: solo JS compilado + node_modules de producción.
# Sin código fuente, sin devDependencies, sin herramientas de compilación.
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Usa el usuario 'node' no-root nativo de la imagen node:alpine.
# Creamos los directorios antes de cambiar el usuario para asignar permisos.
RUN mkdir -p packages/api packages/shared \
    && chown -R node:node /app

USER node

# --- Dependencias de producción (desde Stage 1) ---
COPY --chown=node:node --from=deps /app/node_modules/      ./node_modules/

# --- Artefactos compilados y ficheros de runtime (desde Stage 2) ---
# package.json raíz: necesario para que Node.js resuelva el monorepo
COPY --chown=node:node --from=build /app/package.json                              ./
# Shared compilado: node_modules/@alentapp/shared (symlink) apunta aquí
COPY --chown=node:node --from=build /app/packages/shared/dist/                     ./packages/shared/dist/
COPY --chown=node:node --from=build /app/packages/shared/package.json              ./packages/shared/
# API compilada
COPY --chown=node:node --from=build /app/packages/api/dist/                        ./packages/api/dist/
COPY --chown=node:node --from=build /app/packages/api/package.json                 ./packages/api/
# Schema y migraciones de Prisma: requeridos para 'prisma migrate deploy' en startup
COPY --chown=node:node --from=build /app/packages/api/prisma/                      ./packages/api/prisma/
COPY --chown=node:node --from=build /app/packages/api/prisma.config.ts  ./packages/api/

EXPOSE 3000

# Comprueba la disponibilidad del servidor cada 30s.
# --start-period=15s da margen para que la API inicialice la conexión a la DB.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

# El comando default solo arranca el servidor.
# docker-compose.prod.yml sobreescribe este CMD para ejecutar primero
# 'prisma migrate deploy' antes de iniciar la aplicación.
CMD ["node", "packages/api/dist/app.js"]
```

---

## Problema 5 — Sin límites de recursos ni healthchecks en `api` y `web`

**¿Dónde ocurre?**
- `docker-compose.yml` — servicios `api` y `web` (líneas 18-58), sin `deploy.resources` ni `healthcheck`

**Impacto:** MEDIO

**Explicación:**
Solo el servicio `db` tiene un `healthcheck` definido. Los servicios `api` y `web` no tienen límites de CPU/memoria ni verificación de salud. Sin límites, un proceso descontrolado (leak de memoria, loop infinito) puede consumir todos los recursos del host y tumbar otros servicios. Sin healthcheck, Docker Compose no puede detectar si la API está colgada, y `web` arrancará dependiendo de una API no funcional.

**Solución propuesta:**

```yaml
api:
    healthcheck:
        test: ['CMD', 'wget', '--spider', '-q', 'http://localhost:3000/health']
        interval: 10s
        timeout: 5s
        retries: 3
        start_period: 30s
    deploy:
        resources:
            limits:
                cpus: '0.5'
                memory: 512M

web:
    depends_on:
        api:
            condition: service_healthy   # espera a que la API esté lista
    deploy:
        resources:
            limits:
                cpus: '0.25'
                memory: 256M
```

---

## 1.2. Investigar OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

**OpenTelemetry (OTel)** es un framework de observabilidad de código abierto y neutral respecto a proveedores, diseñado para **instrumentar, generar, recolectar y exportar** datos de telemetría como trazas, métricas y registros (logs). Su objetivo principal es aumentar la interoperabilidad entre diversas integraciones y backends de observabilidad.

La diferencia clave radica en su alcance: mientras que **Prometheus** es principalmente un sistema de monitoreo y una base de datos de series temporales enfocada en métricas, **OpenTelemetry** se enfoca en la **estandarización de la generación y recolección** de múltiples tipos de señales (no solo métricas). OTel permite que las aplicaciones se instrumenten una sola vez y envíen esos datos a cualquier backend compatible, incluyendo Prometheus.

---

### ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?

Los "3 pilares" fundamentales son:

1. **Trazas (Traces)**.
2. **Métricas (Metrics)**.
3. **Registros (Logs)**.

**OpenTelemetry aborda los tres pilares**, permitiendo recolectar y exportar trazas, métricas y logs de manera unificada.

---

### Métricas RED (Rate, Errors, Duration)

El método RED es una filosofía de monitoreo orientada específicamente a microservicios. Cada métrica sirve para lo siguiente:

- **Rate (Tasa):** Mide el número de solicitudes por segundo que recibe el servicio. Sirve para entender el volumen de tráfico y la demanda del sistema.
- **Errors (Errores):** Mide la cantidad de esas solicitudes que están fallando. Es un indicador directo de la calidad del servicio y de la satisfacción del usuario (por ejemplo, si ven páginas de error).
- **Duration (Duración/Latencia):** Mide el tiempo que tardan las solicitudes en procesarse. Sirve para detectar si el sistema está lento, lo cual impacta directamente en la experiencia del usuario.

---

### ¿Qué es el OTLP (OpenTelemetry Protocol)?

El **OTLP** es el protocolo nativo de OpenTelemetry para la transmisión de datos de telemetría de forma agnóstica al proveedor.

La ventaja principal de usar OTLP frente a exportar directamente a Prometheus es la **flexibilidad y neutralidad**. Al usar OTLP, los datos se envían en un formato estándar que puede ser procesado por un "Collector" y luego redirigido a múltiples destinos simultáneamente (como Grafana, Jaeger o el propio Prometheus) sin tener que cambiar el código de la aplicación si se decide cambiar de herramienta de almacenamiento en el futuro.

---

### Relación entre OpenTelemetry y Grafana

OpenTelemetry y Grafana tienen una relación estrecha de colaboración e integración:

- **Soporte y Contribución:** Grafana Labs es uno de los principales contribuyentes al proyecto OpenTelemetry y emplea a varios de sus mantenedores.
- **Compatibilidad Nativa:** La plataforma de Grafana (especialmente su stack "LGTM": Loki, Grafana, Tempo, Mimir) ofrece soporte de primer nivel para datos provenientes de OpenTelemetry.
- **Grafana Alloy:** Es una distribución de Grafana que es 100% compatible con OTLP, permitiendo crear pipelines de telemetría que unifican métricas de Prometheus y datos de OpenTelemetry.
- **Visualización:** Grafana se utiliza comúnmente como la capa de visualización para los datos recolectados por OTel, permitiendo crear dashboards (como los de métricas RED) para analizar el rendimiento del sistema.
