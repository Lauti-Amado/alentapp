---
id: 00010
estado: Pendiente
autor: Lautaro Amado
fecha: 2026-05-02
titulo: Registro de Nuevos Lockers
---

# TDD-0010: Registro de Nuevos Lockers

## Contexto de Negocio (PRD)

### Objetivo

Sustituir el registro manual de la infraestructura física del club, permitiendo que un administrador dé de alta nuevos lockers de forma digital, asegurando la integridad de los datos.

### User Persona

* Nombre: Carlos (Administrativo)
* Necesidad: Registrar rápidamente las nuevas unidades físicas que se incorporan al club (por ejemplo, al comprar un bloque nuevo de 20 lockers). No puede permitirse errores en las numeraciones o registros duplicados que afecten la disponibilidad real.

### Criterios de Aceptación

* El sistema debe permitir registrar un locker con un número identificador único.
* El sistema debe validar que el número de locker no esté ya registrado.
* El locker debe crearse con estado "Disponible" por defecto y sin ningún socio asignado (`member_id` en nulo).
* Al finalizar, el sistema debe mostrar un mensaje de éxito.

## Diseño Técnico (RFC)

### Modelo de Datos

Se definirá la entidad `Locker` con las siguientes propiedades y restricciones:

* `id`: Identificador único universal (UUID).
* `numero`: Número entero, único e indexado.
* `estado`: Enumeración (`Disponible`, `Ocupado`, `Mantenimiento`) con valor por defecto `Disponible`.
* `ubicacion`: Cadena de texto.
* `member_id`: UUID (Clave foránea, nullable).

### Contrato de API (@alentapp/shared)

Definiremos los tipos en el paquete compartido para asegurar sincronización:

* Endpoint: `POST /api/v1/lockers`
* Request Body (CreateLockerRequest):

```ts
{
    numero: number;
    ubicacion: string;
}
```

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `LockerRepository` (Interface en el Dominio).
2. **Caso de Uso**: `CreateLocker` (Lógica de aplicación que verifica la no existencia del número de casillero antes de persistir la entidad).
3. **Adaptador de Salida**: `PostgresLockerRepository`
4. **Adaptador de Entrada**: `LockerController` (Ruta HTTP).

## Casos de Borde y Errores

| Escenario            | Resultado Esperado                   | Código HTTP               |
| -------------------- | ------------------------------------ | ------------------------- |
| Número ya registrado | Mensaje: "Ya existe un locker con ese número" | 409 Conflict              |
| Número faltante o inválido      | Mensaje: "El número del locker es obligatorio y debe ser válido"          | 400 Bad Request           |
| Error de conexión DB | Mensaje: "Error interno", reintente más tarde                      | 500 Internal Server Error |

## Plan de Implementación

1. Definir el esquema de la entidad `Locker` en el archivo schema.prisma y correr la migración.
2. Crear tipos con validaciones estrictas ZOD en `@alentapp/shared`.
3. Implementar la interfaz `LockerRepository`.
4. Implementar `CreateLocker`.
5. Crear endpoint en `LockerController`.
