# Estrategia de Testing - Alentapp

Este documento detalla la infraestructura de testing implementada en el proyecto, cubriendo desde pruebas unitarias hasta tests End-to-End (E2E) Full-Stack.

## 🚀 Resumen de Comandos

### Tests Globales (Raíz)
| Comando | Descripción |
|---|---|
| `npm run e2e:fullstack:run` | **Recomendado para CI**. Levanta Docker, corre tests full-stack y apaga todo. |
| `npm run e2e:fullstack:ui:run` | Levanta Docker y abre la interfaz interactiva de Playwright. |
| `npm run e2e:fullstack:headed:run` | Levanta Docker, corre tests con navegador visible y apaga todo. |
| `npm run e2e:fullstack:up` | Levanta el entorno Docker de pruebas (DB, API, Web). |
| `npm run e2e:fullstack:down` | Apaga el entorno Docker de pruebas y limpia volúmenes. |
| `npm run e2e:fullstack` | Ejecuta los tests E2E Full-Stack (requiere `up` previo). |
| `npm run e2e:fullstack:ui` | Abre la interfaz interactiva (requiere `up` previo). |
| `npm run e2e:fullstack:headed` | Ejecuta con navegador visible (requiere `up` previo). |

### Tests de Frontend (`packages/web`)
| Comando | Descripción |
|---|---|
| `npm run test` | Ejecuta tests unitarios e integración con Vitest. |
| `npm run coverage` | Genera reporte de cobertura de código del frontend. |
| `npm run e2e` | Ejecuta tests E2E **aislados** (con mocks de red). |

---

## 🛠 Niveles de Testing

### 1. Tests Unitarios e Integración (Vitest + RTL)
Ubicados en `packages/web/src/**/*.test.tsx`.
*   **Propósito**: Validar la lógica de componentes y hooks de forma aislada.
*   **Entorno**: JSDOM (simulación de navegador en Node).
*   **Mocks**: Se mockean los servicios de API para probar solo la UI.

### 2. E2E Frontend Aislado (Playwright + Mocks)
Ubicados en `packages/web/e2e/`.
*   **Propósito**: Probar flujos de usuario complejos sin depender de que la API real esté funcionando.
*   **Funcionamiento**: Playwright intercepta las llamadas `/api/v1/*` y devuelve respuestas predefinidas (Mocking Stateful).
*   **Ventaja**: Son extremadamente rápidos y deterministas.

### 3. E2E Full-Stack (Playwright + Docker)
Ubicados en `e2e-fullstack/`.
*   **Propósito**: Validar el flujo real desde el Navegador -> React -> API (Fastify) -> Base de Datos (PostgreSQL).
*   **Infraestructura**: Usa `docker-compose.e2e.yml` para levantar una base de datos de prueba aislada (`alentapp_test_db`).
*   **Limpieza Dinámica**: El script `global-setup.ts` detecta automáticamente todas las tablas del esquema público y las limpia antes de cada suite, garantizando que los tests no dependan de basura de ejecuciones anteriores.

---

## 📂 Estructura de Archivos
*   `playwright.fullstack.config.ts`: Configuración para el entorno real.
*   `e2e-fullstack/global-setup.ts`: Orquestador que espera a la API y limpia la DB.
*   `packages/web/playwright.config.ts`: Configuración para el entorno con mocks.
*   `packages/api/.env.test`: Configuración de la API para el entorno de pruebas.

## 💡 Buenas Prácticas
1.  **Aislamiento de Datos**: Nunca corras los tests E2E contra tu base de datos de desarrollo local. Usá siempre los scripts de Docker provistos.
2.  **Selectores**: Preferí `page.getByRole` o `page.getByText` antes que selectores CSS o IDs, para asegurar que los tests sean accesibles.
3.  **Mocks vs Real**: Usá los tests con mocks para desarrollo rápido de UI y los Full-Stack para asegurar que el "contrato" entre Front y Back no se haya roto.
