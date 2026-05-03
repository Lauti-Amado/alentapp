---
id: 11
estado: Pendiente
autor: Lautaro Amado
fecha: 2026-05-02
titulo: Actualización de Lockers Existentes
---

# TDD-0011: Actualización de Lockers Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administradores corregir o modificar la información de un locker existente en el sistema, como su estado, asignación o ubicación, para reflejar cambios operativos y físicos del club en tiempo real.

### User Persona

* Nombre: Carlos (Administrativo).
* Necesidad: Modificar datos de los lockers rápidamente desde el panel de administración. Por ejemplo, Marcar un locker como "En Mantenimiento" si se rompió la cerradura, o cambiarlo a "Ocupado" y asignarle un socio cuando se alquila.

### Criterios de Aceptación

* El sistema debe permitir actualizar uno, varios o todos los campos del locker.
* El sistema debe validar que el locker a editar exista.
* El sistema debe validar que, si se cambia el número, este no pertenezca ya a otro locker .
* El sistema debe validar que, si se asigna un locker a un socio, la unidad se encuentre previamente en estado "Disponible".
* El sistema debe validar que si un locker tiene un socio asignado (`member_id` distinto de null), el estado del locker no sea "Disponible" o "Mantenimiento".
* Si la edición es exitosa, el sistema debe retornar los nuevos datos del locker actualizados.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Se utilizará el paquete compartido para definir el cuerpo de la petición. Todos los campos son opcionales (`?`) ya que se trata de una actualización parcial (PATCH a nivel de negocio, aunque el endpoint implemente PUT).

* Endpoint: `PUT /api/v1/lockers/:id`
* Request Body (UpdateLockerRequest):

```ts
{
    numero?: number;
    estado?: 'Disponible' | 'Ocupado' | 'Mantenimiento';
    ubicacion?: string;
    member_id?: string | null;
}
```

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `LockerRepository` (Interfaz que define el método `update(id, data)`).
2. Servicio de Dominio: LockerValidator (Encargado de centralizar y reutilizar las validaciones de unicidad del número de locker y la consistencia de los estados de asignación).
3. **Caso de Uso**: `UpdateLocker` (Orquesta la validación y llama al repositorio).
4. **Adaptador de Salida**: `PostgresLockerRepository` (Actualización usando el método `update` de Prisma).
5. **Adaptador de Entrada**: `LockerController` (Ruta HTTP que extrae el `id` de la URL y mapea excepciones a códigos HTTP).

## Casos de Borde y Errores

| Escenario          | Resultado Esperado                   | Código HTTP               |
| ------------------ | ------------------------------------ | ------------------------- |
| Locker inexistente | Mensaje: "El locker solicitado no existe"                | 404 Not Found           |
| Número duplicado   | Mensaje: "Ya existe un locker con ese número" | 409 Conflict              |
| Locker no disponible para asignación   | Mensaje: "Solo se pueden asignar lockers en estado Disponible"   | 400 Bad Request           |
| Inconsistencia de estado al editar  | Mensaje: "Un locker con socio asignado debe estar en estado Ocupado"         | 400 Bad Request           |
| Datos inválidos   | Mensaje: "Los campos enviados tienen un formato inválido"                    | 400 Bad Request           |
| Error de DB        | Mensaje: "Error interno, reintente más tarde"                      | 500 Internal Server Error |

## Plan de Implementación

1. Actualizar las interfaces en el paquete `@alentapp/shared` (`UpdateLockerRequest`) con validaciones Zod (haciendo los campos `.optional()`).
2. Ampliar el `LockerRepository` con el método `update`.
3. Implementar la lógica `UpdateLocker` utilizando `LockerValidator` centralizado.
4. Crear la ruta `PUT` en el controlador y enlazarla a la app de Fastify.
5. Consumir el endpoint desde el servicio de Frontend, implementando un buscador de socios (por DNI o nombre) para obtener el `member_id` para la asignación, y reutilizar el modal de creación para permitir la edición.
