# Alentapp

Alentapp es una plataforma moderna para la gestión de socios y administración de clubes. Está construida como un monorepo utilizando Typescript, React (Vite + Chakra UI) en el frontend, y Fastify con Prisma (PostgreSQL) en el backend, siguiendo los principios de la Arquitectura Hexagonal.

Para conocer en detalle las decisiones de arquitectura del proyecto, puedes consultar la [Documentación de Arquitectura](./docs/ARCHITECTURE.md).

---

## Requisitos Previos

- **Node.js** (v18 o superior recomendado)
- **npm** (gestor de paquetes)
- **Docker** y **Docker Compose**

## Guía de Instalación y Ejecución

La forma más rápida y recomendada de levantar el entorno de desarrollo es utilizando **Docker Compose**. Este método configurará la base de datos PostgreSQL, ejecutará las migraciones de Prisma, y levantará tanto el frontend como el backend automáticamente con hot-reloading.

### Opción A: Usando Docker Compose (Recomendado)

1. **Clonar el repositorio**:
   ```bash
   git clone <url-del-repositorio>
   cd alentapp
   ```
2. **Levantar los servicios**:
   ```bash
   docker compose up --build
   ```
   *¡Eso es todo!* Docker se encargará de instalar las dependencias, aplicar la base de datos y correr los entornos. 
   - La **API** estará disponible en `http://localhost:3000`
   - El **Frontend** estará disponible en `http://localhost:5173`

*(Nota: Si deseas detener los contenedores, simplemente presiona `Ctrl+C` y ejecuta `docker compose down`)*.

## Comandos Útiles de Base de Datos

Si necesitas visualizar la base de datos gráficamente a través del navegador, puedes usar Prisma Studio:
```bash
cd packages/api
npx prisma studio
```

---

## 🧪 Testing

El proyecto cuenta con una suite completa de tests (Unitarios, Integración y E2E Full-Stack). Para aprender a ejecutarlos y ver los diferentes modos disponibles (UI, Headed, Docker), consulta la **[Guía de Testing](./docs/TESTING.md)**.

## 🤝 Contribuir

Si deseas colaborar con el proyecto, por favor lee primero nuestra **[Guía de Contribución](./docs/CONTRIBUTING.md)** para entender el flujo de trabajo con feature branches y los estándares de código.

---

## 📂 Documentación Adicional

En la carpeta `/docs` encontrarás información detallada sobre:
- **[Arquitectura](./docs/ARCHITECTURE.md)**: Decisiones técnicas y estructura del monorepo.
- **[Testing](./docs/TESTING.md)**: Todo sobre la infraestructura de pruebas.
- **[Contribución](./docs/CONTRIBUTING.md)**: Cómo empezar a desarrollar en el proyecto.
- **TDDs**: Diseños técnicos y pruebas de cada funcionalidad implementada.
