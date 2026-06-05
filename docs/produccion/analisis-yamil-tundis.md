# Fase 1 — Yamil Tundis

Fecha: 4 de junio de 2026

---

## 1.1. Analizar la infraestructura Docker actual


| Problema                                                                                                         | ¿Dónde ocurre?                                                                                                                                                                                                     | Impacto   | Solución propuesta                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Las credenciales de la base de datos y su conexión estan definidas en texto plano en el docker-compose.yml       | En el archivo `docker-compose.yml` en las lineas 6, 7 y 8 (servicio "db") y en la linea 30 (servicio "api")                                                                                                        | **Alto**  | Utilizar un archivo `.env` en el que se guarden las credenciales de manera local en cada equipo y entorno de trabajo y luego invocar esas credenciales desde el `docker-compose.yml`                                                                                                                                    |
| PostgreSQL expuesto al host mediante mapeo de puertos "5432:5432"                                                | En el archivo `docker-compose.yml` en las lineas 9 y 10.                                                                                                                                                           | **Alto**  | Eliminar las linea `ports: '5432:5432'` en producción y dejar la base de datos accesible solo por la red interna de Docker (llamando a `"db:5432"` ya el backend se conectaria con la bd)                                                                                                                               |
| Los contenedores de API y web se ejecutan como usuario root (por defecto en la imagen base)                      | En los archivos `/packages/api/Dockerfile` y `packages/web/Dockerfile:1-16`                                                                                                                                        | **Alto**  | Crear un usuario no privilegiado (`addgroup`/`adduser` en Alpine), ajustar permisos de `/app` con `chown`, y declarar `USER node` (o un usuario dedicado) antes de `CMD` para que ante un ataque en la aplicacion, el atacante tenga los permisos de un usuario sin privilegios y no los de root dentro del contenedor. |
| El stack está orientado a desarrollo, no a producción (hot-reload, migraciones `dev`, montaje del código fuente) | Montaje de código:`docker-compose.yml:24-28`Hot-reload, prácticas de desarrollo y migraciones dev: `docker-compose.yml:35-38`, `docker-compose.yml:58`, `packages/api/Dockerfile:22`, `packages/web/Dockerfile:16` | **Alto**  | Separar perfiles: `docker-compose.dev.yml` y `docker-compose.prod.yml` con imagen multi-stage, `prisma migrate deploy`, sin `CHOKIDAR_USEPOLLING` ni montaje de `.:/app`. El comando de arranque en producción no debe regenerar el cliente ni aplicar migraciones de desarrollo en cada reinicio.                      |
| Sin límites de CPU/memoria ni healthchecks en los servicios `api` y `web`                                        | Archivo `docker-compose-yml` en los servicios API y WEB                                                                                                                                                            | **Medio** | Añadir `healthcheck` (por ejemplo, HTTP a `/health` en la API y a la raíz en el front) y bloque `mem_limit`/`cpus`. Tambien usar `depends_on` con `condition: service_healthy` también para `web` a `api`, no solo de `db` a `api`.                                                                                     |


---

## 1.2. Investigar OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

**OpenTelemetry** es un estándar y un conjunto de SDKs, APIs y herramientas para **instrumentar** aplicaciones y **exportar telemetría**: trazas, métricas y logs. Lo mantienen la Cloud Native Computing Foundation (CNCF). No es un sistema de almacenamiento ni un panel de visualización porque define *cómo* generar y enviar datos; el backend (Jaeger, Prometheus, Grafana Cloud, etc.) los recibe.

**Prometheus** es un **sistema de monitoreo** orientado a **métricas**: recolecta series temporales (pull por HTTP en `/metrics`), las almacena en su propia base de datos y permite consultarlas con PromQL. También puede alertar (con Alertmanager). No estandariza trazas ni logs; su foco es métricas de infraestructura y aplicación en formato Prometheus.

---

### ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?

Los **tres pilares** de la observabilidad son:

1. **Métricas:** números agregados en el tiempo (CPU, latencia p95, requests por segundo, errores por minuto). Sirven para alertas, tendencias y capacidad.
2. **Trazas :** el recorrido de una petición a través de servicios (enlazados por un `trace_id`). Sirven para depurar cuellos de botella y fallos distribuidos.
3. **Logs:** eventos discretos con contexto (mensajes de error, auditoría). Sirven para detalle puntual y correlación con una traza o métrica anómala.

---

### Métricas RED (Rate, Errors, Duration)

**RED** es un método minimalista para monitorear **servicios que atienden tráfico de request/response** (APIs, gateways)


| Métrica      | Qué mide                                                                      | Para qué sirve                                                                                                       |
| ------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Rate**     | Cantidad de solicitudes por unidad de tiempo (req/s, req/min)                 | Detectar picos de tráfico, caídas de uso o saturación                                                                |
| **Errors**   | Proporción o conteo de solicitudes fallidas (HTTP 5xx, timeouts, excepciones) | Saber si el servicio “funciona pero mal”: un Rate alto con Errors alto indica incidente                              |
| **Duration** | Tiempo que tarda cada solicitud (latencia: media, p50, p95, p99)              | Detectar degradación de rendimiento aunque no haya errores explícitos; correlacionar con Rate alto (cola, BD lenta). |


---

### ¿Qué es el OTLP (OpenTelemetry Protocol)? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?

**OTLP** es el protocolo **nativo y estándar** de OpenTelemetry para enviar trazas, métricas y logs. Puede transportarse por **gRPC** o **HTTP** hacia un **OpenTelemetry Collector** o backends compatibles (Jaeger, Tempo, Datadog, etc.).

**Ventajas frente a exportar directo a Prometheus desde la app:**

1. **Un solo pipeline para las tres señales:** la aplicación habla OTLP; el Collector enruta trazas a Jaeger, métricas a Prometheus y logs a Loki, sin que el código conozca cada destino.
2. **Desacoplamiento:** cambiar de Prometheus a otro backend o añadir uno nuevo se hace en el Collector, no redeployando todas las apps.
3. **Procesamiento en el medio:** en el Collector se pueden filtrar, muestrear trazas, agregar, enmascarar datos sensibles o convertir formatos antes del almacenamiento.
4. **Prometheus es pull y formato propio:** las apps no “empujan” a Prometheus de forma nativa; suelen exponer `/metrics` para que Prometheus scrapee. OTLP es **push** unificado; el Collector puede exponer el endpoint que Prometheus scrapea (receiver OTLP → exporter Prometheus).
5. **Trazas y logs:** Prometheus no consume trazas OTLP; exportar solo a Prometheus dejaría fuera dos pilares. OTLP los lleva en el mismo modelo.

Exportar métricas directamente al endpoint de Prometheus desde cada microservicio es posible, pero multiplica acoplamiento y configuración; OTLP + Collector es el patrón recomendado en arquitecturas con varios backends.

---

### ¿Cómo se relaciona OpenTelemetry con Grafana?

**Grafana** es una plataforma de **visualización y operación** (dashboards, alertas, exploración). OTel **genera y exporta** datos; Grafana **los muestra y explota** cuando están en un almacén compatible.

Relación típica en el stack **LGTM** (Loki, Grafana, Tempo, Mimir) u homólogos:


| Señal OTel | Almacén habitual           | Uso en Grafana                            |
| ---------- | -------------------------- | ----------------------------------------- |
| Métricas   | **Mimir** o **Prometheus** | Dashboards RED, alertas, PromQL           |
| Trazas     | **Tempo** (o Jaeger)       | Trace explorer, saltar de métrica a traza |
| Logs       | **Loki**                   | Logs correlacionados por `trace_id`       |


Flujo resumido:

```text
App (SDK OTel) --OTLP--> Collector --+--> Prometheus/Mimir --> Grafana (métricas)
                                      +--> Tempo              --> Grafana (trazas)
                                      +--> Loki               --> Grafana (logs)
```

