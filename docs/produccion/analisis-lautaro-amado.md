# Fase 1: Analizar y proponer

## 1.1. Análisis de la infraestructura Docker actual

### Problemas identificados

| Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
|---|---|---|---|
| Las imágenes no usan multi-stage build, entonces el compilador de TypeScript, las devDependencies y el código fuente quedan dentro de la imagen final | `packages/api/Dockerfile` y `packages/web/Dockerfile`, en el único `FROM` de cada archivo | **Alto** — la imagen de la API puede superar 1 GB cuando en producción solo se necesita el JS compilado y las dependencias de producción | Usar un multi-stage build con etapas separadas para instalar dependencias, compilar y ejecutar, copiando solo los artefactos necesarios en la etapa final |
| Los contenedores corren como root porque ninguno de los dos Dockerfiles define un usuario distinto con `USER` | `packages/api/Dockerfile` y `packages/web/Dockerfile`, ninguna línea define `USER` | **Alto** — si algún proceso del contenedor es comprometido, el atacante tiene permisos de root dentro del contenedor | Agregar `USER node` (o crear un usuario `appuser`) antes del `CMD` en la etapa final de cada Dockerfile |
| La variable `DATABASE_URL` tiene usuario, contraseña y nombre de base de datos escritos directamente en el `docker-compose.yml` | `docker-compose.yml`, sección `environment` del servicio `api` (`DATABASE_URL=postgres://admin:password123@db:5432/alentapp_db`) y sección `environment` del servicio `db` (`POSTGRES_PASSWORD: password123`) | **Alto** — cualquier persona con acceso al repositorio puede ver las credenciales; si el repo es público, quedan expuestas en el historial de git | Mover todas las variables sensibles a un archivo `.env` que esté en el `.gitignore`, y referenciarlas en el compose con `${VAR}`. |
| El servicio `api` monta todo el directorio del proyecto (`.:/app`), lo que significa que el filesystem del contenedor es de lectura y escritura completa, y no hay límites de CPU ni memoria en ningún servicio | `docker-compose.yml`, sección `volumes` del servicio `api` y `web`; ningún servicio tiene `deploy.resources.limits` | **Medio** — sin límites de recursos, un proceso que se descontrole puede consumir toda la RAM o CPU del host. | En producción, eliminar el volumen de bind mount y usar `read_only: true` con `tmpfs` para carpetas temporales; agregar `deploy.resources.limits` con valores de CPU y memoria por servicio |
| El orden de las instrucciones en los Dockerfiles no aprovecha el caché de capas de Docker: en el Dockerfile de la API se copia `COPY . .` antes de que Docker haya separado bien los archivos de manifiesto, y en el de la web se hace `RUN npm install` después de copiar solo algunos `package.json` pero sin el `package-lock.json` del paquete web | `packages/api/Dockerfile` líneas 4–12 y `packages/web/Dockerfile` líneas 4–7 | **Bajo** — cada vez que cambia cualquier archivo del proyecto (incluyendo código fuente), se invalida la capa del `npm install`, forzando una reinstalación completa aunque las dependencias no hayan cambiado | Copiar primero todos los `package*.json` y el `package-lock.json`, ejecutar `npm ci`, y después copiar el código fuente. Esto garantiza que la capa de dependencias se cachee correctamente |

---

## 1.2. Investigación sobre OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

OpenTelemetry (también llamado OTel) es un framework de código abierto para generar, recolectar y exportar datos de telemetría, es decir, métricas, trazas y logs. Su objetivo es que el código de instrumentación no quede atado a ninguna herramienta de monitoreo en particular.

Prometheus, en cambio, es una herramienta específica, es un sistema de recolección y almacenamiento de métricas que trabaja con el modelo pull (va a buscar las métricas a los servicios). OpenTelemetry puede exportar métricas hacia Prometheus, hacia Grafana Cloud, o hacia cualquier otro backend, sin cambiar el código de instrumentación. Dicho de otra forma: OpenTelemetry es la capa de instrumentación; Prometheus es uno de los posibles destinos de esos datos.

### ¿Cuáles son los "3 pilares" de la observabilidad? ¿Cuál aborda OpenTelemetry?

Los tres pilares de la observabilidad son las métricas (valores numéricos que describen el estado del sistema a lo largo del tiempo), las trazas (el seguimiento del camino que recorre una solicitud a través de los distintos servicios) y los logs (registros de eventos con timestamp). OpenTelemetry aborda los tres pilares: provee APIs y SDKs para instrumentar métricas, trazas y logs de forma unificada.

### ¿Qué son las métricas RED? ¿Para qué sirve cada una?

El método RED fue creado por Tom Wilkie de Grafana Labs y está pensado para monitorear servicios, especialmente en arquitecturas de microservicios. Sus tres métricas son:

- **Rate (Tasa):** la cantidad de solicitudes que recibe el servicio por segundo. Sirve para entender el volumen de tráfico actual y detectar picos o caídas inesperadas.
- **Errors (Errores):** la cantidad de esas solicitudes que están fallando. Sirve para medir la confiabilidad del servicio y construir alertas.
- **Duration (Duración):** el tiempo que tarda el servicio en responder cada solicitud. Sirve para medir la experiencia del usuario final y validar que se cumplen los tiempos de respuesta esperados.

Como dice el propio Wilkie: el método RED es un buen indicador de qué tan satisfechos están los usuarios. Un error rate alto llega directamente a los usuarios como errores de carga; una duración alta significa que el sitio está lento.

### ¿Qué es el OTLP (OpenTelemetry Protocol)? ¿Qué ventaja tiene frente a exportar directamente a Prometheus?

OTLP es el protocolo estándar de OpenTelemetry para transmitir datos de telemetría (métricas, trazas y logs).

La principal ventaja frente a exportar directamente a Prometheus es que OTLP es agnóstico al backend, es decir, los mismos datos se pueden enviar a Prometheus, a Grafana Cloud o a cualquier otro sistema compatible con OTLP, sin cambiar el código de la aplicación. Con el exportador de Prometheus directo, solo se pueden enviar métricas (no trazas ni logs) y solo a Prometheus. OTLP también permite enviar los tres tipos de señales por el mismo canal y soporta tanto el modelo push como pull.

### ¿Cómo se relaciona OpenTelemetry con Grafana?

Grafana es una de las herramientas que mejor soporte tiene para OpenTelemetry. El SDK de OpenTelemetry recolecta las métricas y las exporta a Prometheus. Luego, Grafana se conecta a Prometheus y nos permite visualizar todo armando dashboards interactivos con consultas PromQL. Cabe destacar que Grafana Labs aporta desarrollo activamente al proyecto OpenTelemetry, garantizando una integración impecable. Por este motivo, el stack OpenTelemetry + Prometheus + Grafana es hoy en día el estándar open source más utilizado en la industria.