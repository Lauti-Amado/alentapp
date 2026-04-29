# Arquitectura del Proyecto Alentapp

Alentapp está diseñado como un **Monorepo** (utilizando npm workspaces) que agrupa tanto el frontend como el backend en un solo repositorio. Esta decisión facilita compartir contratos, tipos y configuraciones de manera transparente.

## Estructura General

El proyecto se divide en tres paquetes principales dentro del directorio `/packages`:

1. **`@alentapp/shared` (Contratos Compartidos)**
2. **`@alentapp/api` (Backend)**
3. **`@alentapp/web` (Frontend)**

---

## 1. `@alentapp/shared` (Paquete Compartido)

Este paquete es el nexo de unión entre el frontend y el backend. Contiene exclusivamente código agnóstico que puede ejecutarse en ambos entornos (principalmente Typescript puro).

*   **Responsabilidad**: Definir interfaces (DTOs), tipos de peticiones (Requests) y enumeraciones.
*   **Beneficio**: Evita la duplicación de tipos. Si el backend cambia un campo requerido (ej. de `birth_date` a `birthdate`), el compilador de Typescript en el frontend avisará inmediatamente del error, garantizando seguridad de tipos end-to-end.

---

## 2. `@alentapp/api` (Backend)

El backend está construido sobre **Fastify** para la gestión HTTP y **Prisma** como ORM para comunicarse con una base de datos **PostgreSQL**.

### Arquitectura Hexagonal (Puertos y Adaptadores)

Para mantener el código altamente testeable y agnóstico al framework o base de datos, el backend aplica los principios de Arquitectura Hexagonal y Clean Architecture, separando el código en capas:

#### A. Capa de Dominio (`src/domain`)
Es el corazón de la aplicación. No tiene dependencias de librerías externas (ni Fastify, ni Prisma).
*   **Puertos (Interfaces)**: Contratos como `MemberRepository` que definen *qué* operaciones se pueden hacer en la base de datos, sin importar *cómo*.
*   **Servicios de Dominio**: Como `MemberValidator`, que encapsulan reglas de negocio complejas y compartidas (ej. cálculos de edad o validación estricta de formatos).

#### B. Capa de Aplicación (`src/application`)
Contiene los **Casos de Uso** (Use Cases). Aquí reside la orquestación del negocio (ej. `CreateMemberUseCase`, `DeleteMemberUseCase`).
*   Los casos de uso consumen los Puertos del Dominio y aplican la lógica. No saben si el usuario viene de un endpoint HTTP o de un script de consola.

#### C. Capa de Infraestructura / Adaptadores (`src/infrastructure` & `src/delivery`)
Es la capa más externa, responsable de hablar con el "mundo real":
*   **Adaptadores de Entrada (Delivery)**: `MemberController`. Reciben las peticiones HTTP de Fastify, extraen el body/params y llaman a los Casos de Uso correspondientes.
*   **Adaptadores de Salida (Infrastructure)**: `PostgresMemberRepository`. Es la implementación real del puerto `MemberRepository`. Aquí vive el código específico de Prisma que inserta o lee de la base de datos.

---

## 3. `@alentapp/web` (Frontend)

El cliente web es una **Single Page Application (SPA)** construida con **React** y empacada por **Vite**.

### Tecnologías Principales
*   **Enrutamiento**: Utiliza `react-router` para manejar la navegación sin recargar la página.
*   **UI / Estilos**: Construido fuertemente sobre **Chakra UI v3**, que proporciona un sistema de diseño robusto, accesible y moderno con soporte para componentes polimórficos y temas.
*   **Estructura de Componentes**:
    *   `/views`: Páginas completas orquestadas por el router (ej. `Home.tsx`, `Members.tsx`).
    *   `/components`: Componentes reutilizables a nivel de negocio (ej. `SectionCard.tsx`).
    *   `/components/ui`: Componentes de diseño puros generados o adaptados para Chakra UI (modales, inputs, botones).
*   **Capa de Servicios**: 
    *   `/services`: Aisla las peticiones HTTP (fetch). Centraliza la comunicación con la API (ej. `members.ts`), consumiendo los tipos definidos en `@alentapp/shared`.

---

## Flujo de Vida de una Petición (Ejemplo: Crear Socio)

1. El usuario llena el formulario en `Members.tsx` y envía los datos.
2. La vista llama a `membersService.create(formData)`.
3. El servicio hace una petición POST `fetch('http://localhost:3000/api/v1/socios', ...)`
4. Fastify recibe la petición, el CORS la permite, y se la pasa a `MemberController`.
5. El controlador extrae el Body (tipado gracias a `@alentapp/shared`) y llama a `NewMemberUseCase.execute()`.
6. El caso de uso utiliza `MemberValidator` para asegurarse de que el email tenga formato y el DNI sea único.
7. El caso de uso determina la categoría en base a la fecha de nacimiento.
8. El caso de uso llama a `MemberRepository.create()`.
9. `PostgresMemberRepository` (el adaptador real) convierte las fechas e inserta la fila usando Prisma.
10. Se retorna el nuevo socio al frontend, la tabla se actualiza automáticamente.
