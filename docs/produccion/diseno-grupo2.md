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
El archivo `docker-compose.prod.yml` tendrá como objetivo orquestar los servicios de la aplicación en un entorno de producción, garantizando una configuración consistente, segura y fácilmente reproducible. Permitirá coordinar la ejecución de la API, el frontend y la base de datos, aplicando políticas de seguridad, límites de recursos y mecanismos de verificación de estado para cada servicio.

**Estructura:**  
La configuración estará organizada en tres secciones principales:

- **Servicios (`services`)**: Se definirán los siguientes servicios:
   - **`api`**: Backend Node.js ejecutado mediante la imagen construida a partir de `packages/api/Dockerfile.prod`.
   - **`web`**: Frontend servido mediante Nginx utilizando la imagen generada desde `packages/web/Dockerfile.prod`.
   - **`db`**: Base de datos PostgreSQL con persistencia de datos mediante volúmenes.
   - *Nota:* La API dependerá de la disponibilidad de la base de datos mediante `depends_on` con condición de `service_healthy`, para evitar intentos de conexión prematuros durante el arranque.

- **Redes (`networks`)**: Se utilizará una red personalizada denominada `alentapp-prod-net` con driver `bridge`. Esta red permitirá:
   - Aislar la comunicación interna entre servicios.
   - Evitar el uso de la red `bridge` por defecto de Docker.
   - Exponer únicamente los puertos necesarios al exterior.

- **Volúmenes (`volumes`)**: Se definirá un volumen persistente (`postgres_data`) para PostgreSQL con el objetivo de conservar los datos ante reinicios o recreaciones de contenedores.

**Requisitos no funcionales:**

- **Seguridad:** Todos los servicios deberán ejecutarse siguiendo el principio de mínimo privilegio:
  - Filesystem de solo lectura mediante `read_only: true` (cuando sea posible, usando `tmpfs` para directorios temporales).
  - Eliminación de capacidades innecesarias mediante `cap_drop: ALL`.
  - Incorporación exclusiva de capacidades requeridas mediante `cap_add: NET_BIND_SERVICE`.
  - Restricción de escalamiento de privilegios mediante `security_opt: no-new-privileges:true`.
  - Variables sensibles cargadas desde archivos de entorno, evitando credenciales hardcodeadas.

- **Healthchecks:** Los servicios críticos contarán con mecanismos de verificación de estado para detectar fallos de forma temprana y facilitar la recuperación del sistema:
  - **API:** Verificación del endpoint `/health`.
  - **Base de datos:** Validación mediante el comando `pg_isready`.
  - **Frontend:** Verificación de disponibilidad del servidor Nginx (puerto 80).

- **Resource limits:** Cada servicio contará con límites de CPU y memoria para evitar consumos excesivos que puedan afectar la estabilidad del entorno:

    | Servicio | CPU | Memoria |
    | :--- | :--- | :--- |
    | **API** | 0.50 | 512 MB |
    | **Web** | 0.25 | 128 MB |
    | **Base de Datos** | 1.00 | 512 MB |

- **Logging:** Se utilizará el driver `json-file` con rotación configurada para evitar el crecimiento indefinido de los archivos de log:
  - `max-size: "10m"`
  - `max-file: "3"`

- **Gestión de configuración y secretos:**  
Las variables sensibles no se almacenarán dentro del repositorio ni en el archivo Compose. La configuración se cargará mediante un archivo `.env.prod`, utilizando `.env.prod.example` como plantilla de referencia para los desarrolladores. Entre las variables esperadas se incluyen:
  - Credenciales de PostgreSQL.
  - URL de conexión a la base de datos.
  - Secretos de autenticación (ej. JWT).
  - Configuración específica del entorno de producción (`NODE_ENV=production`).

**Resumen de configuración:**

| Aspecto | Requisito |
| :--- | :--- |
| **Resource limits** | CPU y memoria definidos por servicio. |
| **Healthchecks** | Para API y DB (y Web). |
| **Seguridad** | `read_only: true`, `cap_drop: ALL`, `cap_add: NET_BIND_SERVICE`, `no-new-privileges`. |
| **Logging** | Driver `json-file` con rotación (`max-size: 10m`, `max-file: 3`). |
| **Red** | Red interna personalizada (no la default bridge). |
| **Secrets** | Variables sensibles desde archivo `.env.prod` (no hardcodeadas). |

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