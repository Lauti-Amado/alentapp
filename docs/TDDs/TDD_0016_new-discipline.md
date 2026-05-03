---
id: 0016
estado: Propuesto
autor: Ulises Mateo Bucchino
fecha: 2026-05-01
titulo: Registro de Sanciones a Socios
---

# TDD-0016: Registro de Sanciones a Socios

## Contexto de Negocio (PRD)

### Objetivo
Registrar suspensiones o faltas de conducta de los socios del club. Es necesario ya que, dependiendo de si un socio tiene suspensiones vigentes o no, el mismo puede o no puede accionar en otras partes del sistema (EJ. Inscribirse a un deporte o reservar un locker).

### User Persona
- Nombre: José (Administrativo).
- Necesidad: José debe poder registrar sin problemas una sanción o falta de conducta de cualquier socio del club, ingresando: DNI del socio al que corresponde la sanción, motivo, fecha de inicio, fecha de fin e indicando si la suspensión es total o no.

### Criterios de Aceptación
- El sistema debe validar que todos los campos requeridos (socio, motivo, fecha de inicio, fecha de fin) estén presentes.
- El sistema debe validar que la fecha de fin (`end_date`) sea estrictamente posterior a la de inicio (`start_date`).
- El sistema debe verificar que el socio exista en la base de datos antes de registrar la sanción.
- El sistema debe rechazar la operación si el socio ya cuenta con una suspensión total vigente.
- Al finalizar, el sistema debe mostrar el mensaje: "Sanción registrada exitosamente".

## Diseño Técnico (RFC)

### Modelo de Datos

El modelo de datos de la entidad `Discipline` será:

- `id`: Identificador único universal (UUID).
- `motivo`: Cadena de texto detallando la infracción cometida por el socio.
- `fechaInicio`: Fecha y hora de inicio de la sanción.
- `fechaFin`: Fecha y hora de fin de la sanción.
- `esSuspensionTotal`: Boolean que indica si bloquea todos los servicios (por defecto `true`).
- `memberId`: Identificador único universal (UUID) del socio afectado, actuando como clave foránea.

### Contrato de API (@alentapp/shared)
Se utilizará el paquete compartido para definir los tipos y asegurar sincronización entre cliente y servidor.

*   Endpoint: `POST /api/v1/disciplines`
*   Request Body:
```ts
{
    motivo: string;
    fechaInicio: string;
    fechaFin: string;
    esSuspensionTotal: boolean;
    memberId: string;
}
```

### Componentes de Arquitectura Hexagonal

1. Puerto: `IDisciplineRepository` (Interface en el Dominio con métodos `create` y `findActiveTotalSuspensionByMember`).
2. Caso de Uso: `CreateDisciplineUseCase` (Lógica que verifica fechas y comprueba si el socio ya tiene una sanción total activa antes de llamar al repositorio).
3. Adaptador de Salida: `PostgresDisciplineRepository` (Implementación real en BD usando Prisma).
4. Adaptador de Entrada: `DisciplineController` (Ruta HTTP).

## Casos de Borde y Errores
| Escenario                        | Resultado Esperado                                        | Código HTTP               |
| -------------------------------- | --------------------------------------------------------- | ------------------------- |
| Datos faltantes                  | Mensaje de validación indicando campos requeridos         | 400 Bad Request           |
| Rango de fechas inválido         | "La fecha de fin debe ser posterior a la de inicio"       | 400 Bad Request           |
| Socio inexistente                | "El socio provisto no existe"                             | 404 Not Found             |
| Conflicto de suspensión          | "El socio [Nombre] ya cuenta con una suspensión total"    | 409 Conflict              |
| Error de conexión a DB           | Mensaje: "Error interno, reintente más tarde"             | 500 Internal Server Error |

## Plan de Implementación

1. Definir el esquema `Discipline` en Prisma y correr la migración.
2. Crear tipos en `@alentapp/shared` y la interfaz del puerto en el Dominio.
3. Implementar `PostgresDisciplineRepository` y la lógica de validación de fechas (con `date-fns`) en `CreateDisciplineUseCase`.
4. Crear la ruta `POST` en el controlador y enlazarla a la aplicación.
5. Crear formulario en React para consumir el endpoint desde el panel administrativo.
