---
id: 19
estado: Propuesto
autor: Ulises Mateo Bucchino
fecha: 2026-05-24
titulo: DisciplineValidator — Servicio de Validación de Sanciones
---

# TDD-0019: DisciplineValidator — Servicio de Validación de Sanciones

## Contexto de Negocio (PRD)

### Objetivo
Centralizar en un único servicio de dominio (`DisciplineValidator`) todas las reglas de negocio vinculadas a las sanciones del club que hoy se encuentran dispersas en `CreateDisciplineUseCase` y `UpdateDisciplineUseCase`. Al aislar cada regla en un método propio, el código de los casos de uso se vuelve más declarativo, las reglas quedan documentadas en un solo lugar y cada una puede ser testeada de forma independiente sin necesidad de montar un caso de uso completo.

### User Persona
- **Nombre**: Ulises (Desarrollador del equipo).
- **Necesidad**: Escribir tests unitarios precisos para cada regla de negocio de las sanciones sin tener que instanciar ni mockear toda la cadena de dependencias de un caso de uso. Necesita que cada validación esté encapsulada en un método con una única responsabilidad y un mensaje de error determinista.

### Criterios de Aceptación
- El validador debe exponer un método que rechace un rango de fechas donde `fechaFin` no sea estrictamente posterior a `fechaInicio` al crear una sanción.
- El validador debe exponer un método que verifique la existencia del socio antes de crear la sanción y retorne el objeto socio para que el caso de uso pueda reutilizarlo.
- El validador debe exponer un método que verifique que el socio no tenga una suspensión total vigente (no caducada y sin motivoLevantamiento), incluyendo el nombre y DNI del socio en el mensaje de error.
- El validador debe exponer un método que verifique la existencia de la sanción por su `id` y retorne el objeto sanción para que el caso de uso pueda reutilizarlo.
- El validador debe exponer un método que, al modificar fechas en un update, revalide que `fechaFin` sea estrictamente posterior a `fechaInicio`, usando los valores existentes como fallback para los campos omitidos.
- El validador debe exponer un método que impida levantar (asignar `motivoLevantamiento`) una sanción cuya `fechaFin` ya haya pasado si ésta no fue levantada previamente.

## Diseño Técnico (RFC)

### Modelo de Datos
No se introducen cambios en el esquema de Prisma. El validador opera exclusivamente sobre los tipos ya definidos en `@alentapp/shared`:

- `DisciplineDTO`: entidad de lectura de una sanción.
- `MemberDTO`: entidad de lectura de un socio.
- `UpdateDisciplineRequest`: DTO de actualización parcial de una sanción.

### Contrato del Servicio

El `DisciplineValidator` es una clase de dominio que recibe sus dependencias por constructor. No es un endpoint HTTP; su interfaz pública es la siguiente:

```ts
class DisciplineValidator {
    constructor(
        disciplineRepo: IDisciplineRepository,
        memberRepo: MemberRepository,
    ) {}

    // Valida que fechaFin sea posterior a fechaInicio (para creación).
    validateDateRange(fechaInicio: string, fechaFin: string): void;

    // Verifica que el socio exista. Retorna el MemberDTO para reutilizar en el caller.
    validateMemberExists(memberId: string): Promise<MemberDTO>;

    // Verifica que el socio no tenga una suspensión total vigente.
    validateNoActiveTotalSuspension(memberId: string, memberName: string, memberDni: string): Promise<void>;

    // Verifica que la sanción exista. Retorna el DisciplineDTO para reutilizar en el caller.
    validateDisciplineExists(id: string): Promise<DisciplineDTO>;

    // Revalida el rango de fechas en un update (usa valores existentes como fallback).
    validateDateRangeForUpdate(data: UpdateDisciplineRequest, existing: DisciplineDTO): void;

    // Impide levantar una sanción ya caducada que no fue levantada previamente.
    validateLevantamiento(existing: DisciplineDTO, motivoLevantamiento: string | null | undefined): void;
}
```

### Componentes de Arquitectura Hexagonal

1. **Domain (services)**: `DisciplineValidator` — servicio de dominio puro que encapsula las reglas de negocio. Vive en `packages/api/src/domain/services/DisciplineValidator.ts`.
2. **Domain (ports)**: Consume `IDisciplineRepository` (para `findById` y `findActiveTotalSuspensionByMember`) y `MemberRepository` (para `findById`). Ambas interfaces ya existen.
3. **Application**: `CreateDisciplineUseCase` y `UpdateDisciplineUseCase` delegan sus validaciones al `DisciplineValidator`.
4. **Infrastructure / Delivery**: Sin cambios.

## Casos de Borde y Errores

| Método                          | Escenario de error                                                                  | Mensaje exacto a lanzar                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `validateDateRange`             | `fechaFin` es igual o anterior a `fechaInicio`                                     | `"La fecha de fin debe ser posterior a la de inicio"`                                         |
| `validateMemberExists`          | No existe ningún socio con el `memberId` provisto                                   | `"El socio provisto no existe"`                                                               |
| `validateNoActiveTotalSuspension` | Existe una suspensión total activa para el socio (no caducada, sin levantamiento) | `"El socio {name} - DNI: {dni} ya cuenta con una suspensión total vigente"`                   |
| `validateDisciplineExists`      | No existe ninguna sanción con el `id` provisto                                      | `"El registro de sanción no existe"`                                                          |
| `validateDateRangeForUpdate`    | Con los valores fusionados (existentes + nuevos), `fechaFin` no es posterior a `fechaInicio` | `"Error al modificar la sanción. El rango de fechas introducido es inválido"`         |
| `validateLevantamiento`         | Se intenta levantar una sanción cuya `fechaFin` ya pasó y que no fue levantada antes | `"No se puede levantar una sanción que ya ha caducado"`                                      |

## Plan de Implementación

1. Crear `packages/api/src/domain/services/DisciplineValidator.ts` con los seis métodos públicos descritos, utilizando `isAfter` de `date-fns` para las comparaciones de fechas.
2. Crear `packages/api/src/domain/services/DisciplineValidator.test.ts` con tests unitarios para cada método, mockeando `IDisciplineRepository` y `MemberRepository` con `vi.fn()`.
3. Actualizar `CreateDisciplineUseCase` y `UpdateDisciplineUseCase` para delegar sus validaciones al `DisciplineValidator`, eliminando la lógica duplicada.