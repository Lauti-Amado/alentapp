---
id: 6
estado: Propuesto
autor: Bernardita La Gioiosa
fecha: 2026-05-02
titulo: Baja Lógica de Pagos Existentes
---

# TDD-0006: Baja Lógica de Pagos Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos dar de baja lógicamente un pago cargado por error, manteniendo el registro en la base de datos por trazabilidad contable. A diferencia de una eliminación física, la baja lógica no borra el pago, sino que registra la fecha de baja en el campo `deleted_at`, evitando que el pago siga apareciendo en los listados y consultas normales del usuario.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Dar de baja un pago incorrecto sin perder el historial de caja. Necesita que el sistema conserve el registro para auditoría, pero que ese pago deje de aparecer en el listado habitual de pagos activos o registrados.

### Criterios de Aceptación

- El sistema debe pedir una confirmación explícita antes de proceder con la baja lógica.
- El sistema debe validar que el pago exista antes de intentar darlo de baja.
- El sistema no debe eliminar registros de pagos de la base de datos.
- El sistema debe registrar la fecha y hora de baja lógica en el campo `deleted_at`.
- Aunque el endpoint HTTP sea `DELETE`, internamente debe ejecutarse como una actualización del campo `deleted_at`.
- El registro debe permanecer en la base de datos luego de la operación.
- Los pagos con `deleted_at` distinto de `null` no deben mostrarse en los listados o consultas normales de pagos activos.
- Si el pago ya fue dado de baja lógicamente, debe retornar un error claro.

## Diseño Técnico (RFC)

La baja lógica de un pago no debe eliminar el registro de la base de datos. La operación debe actualizar únicamente el campo `deleted_at` con la fecha y hora actual, preservando la trazabilidad contable.

No se debe usar `prisma.payment.delete`. La operación debe persistirse con una actualización de `deleted_at` a `now()`.

A partir de esta baja lógica, las consultas y listados normales de pagos deben excluir los registros cuyo `deleted_at` sea distinto de `null`.

### Contrato de API (@alentapp/shared)

Al tratarse de una operación de baja lógica que solo requiere conocer el identificador, no se envía cuerpo en la petición HTTP.

- Endpoint: `DELETE /api/v1/pagos/:id`
- Request Body: `None`
- Response: `204 No Content` en caso de éxito.

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `PaymentRepository` (Método `softDelete(id)` o `update(id, { deleted_at: now() })`; no debe exponer eliminación física de registros para pagos).
2. **Caso de Uso**: `SoftDeletePaymentUseCase` (Comprueba existencia previa vía `findById`, valida que `deleted_at` sea `null` y delega la actualización de baja lógica).
3. **Adaptador de Salida**: `PostgresPaymentRepository` (Baja lógica usando `update` de Prisma sobre el campo `deleted_at`, nunca `delete`).
4. **Adaptador de Entrada**: `PaymentController` (Ruta HTTP `DELETE` que extrae el `id` y devuelve status 204 si la baja lógica fue exitosa).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                                      | Código HTTP actual        |
| -------------------------- | ------------------------------------------------------- | ------------------------- |
| Pago inexistente           | Mensaje: "El pago no existe"                           | 400 Bad Request           |
| Pago ya dado de baja       | Mensaje: "El pago ya fue dado de baja"                 | 409 Conflict              |
| Baja lógica exitosa        | Respuesta vacía y registro con `deleted_at` informado   | 204 No Content            |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde"          | 500 Internal Server Error |

## Plan de Implementación

1. Agregar el campo `deleted_at` al modelo `Payment` en Prisma, nullable y con valor por defecto `null`.
2. Ampliar el `PaymentRepository` y `PostgresPaymentRepository` con un método de baja lógica (`softDelete`) o reutilizar `update` con `deleted_at: now()`.
3. Crear la lógica de negocio en `SoftDeletePaymentUseCase`, validando existencia y que el pago no haya sido dado de baja previamente.
4. Crear el endpoint `DELETE /api/v1/pagos/:id` en el `PaymentController` y registrarlo en `app.ts`.
5. Asegurar que la implementación no use `delete` de Prisma para pagos.
6. Ajustar las consultas y listados de pagos para excluir registros con `deleted_at` distinto de `null`.
7. Añadir el método `softDelete` o `delete` lógico al servicio Frontend (`payments.ts`), dejando claro que conserva el registro en la base de datos.
8. Enlazar el botón de baja en la vista de pagos agregando confirmación antes de hacer la llamada.