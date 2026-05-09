---
id: 17
estado: Propuesto
autor: Ulises Mateo Bucchino
fecha: 2026-05-01
titulo: Modificación de Sanciones Existentes
---

# TDD-0017: Modificación de Sanciones Existentes

## Contexto de Negocio (PRD)

### Objetivo
Permitir a los administrativos corregir o modificar los detalles de una sanción existente (como el motivo o fechas mal cargadas), para mantener la información precisa y sin errores en el historial disciplinario del club, así como también registrar su levantamiento anticipado (perdón). A diferencia del registro inicial, acá se introduce la posibilidad de perdonar una sanción activa indicando un motivo de levantamiento, lo cual invalida su estado activo independientemente de su fecha de fin programada.

### User Persona
- Nombre: José (Administrativo).
- Necesidad: Modificar datos de una sanción rápidamente desde el sistema. Por ejemplo, corregir un error de tipeo en el motivo de la infracción o ajustar la fecha de fin si se ingresó incorrectamente durante el alta Además, si el club decide perdonar a un socio antes de tiempo, debe poder registrar el levantamiento de la sanción completando obligatoriamente el motivo del perdón.

### Criterios de Aceptación
- El sistema debe permitir actualizar uno o varios campos de la sanción (motivo, fecha de inicio, fecha de fin, tipo de suspensión, motivo de levantamiento), exceptuando el socio.
- El sistema debe re-validar que, si se modifican las fechas, la fecha de fin siga siendo estrictamente posterior a la de inicio.
- Si el campo motivoLevantamiento recibe un valor válido (no debe estar vacío), el sistema considerará la sanción como "levantada/perdonada". Para verificar si una sanción está activa en el resto del sistema, se debe priorizar la existencia del motivoLevantamiento sobre la fechaFin (es decir, si tiene motivo de levantamiento, NO está activa, aunque la fecha de fin aún no haya llegado).
- El sistema debe validar que la sanción a modificar exista previamente en la base de datos.
- El sistema debe verificar, si se intenta registrar un `motivoLevantamiento`, que la sanción no esté ya caducada (`now()` > `fechaFin`) ni haya sido levantada previamente (`motivoLevantamiento` no es NULL). No se puede levantar lo que ya no está vigente.
- Si la edición es correcta, debe retornar los nuevos datos del registro actualizados.

## Diseño Técnico (RFC)

### Modelo de Datos

Se reutiliza la entidad `Discipline` con sus propiedades originales:

- `id`: Identificador único universal (UUID).
- `motivo`: Cadena de texto detallando la infracción cometida por el socio.
- `fechaInicio`: Fecha de inicio de la sanción.
- `fechaFin`: Fecha de fin de la sanción.
- `esSuspensionTotal`: Boolean que indica si bloquea todos los servicios.
- `motivoLevantamiento`: Cadena de texto detallando el motivo de levantamiento de la infracción cometida por el socio, si es que fue perdonado.
- `memberId`: Identificador único universal (UUID) del socio afectado.

### Contrato de API (@alentapp/shared)
Se utilizará el paquete compartido para definir el cuerpo de la petición. Todos los campos son opcionales ya que se trata de una actualización parcial (PATCH a nivel de negocio, aunque el endpoint implemente PUT).

*   Endpoint: `PUT /api/v1/disciplines/:id`
*   Request Body:
```ts
{
    motivo?: string;
    fechaInicio?: string;
    fechaFin?: string;
    esSuspensionTotal?: boolean;
    motivoLevantamiento?: string | null;
}
```

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `IDisciplineRepository` (Métodos `findById` y `update(id, data)`).
2. **Caso de Uso**: `UpdateDisciplineUseCase` (Orquesta la búsqueda de la sanción, re-valida la regla de fechas cruzadas y llama al repositorio).
3. **Adaptador de Salida**: `PostgresDisciplineRepository` (Actualización usando el método `update` de Prisma).
4. **Adaptador de Entrada**: `DisciplineController` (Ruta HTTP que extrae el ID de la URL y mapea excepciones a códigos HTTP).

## Casos de Borde y Errores
| Escenario                 | Resultado Esperado                                                              | Código HTTP               |
| ------------------------- | ------------------------------------------------------------------------------- | ------------------------- |
| Sanción inexistente       | "El registro de sanción no existe"                                              | 404 Not Found             |
| Rango de fechas inválido  | "Error al modificar la sanción. El rango de fechas introducido es inválido"     | 400 Bad Request           |
| Levantamiento no válido   | "No se puede levantar una sanción que ya ha caducado o ha sido levantada"       | 400 Bad Request           |
| Error de conexión a DB    | Mensaje: "Error interno, reintente más tarde"                                   | 500 Internal Server Error |
| Modificación exitosa      | Retorna la entidad `Discipline` actualizada                                     | 200 OK                    |

## Plan de Implementación

1. Actualizar las interfaces en el paquete `@alentapp/shared` agregando `UpdateDisciplineDto`.
2. Ampliar el `IDisciplineRepository` y `PostgresDisciplineRepository` con el método `update`.
3. Implementar la lógica en `UpdateDisciplineUseCase` asegurando la validación de fechas con `date-fns`.
4. Implementar la actualización en el adaptador PostgresDisciplineRepository.
5. Crear la ruta `PUT` en el controlador y enlazarla a la aplicación.
5. En el frontend, crear un formulario de edición general (reutilizar el de creación) y un modal específico invocado por un botón "Levantar Sanción" que envíe únicamente un PUT con el motivoLevantamiento.