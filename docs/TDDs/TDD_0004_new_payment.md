---
id: 4
estado: Propuesto
autor: Bernardita La Gioiosa
fecha: 2026-05-02
titulo: Registro de Nuevos Pagos
---

# TDD-0004: Registro de Nuevos Pagos

## Contexto de Negocio (PRD)

### Objetivo

Permitir que un administrativo registre un nuevo pago asociado a un socio existente, dejando constancia del importe, periodo abonado y fecha de vencimiento para poder administrar el estado de cuenta con trazabilidad desde el primer momento.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Cargar pagos de socios de forma rápida y confiable mientras atiende consultas de caja. Necesita evitar pagos asociados a socios inexistentes, montos incorrectos o periodos mal cargados.

### Criterios de Aceptación

- El sistema debe validar que el pago se asocie a un socio existente.
- El sistema debe validar que el monto sea mayor a cero.
- El sistema debe validar que el mes y el año correspondan a un periodo válido.
- El sistema debe validar que la fecha de vencimiento sea una fecha válida.
- El pago debe quedar guardado con estado `Pendiente` por defecto y sin fecha de pago.
- El pago debe crearse como un registro activo, con `deleted_at` en `null`.
- Si el registro es correcto, debe retornar los datos del pago creado.

## Diseño Técnico (RFC)

### Modelo de Datos

Se definirá la entidad `Payment` con las siguientes propiedades y restricciones:

- `id`: Identificador único universal (UUID).
- `member_id`: Identificador del socio asociado, referencia obligatoria a `Member`.
- `monto`: Número decimal, mayor a cero.
- `mes`: Número entero entre 1 y 12.
- `anio`: Número entero correspondiente al año del periodo abonado.
- `fecha_vencimiento`: Fecha de vencimiento del pago.
- `fecha_pago`: Fecha efectiva de pago, nula al momento del alta.
- `estado`: Enumeración (`Pendiente`, `Pagado`, `Cancelado`) con valor por defecto `Pendiente`.
- `creado_el`: Fecha de creación autogenerada.
- `deleted_at`: Fecha de baja lógica del pago, nula al momento del alta.

El estado `Cancelado` representa una posible situación operativa del pago, equivalente al status `Canceled` indicado en la consigna. Sin embargo, no representa por sí mismo la baja lógica del registro. La baja lógica se representará mediante el campo `deleted_at`.

### Contrato de API (@alentapp/shared)

Definiremos los tipos en el paquete compartido para asegurar sincronización. Como la implementación actual usa recursos en español para la API (`/socios`) y nombres internos en inglés (`Member`), el recurso HTTP propuesto para pagos será `/pagos` y los tipos internos usarán `Payment`.

- Endpoint: `POST /api/v1/pagos`
- Request Body (CreatePaymentRequest):

```ts
{
    member_id: string;
    monto: number;
    mes: number;
    anio: number;
    fecha_vencimiento: string; // ISO Date String (YYYY-MM-DD)
}
```

Los campos `estado`, `fecha_pago`, `creado_el` y `deleted_at` no se envían en el request de alta porque son definidos por el sistema:

- `estado`: se inicializa en `Pendiente`.
- `fecha_pago`: se inicializa en `null`.
- `creado_el`: se genera automáticamente.
- `deleted_at`: se inicializa en `null`.

### Componentes de Arquitectura Hexagonal

1. Puerto: PaymentRepository (Interface en el Dominio).
2. Servicio de Dominio: PaymentValidator (Encargado de validar monto, periodo, fecha de vencimiento y socio existente).
3. Caso de Uso: CreatePaymentUseCase (Orquesta la validación, define el estado inicial `Pendiente`, deja `fecha_pago` en `null` y crea el registro activo con `deleted_at` en `null`).
4. Adaptador de Salida: PostgresPaymentRepository (Implementación real en BD usando Prisma).
5. Adaptador de Entrada: PaymentController (Ruta HTTP que recibe el body y mapea excepciones a códigos HTTP).

## Casos de Borde y Errores

| Escenario                     | Resultado Esperado                             | Código HTTP               |
| ----------------------------- | ---------------------------------------------- | ------------------------- |
| Socio inexistente             | Mensaje: "El miembro no existe"               | 400 Bad Request           |
| Monto menor o igual a cero    | Mensaje: "El monto debe ser mayor a cero"     | 400 Bad Request           |
| Mes fuera de rango            | Mensaje: "El mes debe estar entre 1 y 12"     | 400 Bad Request           |
| Año inválido                  | Mensaje: "El año del pago es inválido"        | 400 Bad Request           |
| Fecha de vencimiento inválida | Mensaje: "Fecha de vencimiento inválida"      | 400 Bad Request           |
| Error de conexión a DB        | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |

## Plan de Implementación

1. Definir `PaymentStatus`, `PaymentDTO` y `CreatePaymentRequest` en el paquete `@alentapp/shared`, usando valores de estado `Pendiente`, `Pagado` y `Cancelado`.
2. Definir el modelo `Payment` en Prisma con relación obligatoria a `Member`, agregando el campo nullable `deleted_at` con valor por defecto `null`, y correr migración.
3. Crear el puerto `PaymentRepository` y el servicio de dominio `PaymentValidator`.
4. Implementar `CreatePaymentUseCase` aplicando las validaciones de negocio, el estado inicial `Pendiente`, `fecha_pago` en `null` y `deleted_at` en `null`.
5. Crear `PostgresPaymentRepository` y el endpoint `POST /api/v1/pagos` en `PaymentController`.
6. Consumir el endpoint desde el servicio de Frontend (`payments.ts`) y crear el formulario de carga de pagos.