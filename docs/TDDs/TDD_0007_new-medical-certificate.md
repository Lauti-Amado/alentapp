---
id: 0007
estado: Implementado
autor: Yamil Tundis
fecha: [2026-04-30]
titulo: Registro de certificados médicos
---

# TDD-[0007]: Registro de certificados médicos

## Contexto de Negocio (PRD)

### Objetivo
Garantizar un correcto funcionamiento del club debido a la tranquilidad de operar con socios aptos físicamente mediante un certificado médico respaldado profesionalmente. De esta manera se evita digitalmente que los socios puedan realizar actividades peligrosas para su integridad física.

### User Persona
- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Mantener centralizado y al alcance el historial de certificados de cada socio, en especial el último emitido ya que este es el que determina la situación actual de cada socio que quiere realizar una actividad en el club.

### Criterios de Aceptación
- El sistema debe validar que la fecha de vencimiento sea mayor que la fecha de emisión del certificado.
- El sistema debe inicializar el certificado como 'esta_validado = null', es decir, en espera de ser calificado.
- Al finalizar, el sistema debe mostrar un mensaje de éxito e invalidar los anteriores certificados médicos del socio en cuestión.

## Diseño Técnico (RFC)

### Modelo de Datos
[Descripción de cambios en Prisma o nuevas entidades.]
*   `campo`: Tipo (Restricciones).

### Contrato de API (@alentapp/shared)
[Definición de endpoints y tipos compartidos.]
*   **Endpoint**: `METHOD /api/v1/[recurso]`
*   **Request Body**:
```ts
{
    // propiedades
}
```

### Componentes de Arquitectura Hexagonal
[Cómo se distribuye la lógica en las capas.]
*   **Domain**: [Entidades, Value Objects, Reglas de negocio]
*   **Application**: [Casos de Uso, Puertos de Salida]
*   **Infrastructure**: [Adaptadores, Controladores, Implementación de Repositorios]

## Casos de Borde y Errores
| Escenario                   | Resultado Esperado                            | Código HTTP               |
| ----------------------------| --------------------------------------------- | ------------------------- |
| [Ej: DNI ya registrado]     | [Error de validación con mensaje claro]       | 409 Conflict              |
| [Ej: Formato email inválido]| [Error de validación de formato]              | 400 Bad Request           |

## Plan de Implementación
1. [Paso 1: ej. Definir tipos en @alentapp/shared]
2. [Paso 2: ej. Implementar entidad en Domain]