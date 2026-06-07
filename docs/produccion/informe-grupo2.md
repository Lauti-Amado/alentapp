# **Fase 4: Verificar y entregar**

---

## 4.1 Verificación técnica

Para validar la implementación de producción se compararon métricas del entorno de desarrollo con el entorno definido en `docker-compose.prod.yml`. Las verificaciones se realizaron sobre tamaño de imágenes, tiempo de startup de la API, consumo de memoria en reposo, accesibilidad de endpoints y disponibilidad del frontend servido mediante Nginx.

### Comandos utilizados para la verificación

| Métrica               | Antes (desarrollo)                      | Después (producción)                                                            |
| --------------------- | --------------------------------------- | ------------------------------------------------------------------------------- |
| Tamaño imagen API     | `docker images alentapp-api`            | `docker images alentapp-prod-api`                                               |
| Tamaño imagen Web     | `docker images alentapp-web`            | `docker images alentapp-prod-web`                                               |
| Tiempo de startup API | `time docker compose up -d api`         | `time docker compose --env-file .env.prod -f docker-compose.prod.yml up -d api` |
| Memoria API idle      | `docker stats --no-stream alentapp-api` | `docker stats --no-stream alentapp-api-prod`                                    |
| Endpoints accesibles  | `curl http://localhost:3000/api/v1/...` | `curl http://localhost:3000/api/v1/...`                                         |
| Frontend vía Nginx    | No aplica                               | `curl http://localhost/`                                                        |

### Resultados obtenidos

| Métrica               | Antes (desarrollo) | Después (producción) | Mejora                                                      |
| --------------------- | -----------------: | -------------------: | ----------------------------------------------------------- |
| Tamaño imagen API     |             427 MB |               194 MB | Reducción aproximada del 54.6%                              |
| Tamaño imagen Web     |             222 MB |              26.3 MB | Reducción aproximada del 88.2%                              |
| Tiempo de startup API |           16.026 s |              2.006 s | Reducción aproximada del 87.5%                              |
| Memoria API idle      |          161.5 MiB |            47.23 MiB | Reducción aproximada del 70.8%                              |
| Endpoints accesibles | OK: `/health`, `/api/v1/socios`, `/api/v1/sports` y `/api/v1/lockers` responden correctamente | OK: `/health`, `/api/v1/socios`, `/api/v1/sports` y `/api/v1/lockers` responden correctamente | Se mantiene la disponibilidad de la API en producción |
| Frontend vía Nginx | No aplica | OK: `curl http://localhost/` devuelve el HTML del frontend | El frontend se sirve como contenido estático mediante Nginx |

### Verificación de endpoints

Para validar la disponibilidad de la API se probaron los siguientes endpoints:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/socios
curl http://localhost:3000/api/v1/sports
curl http://localhost:3000/api/v1/lockers
```

En desarrollo, los endpoints respondieron correctamente. En producción, los endpoints también respondieron correctamente luego de levantar los servicios mediante `docker-compose.prod.yml`. En algunos casos, los endpoints devolvieron `data: []`, lo cual indica que la API respondió correctamente aunque la base de datos productiva local no tuviera registros cargados.

Además, se verificó el acceso al frontend servido por Nginx mediante:

```bash
curl http://localhost/
```

El comando devolvió el HTML principal del frontend, incluyendo la referencia al bundle generado por Vite. Esto confirma que Nginx está sirviendo correctamente la aplicación estática.

### Análisis de resultados

La imagen de la API se redujo de 427 MB a 194 MB, lo que representa una mejora aproximada del 54.6%. Esta reducción se debe al uso de un Dockerfile de producción orientado a runtime, evitando incluir dependencias y herramientas innecesarias en la imagen final.

La imagen del frontend presentó una mejora más significativa, pasando de 222 MB a 26.3 MB, con una reducción aproximada del 88.2%. Esto se logró al separar la etapa de build de Vite de la etapa de ejecución y utilizar Nginx como servidor de archivos estáticos en lugar del servidor de desarrollo.

El tiempo de startup de la API pasó de 16.026 segundos en desarrollo a 2.006 segundos en producción, lo que representa una reducción aproximada del 87.5%. Además, el consumo de memoria idle de la API disminuyó de 161.5 MiB a 47.23 MiB, con una mejora aproximada del 70.8%.

### Conclusión

La verificación técnica permitió comprobar que la configuración de producción ejecuta la aplicación con imágenes específicas para runtime, separando las herramientas de desarrollo del entorno final. Se observó una reducción considerable en el tamaño de las imágenes, una mejora en el tiempo de startup de la API y una disminución del consumo de memoria en reposo.

Además, los endpoints principales de la API se mantuvieron accesibles en producción y el frontend quedó correctamente servido mediante Nginx como contenido estático. Por lo tanto, la configuración resultante cumple con los objetivos técnicos de optimización y preparación para producción planteados.

---