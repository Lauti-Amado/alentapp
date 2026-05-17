---
id: 5
estado: Propuesto
autor: Bernardita La Gioiosa
fecha: 2026-05-02
titulo: Actualización de Pagos Existentes
---

# TDD-0005: Actualización de Pagos Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos corregir o modificar datos editables de un pago existente, registrar su cobro efectivo o cambiar su estado operativo, manteniendo la trazabilidad del socio asociado y evitando modificaciones sobre pagos cerrados operativamente o dados de baja lógicamente.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Actualizar pagos rápidamente desde el panel de administración. Por ejemplo, corregir una fecha de vencimiento cargada por error, marcar como pagado un registro cuando el socio abona en caja o cambiar el estado del pago cuando corresponda.

### Criterios de Aceptación

- El sistema debe permitir actualizar uno, varios o todos los campos editables del pago.
- El sistema debe permitir marcar un pago como `Pagado` registrando `fecha_pago`.
- El sistema debe permitir cambiar el estado de un pago activo a `Pendiente`, `Pagado` o `Cancelado`, sin que esto implique la baja lógica del registro.
- El sistema no debe permitir modificar pagos que ya se encuentren en estado `Cancelado`, salvo que exista un flujo específico de reactivación o corrección autorizado.
- El sistema no debe permitir modificar el `id` del pago.
- El sistema no debe permitir modificar el socio asociado si afecta la trazabilidad del pago.
- El sistema no debe permitir modificar pagos dados de baja lógicamente, es decir, aquellos con `deleted_at` distinto de `null`.
- Si la edición es correcta, debe retornar los nuevos datos del pago actualizado.

## Diseño Técnico (RFC)

Los campos `id`, `member_id`, `creado_el` y `deleted_at` no deben modificarse desde la actualización general para preservar la identidad y trazabilidad del registro.

La modificación del campo `estado` permite representar situaciones operativas del pago, como `Pendiente`, `Pagado` o `Cancelado`. Sin embargo, cambiar el estado a `Cancelado` no representa por sí mismo una baja lógica. La baja lógica se gestiona exclusivamente mediante el campo `deleted_at`, definido en el TDD-0006.

Los pagos con estado `Cancelado` se consideran registros cerrados operativamente, por lo que no deben modificarse desde la edición general, salvo que exista un flujo específico de reactivación o corrección autorizado.

### Contrato de API (@alentapp/shared)

Se utilizará el paquete compartido para definir el cuerpo de la petición. Todos los campos son opcionales ya que se trata de una actualización parcial (PATCH a nivel de negocio, aunque el endpoint implemente PUT).

- Endpoint: `PUT /api/v1/pagos/:id`
- Request Body (UpdatePaymentRequest):

```ts
{
    monto?: number;
    mes?: number;
    anio?: number;
    fecha_vencimiento?: string; // ISO Date String (YYYY-MM-DD)
    fecha_pago?: string; // ISO Date String (YYYY-MM-DD)
    estado?: 'Pendiente' | 'Pagado' | 'Cancelado';
}
```

Los campos `id`, `member_id`, `creado_el` y `deleted_at` no forman parte del request de actualización porque no deben ser modificados desde este flujo.

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `PaymentRepository` (Método `update(id, data)` y `findById(id)`).
2. **Servicio de Dominio**: `PaymentValidator` (Encargado de validar monto, periodo, fechas, transiciones de estado y campos no editables).
3. **Caso de Uso**: `UpdatePaymentUseCase` (Comprueba existencia, bloquea pagos con estado `Cancelado`, bloquea pagos dados de baja lógicamente y orquesta la actualización).
4. **Adaptador de Salida**: `PostgresPaymentRepository` (Actualización usando el método `update` de Prisma).
5. **Adaptador de Entrada**: `PaymentController` (Ruta HTTP que extrae el `id` de la URL y mapea excepciones a códigos HTTP).

## Casos de Borde y Errores

| Escenario                           | Resultado Esperado                                                           | Código HTTP actual        |
| ----------------------------------- | ---------------------------------------------------------------------------- | ------------------------- |
| Pago inexistente                    | Mensaje: "El pago no existe"                                                 | 400 Bad Request           |
| Intento de modificar `id`           | Mensaje: "No se puede modificar el id del pago"                              | 400 Bad Request           |
| Intento de modificar socio asociado | Mensaje: "No se puede modificar el socio asociado al pago"                   | 400 Bad Request           |
| Intento de modificar `deleted_at`   | Mensaje: "No se puede modificar el campo deleted_at desde la edición general" | 400 Bad Request           |
| Pago con estado `Cancelado`         | Mensaje: "No se puede modificar un pago cancelado"                           | 409 Conflict              |
| Pago dado de baja lógicamente       | Mensaje: "No se puede modificar un pago dado de baja"                        | 409 Conflict              |
| Monto menor o igual a cero          | Mensaje: "El monto debe ser mayor a cero"                                     | 400 Bad Request           |
| Marcar como pagado sin fecha de pago | Mensaje: "La fecha de pago es obligatoria"                                  | 400 Bad Request           |
| Estado inválido                     | Mensaje: "El estado del pago es inválido"                                     | 400 Bad Request           |
| Error de conexión a DB              | Mensaje: "Error interno, reintente más tarde"                                 | 500 Internal Server Error |

## Plan de Implementación

1. Actualizar las interfaces en el paquete `@alentapp/shared` (`UpdatePaymentRequest`).
2. Ampliar el `PaymentRepository` con los métodos `findById` y `update`.
3. Implementar la lógica en `UpdatePaymentUseCase` utilizando el `PaymentValidator` centralizado.
4. Bloquear explícitamente cambios sobre campos no modificables como `id`, `member_id`, `creado_el` y `deleted_at`.
5. Permitir que el campo `estado` pueda modificarse a `Pendiente`, `Pagado` o `Cancelado`, aclarando que `Cancelado` representa una modificación de estado y no la baja lógica del registro.
6. Rechazar actualizaciones sobre pagos que ya se encuentren en estado `Cancelado`, salvo que exista un flujo específico de reactivación o corrección autorizado.
7. Rechazar actualizaciones sobre pagos dados de baja lógicamente, es decir, aquellos con `deleted_at` distinto de `null`.
8. Crear la ruta `PUT /api/v1/pagos/:id` en el controlador y enlazarla a la app de Fastify.
9. Consumir el endpoint desde el servicio de Frontend y reutilizar el modal de pagos para permitir la edición.