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

Permitir a los administrativos corregir o modificar datos editables de un pago existente y registrar su cobro efectivo, manteniendo la trazabilidad del socio asociado y evitando modificaciones sobre pagos que ya fueron cancelados.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Actualizar pagos rápidamente desde el panel de administración. Por ejemplo, corregir una fecha de vencimiento cargada por error o marcar como pagado un registro cuando el socio abona en caja.

### Criterios de Aceptación

- El sistema debe permitir actualizar uno, varios o todos los campos editables del pago.
- El sistema debe permitir marcar un pago como `Pagado` registrando `payment_date`.
- El sistema no debe permitir modificar el `id` del pago.
- El sistema no debe permitir modificar el socio asociado si afecta la trazabilidad del pago.
- El sistema no debe permitir modificar pagos con estado `Cancelado`.
- El sistema no debe permitir cancelar pagos desde la modificación general; la cancelación debe realizarse mediante el flujo específico de baja lógica.
- Si la edición es correcta, debe retornar los nuevos datos del pago actualizado.

## Diseño Técnico (RFC)

Los campos `id`, `socioId` y `creadoEl` no deben modificarse para preservar la identidad y trazabilidad del registro. Y el estado `Cancelado` representa la baja lógica del pago, por lo que no se debe permitir cambiar el estado a `Cancelado` desde la modificación general.

### Contrato de API (@alentapp/shared)

Se utilizará el paquete compartido para definir el cuerpo de la petición. Todos los campos son opcionales ya que se trata de una actualización parcial (PATCH a nivel de negocio, aunque el endpoint implemente PUT).

- Endpoint: `PUT /api/v1/pagos/:id`
- Request Body (UpdatePaymentRequest):

```ts
{
    amount?: number;
    month?: number;
    year?: number;
    due_date?: string; // ISO Date String (YYYY-MM-DD)
    payment_date?: string; // ISO Date String (YYYY-MM-DD)
    status?: 'Pendiente' | 'Pagado';
}
```

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `PaymentRepository` (Método `update(id, data)` y `findById(id)`).
2. **Servicio de Dominio**: `PaymentValidator` (Encargado de validar monto, periodo, fechas, transiciones de estado y campos no editables).
3. **Caso de Uso**: `UpdatePaymentUseCase` (Comprueba existencia, bloquea pagos cancelados y orquesta la actualización).
4. **Adaptador de Salida**: `PostgresPaymentRepository` (Actualización usando el método `update` de Prisma).
5. **Adaptador de Entrada**: `PaymentController` (Ruta HTTP que extrae el `id` de la URL y mapea excepciones a códigos HTTP).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP actual        |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Pago inexistente           | Mensaje: "El pago no existe"                  | 400 Bad Request           |
| Intento de modificar `id`   | Mensaje: "No se puede modificar el id del pago" | 400 Bad Request        |
| Intento de modificar socio asociado | Mensaje: "No se puede modificar el socio asociado al pago" | 400 Bad Request |
| Pago cancelado             | Mensaje: "No se puede modificar un pago cancelado" | 409 Conflict          |
| Intento de cancelar desde edición | Mensaje: "La cancelación debe realizarse desde el flujo de baja lógica" | 400 Bad Request |
| Monto menor o igual a cero  | Mensaje: "El monto debe ser mayor a cero"     | 400 Bad Request           |
| Marcar como pagado sin fecha de pago | Mensaje: "La fecha de pago es obligatoria" | 400 Bad Request     |
| Error de conexión a DB      | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |

## Plan de Implementación

1. Actualizar las interfaces en el paquete `@alentapp/shared` (`UpdatePaymentRequest`).
2. Ampliar el `PaymentRepository` con los métodos `findById` y `update`.
3. Implementar la lógica en `UpdatePaymentUseCase` utilizando el `PaymentValidator` centralizado.
4. Bloquear explícitamente cambios sobre campos no modificables como `id`, `member_id` y `created_at`, y rechazar actualizaciones sobre pagos con estado `Cancelado`.
5. Crear la ruta `PUT /api/v1/pagos/:id` en el controlador y enlazarla a la app de Fastify.
6. Consumir el endpoint desde el servicio de Frontend y reutilizar el modal de pagos para permitir la edición.
