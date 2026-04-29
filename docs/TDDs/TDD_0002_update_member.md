---
id: 0002
estado: Implementado
autor: Rodrigo Jacznik
fecha: 2026-04-28
titulo: Actualización de Socios Existentes
---

# TDD-0002: Actualización de Socios Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos corregir o modificar la información de un socio existente en el sistema, como su estado de cuenta, categoría o datos personales que hayan cambiado o se hayan ingresado incorrectamente.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Modificar datos de los socios rápidamente desde la tabla del panel de administración. Por ejemplo, actualizar a un socio que pagó sus deudas pasando su estado a "Activo", o corregir un DNI mal tipeado.

### Criterios de Aceptación

- El sistema debe permitir actualizar uno, varios o todos los campos del socio.
- El sistema debe validar que, si se cambia el DNI, este no pertenezca ya a otro socio.
- El sistema debe validar el formato del email en caso de que este sea modificado.
- El sistema debe recalcular y forzar la categoría a "Cadete" si la fecha de nacimiento ingresada resulta en una edad menor a 18 años.
- Si la edición es correcta, debe retornar los nuevos datos del socio actualizados.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Se utilizará el paquete compartido para definir el cuerpo de la petición. Todos los campos son opcionales ya que se trata de una actualización parcial (PATCH a nivel de negocio, aunque el endpoint implemente PUT).

- Endpoint: `PUT /api/v1/socios/:id`
- Request Body (UpdateMemberRequest):

```ts
{
    dni?: string;
    name?: string;
    email?: string;
    birthdate?: string; // ISO Date String (YYYY-MM-DD)
    category?: 'Pleno' | 'Cadete' | 'Honorario';
    status?: 'Activo' | 'Moroso' | 'Suspendido';
}
```

### Componentes de Arquitectura Hexagonal

1. **Puerto**: `MemberRepository` (Método `update(id, data)`).
2. **Servicio de Dominio**: `MemberValidator` (Encargado de reutilizar validaciones de DNI, email y cálculo de minoría de edad).
3. **Caso de Uso**: `UpdateMemberUseCase` (Orquesta la validación y llama al repositorio).
4. **Adaptador de Salida**: `PostgresMemberRepository` (Actualización usando el método `update` de Prisma).
5. **Adaptador de Entrada**: `MemberController` (Ruta HTTP que extrae el `id` de la URL y mapea excepciones a códigos HTTP).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP actual        |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Socio inexistente          | Mensaje: "El miembro no existe"               | 400 Bad Request           |
| DNI ya registrado por otro | Mensaje: "Ya existe un miembro con ese DNI"   | 409 Conflict              |
| Email con formato inválido | Mensaje: "Formato de correo electrónico inválido"| 400 Bad Request        |
| Cambio a menor de edad     | Forzar categoría "Cadete" silenciosamente     | 200 OK                    |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |

## Plan de Implementación

1. Actualizar las interfaces en el paquete `@alentapp/shared` (`UpdateMemberRequest`).
2. Ampliar el `MemberRepository` con el método `update`.
3. Implementar la lógica en `UpdateMemberUseCase` utilizando el `MemberValidator` centralizado.
4. Crear la ruta `PUT` en el controlador y enlazarla a la app de Fastify.
5. Consumir el endpoint desde el servicio de Frontend y reutilizar el modal de creación para permitir la edición.
