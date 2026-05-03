---
id: 0007
estado: Implementado
autor: Yamil Tundis
fecha: [2026-05-01]
titulo: Registro de certificados médicos
---

# TDD-[0007]: Registro de certificados médicos

## Contexto de Negocio (PRD)

### Objetivo
Garantizar un correcto funcionamiento del club debido a la tranquilidad de operar con socios aptos físicamente mediante un certificado médico respaldado profesionalmente. De esta manera se evita digitalmente que los socios puedan realizar actividades peligrosas para su integridad física.

### User Persona
- Nombre: Juan (Administrativo).
- Necesidad: Mantener centralizado y al alcance el historial de certificados de cada socio, en especial el último emitido ya que este es el que determina la situación actual de cada socio que quiere realizar una actividad en el club.

### Criterios de Aceptación
- El sistema debe validar que la fecha de vencimiento sea mayor que la fecha de emisión del certificado.
- El sistema debe inicializar el certificado como 'esta_validado = true'.
- Al finalizar, el sistema debe mostrar un mensaje de éxito e invalida el anterior certificado médico del socio en cuestión poniendo su atributo 'esta_validado' en 'false'.

## Diseño Técnico (RFC)

### Modelo de Datos

El modelo de datos de la entidad `MedicalCertificate` será:

- `id`: Identificador único universal.
- `memberId`: Foreign key del member.
- `fecha_emision`: Fecha de emisión del certificado.
- `fecha_vencimiento`: Fecha de vencimiento del certificado.
- `esta_validado`: Boolean (define si está vigente)
- `licencia_doctor`: Cadena de texto que representa la licencia del doctor que certifica.

### Contrato de API (@alentapp/shared)
Se utilizará el paquete compartido para definir el cuerpo para el alta de un certificado médico. Cómo 'esta_validado' se inicializa en 'True', entonces no se manda como parámetro en el Request Body.

*   Endpoint: `POST /api/v1/medical_certificate`
*   Request Body:
```ts
{
    memberId: Int.
    fecha_emision: Date.
    fecha_vencimiento: Date.
    licencia_doctor: String.
}
```

### Componentes de Arquitectura Hexagonal

1. Puerto: MedicalCertificateRepository (Interface en el Dominio).
2. Caso de Uso: CreateMedicalCertificate (Lógica que verifica si el DNI ya existe antes de llamar al repositorio).
4. Adaptador de Salida: `PostgresMedicalCertificateRepository` (Usando el método `create` de Prisma).
4. Adaptador de Entrada: MedicalCertificateController (Ruta HTTP).

## Casos de Borde y Errores
| Escenario                   | Resultado Esperado                            | Código HTTP               |
| ----------------------------| --------------------------------------------- | ------------------------- |
| Fecha vencimiento < Fecha emision | [Error de validación de coherencia de fechas]       | 409 Conflict              |
| Formato fecha inválida | [Error de validación de formato]              | 400 Bad Request           |
| MemberID no encontrado | [Error de member no existente]              | 400 Bad Request           |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |

## Plan de Implementación

1. Definir esquema de persistencia y correr migración.
2. Crear tipos en shared y puerto en el Dominio.
3. Implementar el repositorio y el caso de uso.
4. Crear formulario en React y conectar con el endpoint del backend.