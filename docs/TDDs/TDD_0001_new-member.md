---
id: 0001
estado: Implementado
autor: Rodrigo Jacznik
fecha: 2026-04-20
titulo: Registro de Nuevos Socios
---

# TDD-0001: Registro de Nuevos Socios

## Contexto de Negocio (PRD)

### Objetivo

Eliminar el registro manual en fichas de papel, permitiendo que un administrativo dé de alta a un socio de forma digital, asegurando la integridad de los datos desde el primer momento.

### User Persona

- Nombre: Alberto (Tesorero/Administrativo).
- Necesidad: Cargar datos rápido mientras tiene gente esperando en la fila. No puede permitirse errores de tipeo en el DNI o emails duplicados.

### Criterios de Aceptación

- El sistema debe validar que el DNI sea numérico y único.
- El sistema debe validar que el Email sea válido y único.
- Al finalizar, el sistema debe mostrar un mensaje de éxito y limpiar el formulario.
- El socio debe quedar guardado con estado "Activo" por defecto.

## Diseño Técnico (RFC)

### Modelo de Datos

Se definirá la entidad `Member` con las siguientes propiedades y restricciones:

- `id`: Identificador único universal (UUID).
- `dni`: Cadena de texto, único e indexado.
- `nombre`: Cadena de texto.
- `email`: Cadena de texto, único y validado por formato.
- `categoria`: Enumeración (`Pleno`, `Cadete`, `Honorario`).
- `estadoCuenta`: Enumeración con valor por defecto `Activo`.
- `creadoEl`: Fecha de creación autogenerada.

### Contrato de API (@alentapp/shared)

Definiremos los tipos en el paquete compartido para asegurar sincronización:

- Endpoint: `POST /api/v1/socios` (Corregido según la implementación actual)
- Request Body (CreateMemberRequest):

```ts
{
    dni: string;
    nombre: string;
    email: string;
    categoria: 'Pleno' | 'Cadete' | 'Honorario';
}
```

### Componentes de Arquitectura Hexagonal

1. Puerto: MemberRepository (Interface en el Dominio).
2. Caso de Uso: CreateMember (Lógica que verifica si el DNI ya existe antes de llamar al repositorio).
3. Adaptador de Salida: DB persistence adapter (Implementación real en BD).
4. Adaptador de Entrada: MemberController (Ruta HTTP).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP               |
| -------------------------- | --------------------------------------------- | ------------------------- |
| DNI ya registrado          | Mensaje: "Ya existe un miembro con ese DNI"   | 409 Conflict              |
| Email con formato inválido | Mensaje: "Formato de correo electrónico inválido"| 400 Bad Request           |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |
| Socio menor de 18 años     | Forzar categoría "Cadete" (Regla de negocio)  | 201 Created               |

## Plan de Implementación

1. Definir esquema de persistencia y correr migración.
2. Crear tipos en shared y puerto en el Dominio.
3. Implementar el repositorio y el caso de uso.
4. Crear formulario en React y conectar con el endpoint del backend.
