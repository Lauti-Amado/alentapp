---
id: 6
estado: Propuesto
autor: Bernardita La Gioiosa
fecha: 2026-05-02
titulo: Cancelación de Pagos Existentes
---

# TDD-0006: Cancelación de Pagos Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos cancelar un pago cargado por error, manteniendo el registro en la base de datos por trazabilidad contable. A diferencia de los socios, los pagos no se eliminan: solo pueden pasar a estado `Cancelado`.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Cancelar un pago incorrecto sin perder el historial de caja. Necesita que el sistema conserve el registro para auditoría y que la operación quede representada claramente como una cancelación.

### Criterios de Aceptación

- El sistema debe pedir una confirmación explícita antes de proceder con la cancelación.
- El sistema debe validar que el pago exista antes de intentar cancelarlo.
- El sistema no debe eliminar registros de pagos de la base de datos.
- El sistema debe actualizar el estado del pago a `Cancelado`.
- Aunque el endpoint HTTP sea `DELETE`, internamente debe ejecutarse como una actualización de estado.
- El registro debe permanecer en la base de datos luego de la operación.
- Si el pago ya estaba cancelado, debe retornar un error claro.

## Diseño Técnico (RFC)

La cancelación de un pago no debe eliminar el registro de la base de datos. La operación debe actualizar únicamente el estado del pago a `Cancelado`, preservando la trazabilidad contable.

No se debe usar `prisma.payment.delete`. La operación debe persistirse con una actualización de `status` a `Cancelado`.

### Contrato de API (@alentapp/shared)

Al tratarse de una operación de baja lógica que solo requiere conocer el identificador, no se envía cuerpo en la petición HTTP.

- Endpoint: `DELETE /api/v1/pagos/:id`
- Request Body: `None`
- Response: `204 No Content` en caso de éxito.

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `PaymentRepository` (Método `cancel(id)` o `update(id, { status: 'Cancelado' })`; no debe exponer eliminación de registros para pagos).
2. **Caso de Uso**: `CancelPaymentUseCase` (Comprueba existencia previa vía `findById`, valida que no esté cancelado y delega la actualización de estado).
3. **Adaptador de Salida**: `PostgresPaymentRepository` (Cancelación usando `update` de Prisma, nunca `delete`).
4. **Adaptador de Entrada**: `PaymentController` (Ruta HTTP `DELETE` que extrae el `id` y devuelve status 204 si la cancelación fue exitosa).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP actual        |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Pago inexistente           | Mensaje: "El pago no existe"                  | 400 Bad Request           |
| Pago ya cancelado          | Mensaje: "El pago ya se encuentra cancelado"  | 409 Conflict              |
| Cancelación exitosa        | Respuesta vacía y registro con status `Cancelado` | 204 No Content         |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |

## Plan de Implementación

1. Ampliar el `PaymentRepository` y `PostgresPaymentRepository` con un método de cancelación lógica (`cancel`) o reutilizar `update` con `status: 'Cancelado'`.
2. Crear la lógica de negocio en `CancelPaymentUseCase` validando existencia y estado actual del pago.
3. Crear el endpoint `DELETE /api/v1/pagos/:id` en el `PaymentController` y registrarlo en `app.ts`.
4. Asegurar que la implementación no use `delete` de Prisma para pagos.
5. Añadir el método `cancel` o `delete` lógico al servicio Frontend (`payments.ts`), dejando claro que conserva el registro.
6. Enlazar el botón de cancelación en la vista de pagos agregando confirmación antes de hacer la llamada.
