# Análisis y Propuesta de Infraestructura Docker y Observabilidad
**Usuario:** Julian Figueira  
**Fecha:** 05 de junio de 2026  
**Materia:** Ingeniería y Calidad de Software - UTN FRLP (2026)

---

## 1.1. Análisis de la infraestructura Docker actual

### Problemas identificados:

| # | Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
|---|----------|----------------|---------|-------------------|
| 1 | **Comandos y configuración de desarrollo en producción** | `docker-compose.yml:30-32, 56` y ambos `Dockerfile` (línea de `CMD`). Se ejecutan `prisma migrate dev`, `tsx watch` y `npm run dev`. Además, se usan volúmenes bind mount (`.:/app`) para hot-reload. | **ALTO** | `migrate dev` puede resetear la base de datos y no es seguro para producción. Los servidores de desarrollo consumen más recursos, exponen source maps y código fuente. En producción, usar `prisma migrate deploy`, compilar TypeScript y ejecutar con `node dist/app.js`. Eliminar bind mounts y servir el frontend como archivos estáticos con Nginx. |
| 2 | **Credenciales hardcodeadas en texto plano** | `docker-compose.yml:7-8, 26` | **ALTO** | Las credenciales de base de datos (`admin`/`password123`) están expuestas directamente en el archivo de configuración. Cualquier persona con acceso al repositorio puede verlas. | Usar variables de entorno desde un archivo `.env` (agregado a `.gitignore`) o un secrets manager. Ejemplo: `POSTGRES_PASSWORD: ${DB_PASSWORD}` y definir `DB_PASSWORD` en `.env`. |
| 3 | **Contenedores ejecutándose como root** | `packages/api/Dockerfile` y `packages/web/Dockerfile` (todo el archivo) | **ALTO** | Ambos Dockerfiles no especifican un usuario no-root. Si hay una vulnerabilidad en la aplicación, el atacante tendrá privilegios de root dentro del contenedor, pudiendo comprometer el host. | Agregar `USER node` antes del `CMD` en ambos Dockerfiles (la imagen `node:20-alpine` ya incluye el usuario `node`). Alternativamente, crear un usuario específico con permisos mínimos. |
| 4 | **Imágenes pesadas y dependencias innecesarias en producción** | Ambos `Dockerfile` (todo el archivo). Utilizan una única etapa de construcción (single-stage build), por lo que la imagen final incluye dependencias y herramientas que no son necesarias en producción. | **MEDIO** | Las imágenes finales son innecesariamente grandes (incluyen TypeScript, Vite, ESLint, etc.). Al utilizar una única etapa de construcción (single-stage build), la imagen final incluye dependencias de desarrollo y herramientas de compilación que no son necesarias en producción, aumentando su tamaño y superficie de ataque. | Implementar multi-stage builds para separar las etapas de compilación y ejecución. De esta forma, la imagen final contendrá únicamente los artefactos necesarios para correr la aplicación. Además, utilizar npm ci para obtener instalaciones reproducibles y más consistentes entre entornos. |
| 5 | **Falta de healthchecks y límites de recursos** | `docker-compose.yml` (servicios `api` y `web`). No hay `healthcheck` definido ni límites de CPU/memoria (`deploy.resources`). | **MEDIO** | Sin healthchecks, Docker no puede detectar si los servicios están realmente funcionando. Sin límites de recursos, un contenedor puede consumir toda la CPU o memoria del host, afectando a otros servicios. | Agregar healthchecks específicos para API y web. En el caso de la API, exponer un endpoint de salud (por ejemplo `/health`) que permita verificar correctamente el estado del servicio. Definir `deploy.resources.limits` con valores acotados de `cpus` y `memory` para cada servicio. |

---

## 1.2. Investigación sobre OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?
**OpenTelemetry (OTel)** es un framework de observabilidad de código abierto, vendor-neutral, que proporciona un conjunto estandarizado de APIs, SDKs y herramientas para generar, colectar, procesar y exportar datos de telemetría (trazas, métricas y logs). Es un proyecto de la CNCF que unificó OpenTracing y OpenCensus.

**Diferencias clave con Prometheus:**
| Aspecto | OpenTelemetry | Prometheus |
|---------|---------------|------------|
| **Alcance** | Framework completo (trazas, métricas y logs) | Sistema especializado principalmente en métricas y alertas |
| **Modelo de datos** | Vendor-neutral, exporta a múltiples backends | Formato propio de series temporales |
| **Recolección** | Push (el agente envía los datos al backend) | Pull (Prometheus hace scraping de los endpoints expuestos) |
| **Dependencia** | No requiere un backend específico | Requiere su propio servidor de almacenamiento |
| **Instrumentación** | SDKs multi-lenguaje con APIs estandarizadas | Client libraries específicas para cada lenguaje |
| **Almacenamiento** | No almacena datos (solo los transporta) | Almacena series temporales localmente |

En resumen: **OpenTelemetry es el "sistema nervioso"** que recolecta y transporta los datos, mientras que **Prometheus es uno de los posibles "cerebros"** (backends) que recibe esos datos para almacenarlos y consultarlos.

---

### ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?
Los tres pilares clásicos de la observabilidad son:
1. **Métricas (Metrics):** Datos numéricos agregados en el tiempo (ej: requests por segundo, uso de CPU). Son livianas y útiles para dashboards y alertas.
2. **Trazas (Traces):** Registro del recorrido completo de una solicitud a través de múltiples servicios distribuidos. Permiten identificar cuellos de botella.
3. **Logs:** Registros de eventos discretos generados por la aplicación (errores, warnings, info).

**OpenTelemetry aborda los tres pilares.** Proporciona SDKs estandarizados para instrumentar aplicaciones y generar métricas, trazas y logs, exportables mediante un único protocolo a cualquier backend compatible.

---

### Expliquen el concepto de métricas RED (Rate, Errors, Duration). ¿Para qué sirve cada una?
Las **métricas RED** son un conjunto de tres indicadores clave definidos por Tom Wilkie para medir la salud de cualquier servicio orientado a solicitudes:

| Métrica | ¿Qué mide? | ¿Para qué sirve? |
|---------|------------|------------------|
| **Rate (Tasa)** | Número de solicitudes por unidad de tiempo (ej: req/s) | Indica la carga y el volumen de tráfico. Permite detectar picos de uso o caídas repentinas. |
| **Errors (Errores)** | Número de solicitudes fallidas por unidad de tiempo | Mide la calidad del servicio. Un aumento indica problemas de funcionalidad o dependencias caídas. |
| **Duration (Duración)** | Tiempo que tarda cada solicitud (generalmente en percentiles p50, p95, p99) | Mide el rendimiento y la experiencia del usuario. Permite detectar degradaciones que no generan errores. |

Juntas proporcionan una visión completa: cuánta gente lo usa (Rate), si funciona correctamente (Errors) y qué tan rápido responde (Duration).

---

### ¿Qué es el OTLP (OpenTelemetry Protocol)? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?
**OTLP (OpenTelemetry Protocol)** es el protocolo nativo de OpenTelemetry para transmitir datos de telemetría (trazas, métricas y logs) desde la aplicación instrumentada hacia un backend. Está basado en gRPC (con soporte para HTTP/protobuf) y define un formato de datos estandarizado.

**Ventajas de OTLP frente a exportar directamente a Prometheus:**
1. **Unificación de señales:** OTLP transporta los tres pilares en un solo protocolo. Prometheus solo maneja métricas.
2. **Independencia del backend:** Si cambias de Prometheus a Datadog, New Relic o Grafana Cloud, no necesitas re-instrumentar tu aplicación. Solo cambias el endpoint de exportación OTLP.
3. **Push vs Pull:** OTLP usa modelo push, lo que funciona mejor en entornos efímeros (Kubernetes, serverless) donde Prometheus tendría problemas para hacer scraping.
4. **Contexto distribuido:** OTLP preserva el contexto de propagación W3C entre servicios, permitiendo correlacionar trazas, métricas y logs automáticamente.
5. **Eficiencia:** OTLP usa protobuf binario comprimido, más eficiente en ancho de banda que el formato texto de Prometheus.

---

### ¿Cómo se relaciona OpenTelemetry con Grafana?
**Grafana** es una plataforma de visualización y análisis de datos de observabilidad. La relación con OpenTelemetry es **complementaria y no competitiva**:
- **OpenTelemetry** se encarga de la **generación y transporte** de los datos de telemetría.
- **Grafana** se encarga del **almacenamiento, consulta y visualización** de esos datos.

El flujo típico en una arquitectura moderna es:

                                                                          ├── Prometheus (métricas)
                                                                          ├── Tempo (trazas)
                                                                          └── Loki (logs)


**Grafana Labs** es además uno de los principales contribuidores de OpenTelemetry y mantiene backends nativos compatibles con OTLP (Tempo, Mimir, Loki) y su propio collector (Grafana Alloy). En resumen: OpenTelemetry es el estándar de instrumentación, Grafana es la ventana para ver y analizar esos datos.

---

## Resumen ejecutivo
La infraestructura Docker actual del proyecto presenta configuraciones válidas para **desarrollo local** pero con múltiples problemas críticos si se llevara a **producción**: comandos de desarrollo ejecutándose en producción, credenciales expuestas, ejecución como root, imágenes pesadas sin multi-stage build, y falta de healthchecks y límites de recursos. Las soluciones propuestas son estándar de la industria y de baja complejidad de implementación.

En cuanto a observabilidad, **OpenTelemetry** se posiciona como el estándar vendor-neutral para instrumentación, superando las limitaciones de soluciones puntuales como Prometheus gracias a su cobertura de los tres pilares y su protocolo unificado OTLP. Su integración con el ecosistema Grafana permite construir una solución completa de monitoreo sin vendor lock-in.