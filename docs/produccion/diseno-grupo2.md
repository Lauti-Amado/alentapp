# **Fase 2: Especificación y Diseño de Arquitectura para Producción**

---

## **SECCIÓN 2.1: DISEÑO DE LA INFRAESTRUCTURA DOCKER**

### **a) `packages/api/Dockerfile.prod`**

**Propósito:**  
 Proveer un entorno de ejecución optimizado, seguro y aislado para la API backend (Node.js/Fastify), garantizando que únicamente los artefactos estrictamente necesarios para su funcionamiento sean desplegados en producción.

**Justificación técnica:**  
 El uso de un Multi-stage Build reduce drásticamente la superficie de ataque y el tamaño final de la imagen al descartar el código fuente TypeScript, las herramientas de compilación y las devDependencies. Esto agiliza los tiempos de despliegue y minimiza el consumo de almacenamiento en el registro de imágenes.

**Diseño de Etapas (Multi-stage):**

| Etapa | Nombre | Base | Propósito |
| ----- | ----- | ----- | ----- |
| Stage 1 | `deps` | `node:22-alpine` | Instalar solo dependencias de producción (`npm ci --omit=dev`) |
| Stage 2 | `build` | `node:22-alpine` | Compilar TypeScript y generar JS listo para ejecutar |
| Stage 3 | `runtime` | `node:22-alpine` | Solo runtime: JS compilado \+ node\_modules prod \+ usuario no-root |

**Detalle de cada etapa:**

**Stage 1 — `deps` (Dependencias)**

* Imagen base: `node:22-alpine`  
* Se copian únicamente `package.json` y `package-lock.json` (de todos los workspaces del monorepo) antes del código fuente. Esto garantiza que la capa de caché de Docker para `npm ci` no se invalide a menos que las dependencias cambien explícitamente.  
* Se instalan las dependencias de producción: `npm ci --omit=dev`.  
* No se copia el código fuente. El `node_modules` resultante se reutiliza en la etapa siguiente.

**Stage 2 — `build` (Compilación)**

* Imagen base: `node:22-alpine`  
* Se copian los `node_modules` de la etapa `deps` y luego el código fuente completo.  
* Se ejecuta `npm run build` para transpilar TypeScript a JavaScript y generar los binarios de Prisma Client (`prisma generate`).  
* El directorio `dist/` resultante contiene el código listo para producción.

**Stage 3 — `runtime` (Ejecución)**

* Imagen base: `node:22-alpine`  
* **Usuario no-root (appuser/node):** Se configura `USER node` (usuario incluido en la imagen oficial de Node.js) para operar el contenedor sin privilegios de root. Esto evita que procesos comprometidos escalen privilegios en el host.  
* Se copian desde `build`: solo el directorio `dist/`, el `node_modules` de producción y la carpeta `prisma/` (schema \+ migraciones).  
* No existe TypeScript, `tsc`, `npm` ni ninguna herramienta de build en la imagen final.

**Requisitos funcionales:**

* Exponer puerto `3000`.  
* Permitir lectura de variables de entorno mediante inyección del orquestador (no archivos `.env` cargados en la imagen).

**Requisitos no funcionales:**

* Tamaño objetivo de imagen: \< 300 MB.  
* Inicialización en menos de 5 segundos (sin contar migraciones de Prisma).

**Estrategia de Healthcheck:**

HEALTHCHECK \--interval=30s \--timeout=5s \--start-period=15s \--retries=3 \\  
  CMD-SHELL wget -qO- http://127.0.0.1:3000/health || exit 1

**Estrategia `.dockerignore`:**  
 El `.dockerignore` raíz debe excluir explícitamente: `node_modules/`, `.git/`, `dist/`, `e2e-fullstack/`, `**/*.test.ts`, `**/*.spec.ts`, `.env*`, `docs/`, y archivos de configuración de desarrollo (`.eslintrc.js`, `.prettierrc.json`). Esto evita sobrescrituras de caché y fugas de información sensible.

---

### **b) `packages/web/Dockerfile.prod`**

**Propósito:**  
 Generar los artefactos estáticos (HTML, CSS, JS) de la aplicación React (Vite \+ Chakra UI) y servirlos de forma altamente eficiente mediante Nginx como servidor web ligero.

**Justificación técnica:**  
 Node.js no está diseñado para servir archivos estáticos con alta concurrencia. Nginx en modo servidor web procesa peticiones de recursos estáticos de forma asíncrona mediante su arquitectura basada en eventos, consumiendo una fracción mínima de RAM comparado con mantener un proceso Node.js activo.

**Diseño de Etapas (Multi-stage):**

| Etapa | Nombre | Base | Propósito |
| ----- | ----- | ----- | ----- |
| Stage 1 | `deps` | `node:22-alpine` | Instalar dependencias (`npm ci`) |
| Stage 2 | `build` | `node:22-alpine` | Build de Vite (`npm run build`) |
| Stage 3 | `runtime` | `nginx:stable-alpine` | Servir archivos estáticos con Nginx |

**Detalle de cada etapa:**

**Stage 1 — `deps` (Dependencias)**

* Imagen base: `node:22-alpine`.  
* Copia aislada de `package*.json` para aprovechar caché de Docker.  
* Ejecución de `npm ci` para instalar todas las dependencias necesarias para el build de Vite.

**Stage 2 — `build` (Construcción)**

* Imagen base: `node:22-alpine`.  
* Se copian los `node_modules` del Stage 1 y luego el código fuente de `packages/web/`.  
* Ejecución de `npm run build` mediante Vite, generando el directorio `dist/` con el bundle protegido y minificado con hashes en los nombres de archivo.

**Stage 3 — `runtime` (Nginx)**

* Imagen base: `nginx:stable-alpine`.  
* Los archivos del `dist/` del Stage 2 se copian hacia `/usr/share/nginx/html`.  
* Se sobrescribe `/etc/nginx/nginx.conf` con una configuración personalizada.

**Configuraciones específicas de Nginx:**

* **SPA routing:** Directiva `try_files $uri $uri/ /index.html` para redirigir todo el tráfico de rutas inexistentes a `index.html`, habilitando el comportamiento de React Router.  
* **Gzip:** Habilitado para `text/css`, `application/javascript`, `image/svg+xml` y `application/json`, reduciendo el ancho de banda.  
* **Caché de assets:** Directiva `Cache-Control: max-age=31536000, immutable` aplicada a todos los assets con hash (`.js`, `.css`) generados por Vite.  
* **Security Headers:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.

**Requisitos funcionales:**

* Redirigir todo el tráfico de rutas inexistentes a `index.html` (comportamiento SPA).  
* Exponer puerto `80`.

**Requisitos no funcionales:**

* Tamaño objetivo de imagen: \< 170 MB.

**Estrategia de Healthcheck:**

HEALTHCHECK \--interval=30s \--timeout=3s \--start-period=5s \--retries=3 \\  
  CMD wget -qO- http://localhost:80 || exit 1

---

### **c) `docker-compose.prod.yml`**

**Propósito:**  
 Orquestar los tres servicios de la aplicación (`api`, `web`, `db`) en modo producción, aplicando todas las políticas de seguridad, límites de recursos, observabilidad y resiliencia exigidas.

**Diseño de Servicios:**

**Resumen de requisitos por aspecto:**

| Aspecto | Requisito |
| ----- | ----- |
| Resource limits | CPU y memoria definidos por servicio mediante `deploy.resources.limits` |
| Healthchecks | Para `api` y `db` con condición `service_healthy` en `depends_on` |
| Seguridad | `read_only: true`, `cap_drop: ALL`, `cap_add: NET_BIND_SERVICE`, `no-new-privileges` |
| Logging | Driver `json-file` con rotación (`max-size: 10m`, `max-file: 3`) |
| Red | Red interna personalizada `alentapp-network` (no la default bridge) |
| Secrets | Variables sensibles desde archivo `.env` (no hardcodeadas en el YAML) |

**Servicio `api`:**

* Imagen: compilada desde `packages/api/Dockerfile.prod` con contexto raíz del monorepo.  
* Puertos: `3000:3000` para la API, `9464:9464` para el endpoint de métricas de OpenTelemetry.  
* Volúmenes: ninguno (filesystem inmutable; se usa `tmpfs` para carpetas temporales necesarias como `/tmp`).  
* Dependencias: `depends_on` con condición `service_healthy` hacia el servicio `db`.  
* Restart policy: `unless-stopped`.  
* Healthcheck: `wget -qO- http://127.0.0.1:3000/health || exit 1`.  
* Límites de recursos: CPU máx. `0.5`, Memoria máx. `256M`.  
* Seguridad: `read_only: true`, `cap_drop: [ALL]`, `cap_add: [NET_BIND_SERVICE]`, `security_opt: [no-new-privileges:true]`.  
* Variables de entorno: `DATABASE_URL` y otras sensibles leídas desde `.env` mediante `env_file`.

**Servicio `web`:**

* Imagen: compilada desde `packages/web/Dockerfile.prod` con contexto raíz.  
* Puertos: `80:80`.  
* Dependencias: `depends_on` hacia `api`.  
* Restart policy: `unless-stopped`.  
* Healthcheck: `wget -qO- http://127.0.0.1:80 || exit 1`.  
* Límites de recursos: CPU máx. `0.25`, Memoria máx. `64M`.  
* Seguridad: `read_only: true`, `cap_drop: [ALL]`, `cap_add: [NET_BIND_SERVICE, CHOWN, SETUID, SETGID]`, `security_opt: [no-new-privileges:true]`. Se agrega `tmpfs` en `/var/cache/nginx` y `/var/run` para que Nginx pueda operar en modo read-only.

**Servicio `db`:**

* Imagen: `postgres:16-alpine` (misma versión usada en desarrollo para evitar incompatibilidades).  
* Puertos: solo expuesto en la red interna `alentapp-network`, en puerto `5432` (no expuesto al host en producción).  
* Volúmenes: volumen nombrado `pg_data_prod` para persistencia en `/var/lib/postgresql/data`.  
* Healthcheck: `pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}` con interval `10s`, timeout `5s`, retries `5`.  
* Restart policy: `unless-stopped`.  
* Límites de recursos: CPU máx. `0.5`, Memoria máx. `512M`.

**Políticas globales:**

* **Red custom:** `alentapp-network` de tipo `bridge`, sin usar la red default de Docker Compose.  
* **Logging con rotación:** Driver `json-file` con `max-size: "10m"` y `max-file: "3"` aplicado a todos los servicios mediante un anchor YAML `x-logging`.  
* **Filesystem inmutable:** `read_only: true` en `api` y `web`, con `tmpfs` para los paths que requieren escritura transitoria.  
* **Capabilities mínimas:** `cap_drop: [ALL]` y `cap_add: [NET_BIND_SERVICE]` en todos los contenedores. `security_opt: [no-new-privileges:true]` para prevenir escalada de privilegios.  
* **Variables sensibles:** Todas las credenciales (usuario/contraseña de PostgreSQL, `DATABASE_URL`) provienen de un archivo `.env` que no se comitea al repositorio (listado en `.gitignore`).

---

## **SECCIÓN 2.2: DISEÑO DE LA OBSERVABILIDAD**

### **a) Métricas RED a capturar**

Las siguientes métricas cubren los tres componentes del RED Method (Rate, Errors, Duration) más métricas de saturación:

| Métrica | Tipo OpenTelemetry | Descripción | Labels |
| ----- | ----- | ----- | ----- |
| `http.requests.total` | Counter | Contador acumulativo de requests HTTP; usado para calcular la tasa (Rate) via `rate()` en PromQL  | `method`, `route`, `status` |
| `http.requests.errors` | Counter | Total de requests que resultaron en error (4xx/5xx) | `method`, `route`, `status` |
| `http.request.duration` | Histogram | Distribución de latencia por request (en ms) | `method`, `route` |
| `process.memory.usage` | Gauge | Memoria RAM asignada al proceso Node.js | — |
| `http.requests.active` | Gauge | Requests en procesamiento simultáneo (in-flight) | `method` |

**Relación con el RED Method:**

* **Rate:** `http.requests.total` permite calcular la tasa de peticiones por segundo.  
* **Errors:** `http.requests.errors` (o la misma `http.requests.total` filtrada por `status=~"[45].."`) permite calcular la tasa de error.  
* **Duration:** `http.request.duration` permite medir valores de corte de latencia (p95, p99) con `histogram_quantile`.  
* **Saturación (adicional):** `process.memory.usage` y `http.requests.active` detectan cuellos de botella y posibles memory leaks.

---

### **b) OpenTelemetry SDK**

**Arquitectura de integración:**

La integración se realiza en el servicio `api` (Fastify/TypeScript), siguiendo el orden requerido:

1. `packages/api/src/infrastructure/telemetry.ts` — configura el SDK y el PrometheusExporter.  
2. `packages/api/src/app.ts` — importa `telemetry.ts` como primer import (antes de Fastify y cualquier otra dependencia).  
3. Los controllers instrumentan manualmente las métricas RED en cada handler.

**Configuración conceptual del SDK:**

// packages/api/src/infrastructure/telemetry.ts

import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { metrics } from '@opentelemetry/api';
import type { Meter } from '@opentelemetry/api';

// Configurar Prometheus Exporter
const prometheusExporter = new PrometheusExporter({
  port: 9464,
  endpoint: '/metrics',
});

// Crear SDK con auto-instrumentaciones
const sdk = new NodeSDK({
  metricReader: prometheusExporter,
  instrumentations: [
    getNodeAutoInstrumentations(),
  ],
});

// Iniciar SDK
sdk.start();

// Métricas personalizadas RED
const meter = metrics.getMeter('alentapp-api');

export function createREDMetrics(meter: Meter) {
  const requestCounter = meter.createCounter('http.requests.total', {
    description: 'Contador acumulativo de requests HTTP; usado para calcular la tasa (Rate) via rate() en PromQL',
  });
  const errorCounter = meter.createCounter('http.requests.errors', {
    description: 'Total de errores HTTP (4xx/5xx)',
  });
  const requestDuration = meter.createHistogram('http.request.duration', {
    description: 'Duración de requests en ms',
    unit: 'ms',
  });
  return { requestCounter, errorCounter, requestDuration };
}

export { sdk, meter };

**Inicialización en el entrypoint (`app.ts`):**

// PRIMERO: inicializar OpenTelemetry antes de cualquier otro import  
import './infrastructure/telemetry.js';

// Luego el resto de imports  
import Fastify from 'fastify';  
// ...

**Instrumentación manual en controllers (ejemplo `MemberController.ts`):**

import { metrics } from '@opentelemetry/api';

const meter \= metrics.getMeter('alentapp-api');  
const requestCounter \= meter.createCounter('http.requests.total');  
const errorCounter \= meter.createCounter('http.requests.errors');  
const requestDuration \= meter.createHistogram('http.request.duration', { unit: 'ms' });

async getAll(request, reply) {  
  const start \= Date.now();  
  const method \= request.method;  
  const route \= request.url.split('?')\[0\];  
  try {  
    const members \= await this.getMembersUseCase.execute();  
    requestCounter.add(1, { method, route, status: '200' });  
    return reply.status(200).send({ data: members });  
  } catch (error) {  
    errorCounter.add(1, { method, route, status: '500' });  
    return reply.status(500).send({ error: 'Error interno' });  
  } finally {  
    requestDuration.record(Date.now() \- start, { method, route });  
  }  
}

**Dependencias a instalar en `packages/api`:**

npm \-w packages/api install \\  
  @opentelemetry/sdk-node \\  
  @opentelemetry/auto-instrumentations-node \\  
  @opentelemetry/exporter-prometheus \\  
  @opentelemetry/instrumentation-http \\  
  @opentelemetry/instrumentation-fastify

**Diagrama de flujo de métricas:**

Petición HTTP  
    │  
    ▼  
API (Node.js / Fastify)  
    │  
    ├── Auto-instrumentación OTel (HTTP, Fastify)  
    │       └──▶ PrometheusExporter  
    │  
    └── Instrumentación manual RED (controllers)  
            └──▶ PrometheusExporter  
                        │  
                        ▼  
              http://api:9464/metrics  
                        │  
              ◄── scrape cada 15s ──  
                        │  
                   Prometheus  
                        │  
              ◄── PromQL query ──  
                        │  
                    Grafana

**Endpoint de métricas:**  
 `http://0.0.0.0:9464/metrics` — Prometheus realiza el pull (scrape) directamente de esta URL cada 15 segundos.

---

### **c) Dashboard RED en Grafana**

Se diseña el dashboard **"RED — Alentapp API"** con exactamente 6 paneles funcionales, siguiendo las consultas PromQL de referencia del enunciado.

**Panel 1: Requests por segundo (Rate)**

| Campo | Valor |
| ----- | ----- |
| Nombre | Requests por segundo |
| Tipo | Time series |
| Propósito | Ver el tráfico actual (RPS) |

rate(http\_server\_duration\_count\[1m\])

Interpretación: picos súbitos indican aumento de carga; caídas a 0 indican pérdida de conectividad de red o caída del servicio.

---

**Panel 2: Tasa de error (Errors)**

| Campo | Valor |
| ----- | ----- |
| Nombre | Tasa de error (5xx) |
| Tipo | Time series |
| Propósito | Porcentaje de requests que fallan |

sum(rate(http\_server\_duration\_count{status=\~"5.."}\[1m\])) /  
sum(rate(http\_server\_duration\_count\[1m\])) \* 100

Interpretación: mide la confiabilidad del servicio. Valor por encima del 5% durante 3 minutos es señal de alerta crítica.

---

**Panel 3: Latencia p95/p99 (Duration)**

| Campo | Valor |
| ----- | ----- |
| Nombre | Latencia API (p95 / p99) |
| Tipo | Time series |
| Propósito | Medir la performance percibida por usuarios |

histogram\_quantile(0.95, sum(rate(http\_server\_duration\_bucket\[5m\])) by (le))  
histogram\_quantile(0.99, sum(rate(http\_server\_duration\_bucket\[5m\])) by (le))

Interpretación: permite validar SLOs de latencia. Latencia p95 sostenida por encima de 500ms indica degradación.

---

**Panel 4: Distribución por código de estado HTTP**

| Campo | Valor |
| ----- | ----- |
| Nombre | Por status code |
| Tipo | Stacked area |
| Propósito | Distribución de respuestas exitosas vs errores |

sum by (status) (rate(http\_server\_duration\_count\[5m\]))

Interpretación: facilita la distinción entre errores de cliente (4xx) y errores de servidor (5xx), y permite detectar ataques o rutas inexistentes.

---

**Panel 5: Memoria del proceso**

| Campo | Valor |
| ----- | ----- |
| Nombre | Memoria del proceso |
| Tipo | Time series |
| Propósito | Controlar el consumo de RAM del proceso |

process\_memory\_usage\_bytes / 1024 / 1024

Interpretación: crecimiento escalonado ininterrumpido confirma memory leak. Alerta recomendada si supera 400 MB.

---

**Panel 6: Endpoints más lentos (top 5\)**

| Campo | Valor |
| ----- | ----- |
| Nombre | Endpoints más lentos (Top 5\) |
| Tipo | Bar chart (horizontal) |
| Propósito | Identificar cuellos de botella por ruta |

topk(5, avg by (route) (http\_server\_duration\_ms))

Interpretación: permite priorizar optimizaciones de endpoints con mayor impacto en la experiencia del usuario.

---

## **SECCIÓN 2.3: ARCHIVOS A GENERAR EN FASE 3**

Los siguientes archivos deberán crearse o modificarse en la Fase 3 de implementación:

**Archivos nuevos a crear:**

1. `packages/api/Dockerfile.prod`  
2. `packages/web/Dockerfile.prod`  
3. `docker-compose.prod.yml`  
4. `packages/api/src/infrastructure/telemetry.ts`  
5. `observability/prometheus/prometheus.yml` — configuración de scrape apuntando a `api:9464`.  
6. `observability/grafana/provisioning/datasources/datasources.yml` — conexión automática a Prometheus.  
7. `observability/grafana/provisioning/dashboards/dashboards.yml` + `observability/grafana/provisioning/dashboards/red_dashboards.json` — dashboard preconfigurado (Infrastructure as Code).

**Archivos a modificar:**

1. `packages/api/src/app.ts` — agregar `import './infrastructure/telemetry.js'` como primer import.
2. `packages/api/src/delivery/DisciplineController.ts`
3. `packages/api/src/delivery/LockerController.ts`
4. `packages/api/src/delivery/MedicalCertificateController.ts`
5. `packages/api/src/delivery/MemberController.ts`
7. `packages/api/src/delivery/PaymentController.ts`
8. `packages/api/src/delivery/SportController.ts`
---

## **SECCIÓN 2.4: DECISIONES ARQUITECTÓNICAS**

**Uso de `node:22-alpine` como imagen base:**  
 Se utiliza la versión 22 (LTS activa) en lugar de versiones anteriores para garantizar compatibilidad con las últimas versiones del SDK de OpenTelemetry y las auto-instrumentaciones. Alpine reduce el tamaño base a \~170 MB frente a los \~1 GB de la imagen completa, sin sacrificar funcionalidad para este stack (Fastify \+ Prisma no requiere módulos nativos con dependencias de glibc).

**Uso de Multi-stage Builds:**  
 Permite cumplir con el criterio de evaluación de "buenas prácticas y optimización productiva". Al excluir devDependencies y compiladores del stage final, se reduce la superficie de ataque y se alcanza la meta de reducción ≥ 70% del tamaño original (de \~1 GB a \~250-300 MB en la API, de \~570 MB a \~30 MB en la Web).

**Uso de Nginx para el frontend:**  
 La compilación del SPA de React como artefacto estático garantiza que las herramientas utilizadas coincidan con entornos enterprise reales. Nginx facilita la configuración de certificados SSL, control de caché y elimina la sobrecarga de usar Node.js para servir HTML/CSS/JS. La imagen `nginx:stable-alpine` pesa \~23 MB.

**Uso de OpenTelemetry:**  
 Actúa como estándar agnóstico al proveedor de monitoreo. La auto-instrumentación disminuye la intrusión en el código existente de Fastify. Exportar directamente a Prometheus via `@opentelemetry/exporter-prometheus` evita la necesidad de un OTel Collector adicional, simplificando la arquitectura para este contexto.

**Uso de Prometheus (modelo Pull):**  
 Garantiza que el backend de la API nunca sufra caídas de rendimiento si la plataforma de monitoreo colapsa. El scrape pull es unidireccional: Prometheus toma los datos de la API, no al revés.

**Uso de Grafana con provisioning por código:**  
 El dashboard se define como JSON en `observability/grafana/provisioning/dashboards/` y el datasource como YAML. Esto garantiza que la infraestructura de observabilidad sea reproducible y versionada (Infrastructure as Code), cumpliendo la consigna de "Configuration as Code".

**Estrategia de seguridad (`read_only`, `cap_drop`, `no-new-privileges`):**  
 Alineada con los CIS Docker Benchmarks. `read_only: true` previene que un proceso comprometido escriba al filesystem del contenedor. `cap_drop: ALL` elimina todas las Linux capabilities y `cap_add: NET_BIND_SERVICE` restaura solo la necesaria para escuchar en puertos \< 1024\. `no-new-privileges` impide que el proceso escale privilegios vía `setuid`.

**Variables sensibles mediante `.env`:**  
 Las credenciales de la base de datos (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`) se leen desde un archivo `.env` que está listado en `.gitignore` y no se comitea al repositorio. El compose define los valores como `${VAR}` y documenta los defaults en un `.env.example` versionado.