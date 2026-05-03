---
id: 18
estado: Propuesto
autor: Ulises Mateo Bucchino
fecha: 2026-05-01
titulo: Levantamiento de Sanciones (Baja Lógica)
---

# TDD-0018: Levantamiento de Sanciones (Baja Lógica)

## Contexto de Negocio (PRD)

### Objetivo
Permitir a los administrativos levantar una sanción antes de su vencimiento original mediante una baja lógica. No se permite el borrado físico por motivos de auditoría, sino que se rehabilita al socio adelantando la fecha de fin al momento actual.

### User Persona
- Nombre: José (Administrativo).
- Necesidad: Habilitar de forma inmediata a un socio al que se le perdonó la sanción, sin perder el historial físico en la base de datos de que alguna vez cometió una falta.

### Criterios de Aceptación
- El sistema debe pedir una confirmación explícita antes de proceder con el levantamiento de la sanción.
- El sistema debe validar que la sanción exista antes de intentar levantarla.
- El sistema debe validar que la sanción esté actualmente vigente (es decir, la fecha actual debe estar comprendida entre la fecha de inicio y la fecha de fin).
- El sistema NO debe realizar un borrado físico, sino actualizar la `fechaFin` al momento actual (`now()`).
- Si la operación es exitosa, el registro histórico se mantiene y el socio queda automáticamente rehabilitado.

## Diseño Técnico (RFC)

### Modelo de Datos

La entidad `Discipline` es la misma. La operación se centra exclusivamente en mutar el siguiente atributo:

- `fechaFin`: Se sobreescribirá con el `timestamp` del momento en que se ejecuta la acción.

### Contrato de API (@alentapp/shared)
Al tratarse de una operación de cambio de estado específico que no requiere parámetros adicionales en el cuerpo, se define un endpoint particular para esta acción.

*   Endpoint: `PATCH /api/v1/disciplines/:id/lift`
*   Request Body: Ninguno.
*   Response Body: Entidad `Discipline` actualizada.

### Componentes de Arquitectura Hexagonal

1. Puerto: `IDisciplineRepository` (Métodos `findById` y `update(id, data)`).
2. Caso de Uso: `LiftDisciplineUseCase` (Comprueba existencia vía `findById`, verifica que `now() < fechaFin`, y delega la actualización).
3. Adaptador de Salida: `PostgresDisciplineRepository` (Uso del método `update` de Prisma seteando la nueva fecha).
4. Adaptador de Entrada: `DisciplineController` (Ruta HTTP que extrae el ID y ejecuta la baja lógica).

## Casos de Borde y Errores
| Escenario                      | Resultado Esperado                                                          | Código HTTP               |
| ------------------------------ | --------------------------------------------------------------------------- | ------------------------- |
| Sanción inexistente            | "El registro de sanción no existe"                                          | 404 Not Found             |
| Sanción no vigente / pasada    | "Error: solo se permite levantar sanciones actualmente vigentes."           | 400 Bad Request           |
| Error de conexión a DB         | Mensaje: "Error interno, reintente más tarde"                               | 500 Internal Server Error |
| Levantamiento exitoso          | Retorna la entidad `Discipline` con la `fechaFin` en `now()`                | 200 OK                    |

## Plan de Implementación

1. Crear la lógica de negocio en `LiftDisciplineUseCase`, utilizando la librería de fechas para comparar la vigencia e inyectar el momento exacto (`now()`).
2. Crear el endpoint `PATCH /api/v1/disciplines/:id/lift` en el `DisciplineController`.
3. Añadir el método correspondiente al servicio Frontend (`disciplines.ts`).
4. Enlazar un botón de "Levantar Sanción" en la vista administrativa, agregando una advertencia del navegador (`window.confirm`) antes de ejecutar la llamada.
