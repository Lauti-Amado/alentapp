# Fase 1: Analizar y proponer

Autor/a: Bernardita La Gioiosa  
Proyecto: Alentapp  

## 1.1. Análisis de la infraestructura Docker actual

La infraestructura Docker actual del proyecto está orientada principalmente a desarrollo local. Esto se observa en el uso de comandos de desarrollo, montaje del código fuente como volumen, credenciales fijas dentro del `docker-compose.yml` y ausencia de controles habituales para un entorno productivo. A continuación se documentan cinco problemas o vulnerabilidades relevantes respecto a buenas prácticas de producción.

| Problema | ¿Dónde ocurre? | Impacto | Solución propuesta |
|---|---|---|---|
| Uso de comandos y configuración de desarrollo en los contenedores. La API ejecuta `prisma migrate dev` y `tsx watch`, mientras que el frontend ejecuta el servidor de desarrollo de Vite. Estos comandos están pensados para desarrollo local, no para producción. En particular, `prisma migrate dev` no debería usarse en producción, porque está orientado a iterar durante el desarrollo y puede generar o aplicar cambios de esquema de forma no adecuada para un despliegue controlado. | `docker-compose.yml`, servicio `api`, sección `command`, aproximadamente líneas 35-38. `docker-compose.yml`, servicio `web`, sección `command`, aproximadamente línea 58. También aparece como comando por defecto en `packages/api/Dockerfile`, aproximadamente línea 22, y `packages/web/Dockerfile`, aproximadamente línea 16. | Alto. En producción puede provocar reinicios innecesarios, menor rendimiento, ejecución de migraciones no controladas y exposición de servidores de desarrollo. | Separar configuraciones de desarrollo y producción. Para producción, construir la API y ejecutarla con Node sobre archivos compilados. Para el frontend, generar archivos estáticos con `npm run build` y servirlos con un servidor adecuado, por ejemplo Nginx o un runtime optimizado. Si se ejecutan migraciones en producción, deberían aplicarse mediante un mecanismo controlado, como `prisma migrate deploy`, o mediante una tarea separada del arranque normal del contenedor. |
| Credenciales y variables sensibles hardcodeadas. El usuario, password, nombre de base de datos y `DATABASE_URL` están escritos directamente en el archivo Compose. | `docker-compose.yml`, servicio `db`, sección `environment`, aproximadamente líneas 5-8. `docker-compose.yml`, servicio `api`, variable `DATABASE_URL`, aproximadamente línea 30. | Alto. Las credenciales quedan expuestas en el repositorio y son difíciles de rotar. Si se reutilizan en otros entornos, aumentan el riesgo de acceso no autorizado a la base de datos. | Usar variables de entorno externas, archivos `.env` no versionados o mecanismos de secretos del orquestador utilizado. En producción, definir credenciales distintas por ambiente y rotarlas periódicamente. Evitar contraseñas triviales como `password123`. |
| Los contenedores de API y web se ejecutan como root por defecto. No se declara ningún `USER` no-root en los Dockerfiles. | `packages/api/Dockerfile`, no hay instrucción `USER` después de `FROM node:20-alpine`, aproximadamente desde línea 1 hasta el final. `packages/web/Dockerfile`, misma situación desde línea 1 hasta el final. | Alto. Si una aplicación dentro del contenedor es comprometida, ejecutarla como root aumenta el impacto potencial dentro del contenedor y sobre recursos montados. | Crear o utilizar un usuario no-root, ajustar permisos de `/app` y ejecutar el proceso con `USER node` u otro usuario sin privilegios. Complementar con opciones de endurecimiento en Compose u orquestador, como `read_only`, `cap_drop` y permisos mínimos sobre volúmenes. |
| Imágenes con dependencias innecesarias y build no optimizado para producción. Se ejecuta `npm install`, que instala dependencias generales del monorepo y probablemente dependencias de desarrollo. En la API incluso se copian manifests de `api`, `shared` y `web`, lo que puede agrandar la imagen final. Además no hay build multi-stage y el uso de `COPY . .` vuelve importante contar con un `.dockerignore` adecuado para no enviar archivos innecesarios al contexto de build. | `packages/api/Dockerfile`, `COPY` de manifests de varios paquetes aproximadamente líneas 6-9, `RUN npm install` aproximadamente línea 12 y `COPY . .` aproximadamente línea 17. `packages/web/Dockerfile`, `RUN npm install` aproximadamente línea 8 y `COPY . .` aproximadamente línea 11. | Medio. Imágenes más grandes tardan más en construirse y desplegarse, consumen más almacenamiento y pueden incluir herramientas o paquetes innecesarios que amplian la superficie de ataque. Si no se excluyen archivos sensibles o pesados del contexto, también pueden incorporarse al build de forma accidental. | Usar builds multi-stage. Instalar solo dependencias necesarias para producción con `npm ci` y, cuando corresponda, `--omit=dev`. Copiar primero manifests para aprovechar cache de capas y luego copiar solo el código requerido. Incorporar o revisar un `.dockerignore` que excluya, por ejemplo, `node_modules`, `.git`, `dist`, `coverage` y `.env`. En el frontend, generar el build y copiar únicamente los archivos estáticos finales a la imagen de producción. |
| Ausencia de controles operativos de producción: healthchecks para API y web, límites de CPU/memoria, filesystem de solo lectura y reducción de capabilities. Solo la base de datos tiene `healthcheck`. | `docker-compose.yml`, servicio `db`, healthcheck aproximadamente líneas 13-17. Servicios `api` y `web`, aproximadamente líneas 19-60, no definen `healthcheck`, `mem_limit`, `cpus`, `read_only`, `cap_drop` ni políticas equivalentes. | Medio. Sin healthchecks, el orquestador no puede detectar correctamente si la API o el frontend están vivos. Sin límites de recursos, un contenedor puede consumir CPU o memoria en exceso. Sin restricciones de filesystem y capabilities, se mantiene una superficie de ataque mayor a la necesaria. | Agregar healthchecks específicos para API y web. Definir límites de CPU y memoria según pruebas de carga. En producción, configurar filesystem de solo lectura cuando sea posible, montar solo directorios necesarios con permisos acotados y eliminar capabilities no requeridas con `cap_drop: ["ALL"]`, agregando solo las estrictamente necesarias si existieran. |

En síntesis, la configuración actual es adecuada como base de desarrollo local, pero no debería utilizarse directamente como configuración de producción. La principal mejora estructural sería separar explícitamente los entornos `dev` y `prod`, construir imágenes optimizadas y aplicar controles de seguridad y operación propios de producción.

---

## 1.2. Investigación sobre OpenTelemetry

### ¿Qué es OpenTelemetry y cómo se diferencia de Prometheus?

OpenTelemetry es un conjunto de estándares, APIs, SDKs y herramientas para instrumentar aplicaciones y recolectar datos de observabilidad. Su objetivo es permitir que una aplicación genere telemetría de forma estandarizada, independientemente de la herramienta final donde esos datos se almacenen o visualicen.

Prometheus, en cambio, es principalmente un sistema de monitoreo y almacenamiento de métricas. Se especializa en recolectar métricas, guardarlas como series temporales y permitir consultas con PromQL.

OpenTelemetry no reemplaza a Prometheus. La diferencia principal es que OpenTelemetry se enfoca en instrumentar aplicaciones y exportar telemetría, mientras que Prometheus se enfoca en recolectar, almacenar y consultar métricas. OpenTelemetry puede exportar métricas hacia Prometheus, pero también puede exportar trazas y logs hacia otros backends.

### Los 3 pilares de la observabilidad

Los tres pilares clásicos de la observabilidad son:

- **Métricas**: valores numéricos medidos en el tiempo, como cantidad de requests, uso de CPU, errores o duración de operaciones.
- **Logs**: registros de eventos generados por la aplicación o la infraestructura.
- **Trazas**: representaciones del recorrido de una solicitud a través de distintos servicios, funciones o componentes.

OpenTelemetry aborda los tres pilares: métricas, logs y trazas. Su aporte central es estandarizar cómo se generan, recolectan y exportan esos datos, especialmente en sistemas distribuidos. Sin embargo, para esta actividad el foco estará puesto principalmente en métricas RED para la API, ya que permiten evaluar tráfico, errores y tiempos de respuesta del servicio.

### Métricas RED: Rate, Errors y Duration

Las métricas RED son un enfoque para observar servicios, especialmente APIs y sistemas que atienden solicitudes.

- **Rate**: mide la cantidad de solicitudes procesadas por unidad de tiempo. Sirve para conocer el nivel de tráfico, detectar picos de uso y dimensionar capacidad.
- **Errors**: mide la cantidad o proporción de solicitudes fallidas. Sirve para detectar problemas funcionales, regresiones, errores de infraestructura o degradación del servicio.
- **Duration**: mide cuánto tarda en completarse una solicitud. Sirve para analizar latencia, experiencia de usuario y cuellos de botella de rendimiento.

En conjunto, RED permite responder preguntas básicas pero críticas: cuánto trafico recibe el servicio, cuántos errores produce y cuánto tarda en responder.

### ¿Qué es OTLP?

OTLP significa OpenTelemetry Protocol. Es el protocolo estándar de OpenTelemetry para enviar telemetría, como métricas, logs y trazas, desde aplicaciones instrumentadas hacia un collector o backend de observabilidad. Su utilidad principal es desacoplar la aplicación del backend de observabilidad elegido.

La ventaja de usar OTLP frente a exportar directamente a Prometheus es la flexibilidad. Si una aplicación exporta directamente a Prometheus, queda más acoplada a ese destino y principalmente al modelo de métricas. Con OTLP, la aplicación puede enviar telemetría a un OpenTelemetry Collector, y el collector puede procesarla, filtrarla, enriquecerla y reenviarla a distintos destinos: Prometheus para métricas, Grafana Tempo para trazas, Loki para logs u otros backends compatibles.

Esto permite cambiar herramientas de observabilidad sin modificar de forma significativa el código de la aplicación. En esta actividad se propone exponer métricas compatibles con Prometheus, pero OTLP sería especialmente útil en una arquitectura que incorpore OpenTelemetry Collector como componente intermedio.

### Relación entre OpenTelemetry y Grafana

Grafana es una plataforma de visualización y análisis de datos de observabilidad. OpenTelemetry puede generar y enviar datos que luego Grafana visualiza a través de distintas fuentes de datos.

Por ejemplo, una aplicación puede instrumentarse con OpenTelemetry y enviar telemetría al OpenTelemetry Collector. Luego, el collector puede exportar métricas a Prometheus, trazas a Grafana Tempo y logs a Grafana Loki. Grafana se conecta a esos backends y permite construir dashboards, explorar trazas, analizar logs y correlacionar eventos.

Por lo tanto, OpenTelemetry y Grafana no cumplen el mismo rol. OpenTelemetry se ocupa de instrumentar, recolectar y transportar telemetría; Grafana se ocupa de visualizarla, consultarla y facilitar el análisis operativo.
