---
id: 18
estado: Propuesto
autor: Ulises Mateo Bucchino
fecha: 2026-05-06
titulo: Eliminación de Sanciones
---

# TDD-0018: Eliminación de Sanciones

## Contexto de Negocio (PRD)

### Objetivo
Permitir la eliminación física y permanente (Hard Delete) de un registro de sanción. Esta funcionalidad es estrictamente para corregir errores humanos graves en la carga de datos (EJ. Sancionar al socio equivocado) y no debe usarse como mecanismo para "perdonar" (lo cual se gestiona mediante el levantamiento en el TDD-0017).

### User Persona
- Nombre: José (Administrativo).
- Necesidad: Borrar por completo una sanción del sistema cuando ésta fue cargada por error, para que no quede rastro en el historial del socio. El sistema debe exigirle confirmación para evitar borrados accidentales.

### Criterios de Aceptación
- El sistema debe buscar la sanción por su identificador único.
- El sistema debe verificar que la sanción exista antes de intentar eliminarla; de lo contrario, devolverá un error.
- La eliminación debe ser un Hard Delete, es decir, el registro debe desaparecer físicamente de la base de datos subyacente.
- El proceso asume que el cliente (frontend) ya solicitó una confirmación explícita al usuario antes de disparar la petición.
- Al finalizar, el sistema devolverá un mensaje que confirma la eliminación exitosa.

## Diseño Técnico (RFC)

### Modelo de Datos

No aplican cambios al modelo de datos. Se utiliza la entidad `Discipline` existente.

### Contrato de API (@alentapp/shared)
El endpoint utilizará el método DELETE pasando el identificador por parámetro en la URL. No requiere cuerpo en la petición.

*   Endpoint: `DELETE /api/v1/disciplines/:id`
*   Request Body: `None`
*   Response: `204 No Content` (En caso de éxito).

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `IDisciplineRepository` (Método `delete(id)`).
2. **Caso de Uso**: `DeleteDisciplineUseCase` (Comprueba la existencia de la sanción vía `findById` y delega la eliminación).
3. **Adaptador de Salida**: `PostgresDisciplineRepository` (Eliminación usando el método `delete` de Prisma).
4. **Adaptador de Entrada**: `DisciplineController` (Ruta HTTP que extrae el `id` y devuelve un status 204).

## Casos de Borde y Errores
| Escenario                 | Resultado Esperado                                                                          | Código HTTP               |
| ------------------------- | ------------------------------------------------------------------------------------------- | ------------------------- |
| Sanción inexistente       | "No se encontró la sanción especificada para eliminar"                                      | 404 Not Found             |
| ID mal formado            | Mensaje indicando que el identificador no tiene formato válido (UUID)                       | 400 Bad Request           |
| Error de conexión a DB    | Mensaje: "Error interno al intentar eliminar el registro, reintente más tarde"              | 500 Internal Server Error |
| Eliminación exitosa       | Sin contenido en el cuerpo                                                                  | 204 No Content            |

## Plan de Implementación

1. Ampliar el `IDisciplineRepository` y `PostgresDisciplineRepository` con el método `delete`.
2. Crear la lógica de negocio en `DeleteDisciplineUseCase`.
3. Crear el endpoint `DELETE /api/v1/disciplines/:id` en el `DisciplineController` y registrarlo en `app.ts`.
4. Añadir el método `delete` al servicio Frontend (`disciplines.ts`).
5. Enlazar el botón de eliminación "Eliminar Sanción" en `DisciplinesView.tsx` agregando la confirmación del navegador (`window.confirm`) antes de hacer la llamada.