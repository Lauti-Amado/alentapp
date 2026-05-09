---
id: 12
estado: Propuesto
autor: Lautaro Amado
fecha: 2026-05-02
titulo: Eliminación de Lockers Existentes
---

# TDD-0012: Eliminación de Lockers Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administradores dar de baja permanentemente un locker del sistema, eliminando su registro de la base de datos cuando la unidad física es retirada de las instalaciones o fue cargada por error, manteniendo el registro digital sincronizado con la realidad.

### User Persona

* Nombre: Carlos (Administrativo).
* Necesidad: Eliminar lockers incorrectos o dados de baja sin afectar el resto del sistema. Necesita de una advertencia antes de borrar para no cometer errores irreparables con el inventario.

### Criterios de Aceptación

* El sistema debe solicitar confirmación explícita (advertencia visual) antes de proceder con el borrado.
* El sistema debe validar que el locker exista antes de intentar borrarlo.
* El sistema debe realizar un borrado físico de la base de datos (hard delete).
* Si la eliminación es exitosa, la operación debe reflejarse inmediatamente en la lista.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Al tratarse de una operación destructiva que solo requiere conocer el identificador, no se envía cuerpo en la petición HTTP.

* Endpoint: `DELETE /api/v1/lockers/:id`
* Request Body: `None`
* Response: `204 No Content` en caso de éxito.

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `LockerRepository` (Método `delete(id)`).
2. **Caso de Uso**: `DeleteLocker` (Comprueba la existencia del locker vía `findById`, verifica que no esté "Ocupado" y delega la eliminación).
3. **Adaptador de Salida**: `PostgresLockerRepository` (Eliminación usando el método `delete` de Prisma).
4. **Adaptador de Entrada**: `LockerController` (Ruta HTTP que extrae el `id` y devuelve un status 204).

## Casos de Borde y Errores

| Escenario           | Resultado Esperado                       | Código HTTP               |
| ------------------- | ---------------------------------------- | ------------------------- |
| Locker inexistente  | Mensaje: "El locker solicitado no existe"                    | 404 Not Found           |
| Error de DB         | Mensaje: "Error interno, reintente más tarde"   | 500 Internal Server Error |
| Eliminación exitosa | Respuesta vacía                            | 204 No Content            |

## Plan de Implementación

1. Ampliar el `LockerRepository` y `PostgresLockerRepository` con el método `delete`.
2. Crear la lógica de negocio en `DeleteLocker`.
3. Crear el endpoint `DELETE /api/v1/lockers/:id` en el `LockerController` y registrarlo en `app.ts`.
4. Añadir el método `delete` al servicio Frontend (`lockers.ts`).
5. Enlazar el botón de eliminación en `LockersView.tsx` agregando la confirmación del navegador (`window.confirm`) antes de hacer la llamada.
