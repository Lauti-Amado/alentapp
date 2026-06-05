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
