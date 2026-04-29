---
id: 0003
estado: Implementado
autor: Rodrigo Jacznik
fecha: 2026-04-28
titulo: Eliminación de Socios Existentes
---

# TDD-0003: Eliminación de Socios Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos dar de baja permanentemente a un socio del sistema, eliminando su registro de la base de datos para mantener la lista actualizada y libre de registros duplicados o cancelados erróneamente.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Borrar un socio que fue cargado por error o un usuario de prueba, de forma rápida desde la misma tabla principal. Necesita una advertencia antes de borrar para no cometer equivocaciones irreparables.

### Criterios de Aceptación

- El sistema debe pedir una confirmación explícita (advertencia visual) antes de proceder con el borrado.
- El sistema debe validar que el socio exista antes de intentar borrarlo.
- El sistema debe realizar un borrado físico de la base de datos (hard delete).
- Si el borrado es exitoso, la tabla debe actualizarse automáticamente.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Al tratarse de una operación destructiva que solo requiere conocer el identificador, no se envía cuerpo en la petición HTTP.

- Endpoint: `DELETE /api/v1/socios/:id`
- Request Body: `None`
- Response: `204 No Content` en caso de éxito.

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `MemberRepository` (Método `delete(id)`).
2. **Caso de Uso**: `DeleteMemberUseCase` (Comprueba existencia previa vía `findById` y delega la eliminación).
3. **Adaptador de Salida**: `PostgresMemberRepository` (Eliminación usando el método `delete` de Prisma).
4. **Adaptador de Entrada**: `MemberController` (Ruta HTTP que extrae el `id` y devuelve un status 204).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP actual        |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Socio inexistente          | Mensaje: "El miembro no existe"               | 400 Bad Request           |
| Error de conexión a DB     | Mensaje: error del motor de base de datos     | 400 Bad Request           |
| Eliminación exitosa        | Respuesta vacía                               | 204 No Content            |

## Plan de Implementación

1. Ampliar el `MemberRepository` y `PostgresMemberRepository` con el método `delete`.
2. Crear la lógica de negocio en `DeleteMemberUseCase`.
3. Crear el endpoint `DELETE /api/v1/socios/:id` en el `MemberController` y registrarlo en `app.ts`.
4. Añadir el método `delete` al servicio Frontend (`members.ts`).
5. Enlazar el botón de eliminación en `MembersView.tsx` agregando la confirmación del navegador (`window.confirm`) antes de hacer la llamada.
