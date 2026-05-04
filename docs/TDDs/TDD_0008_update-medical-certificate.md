---
id: 8
estado: Propuesto
autor: Yamil Tundis
fecha: 2026-05-02
titulo: Actualización de certificados médicos
---

# TDD-[0008]: Actualización de certificados médicos

## Contexto de Negocio (PRD)

### Objetivo
Permitir a los administrativos corregir algun dato puntual sobre los certificados médicos omitidos de los socios.

### User Persona
- Nombre: Juan (Administrativo).
- Necesidad: Mantener un registro confiable de cada certificado médico, sin errores que puedan llegar a derivar en malos entendidos. De esta manera, digitalmente se modifica el registro en conflicto sin dejar huellas del error anterior (como sí pasaria si se tachara y se escribiera arriba en una planilla física)

### Criterios de Aceptación
- El sistema debe permitir actualizar cualquier cantidad requerida de los campos del socio.
- El sistema debe validar, en caso que se quiera modificar al menos 1 fecha, que las fechas (de emisión y vencimiento) cumplan con su formato adecuado y que la fecha de vencimiento sea mayor que la de emisión.
- El sistema debe pedir confirmación en el caso que se quiera modificar el MemberID, de manera que no haya equivocaciones de asignar el certificado médico por error a otra persona.
- En caso de la edición ser correcta, el sistema retornará los nuevos datos del certificado médico actualizado.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

En este paquete se define el formato que debe cumplir la request en el caso de modificación de un certificado médico. Pueden enviarse de uno a muchos campos, y todos son opcionales.

*   Endpoint: `PUT /api/v1/medical_certificate/:id`
*   Request Body (UpdateMedicalCertificate):
```ts
{
    memberId?: Int.
    fecha_emision?: Date.
    fecha_vencimiento?: Date.
    licencia_doctor?: String.
}
```

### Componentes de Arquitectura Hexagonal

1. Puerto: `MedicalCertificateRepository` (Método `update(id, data)`).
2. Servicio de Dominio: `MedicalCertificateValidator` (Verifica la data ingresada, como por ejemplo las fechas).
3. Caso de Uso: `UpdateMedicalCertificateUseCase` (Orquesta la validación y llama al repositorio).
4. Adaptador de Salida: `PostgresMemberRepository` (Actualización usando el método `update` de Prisma).
5. Adaptador de Entrada: `MedicalCertificateController` (Ruta HTTP que extrae el `id` de la URL y mapea excepciones a códigos HTTP).

## Casos de Borde y Errores
| Escenario                   | Resultado Esperado                            | Código HTTP               |
| ----------------------------| --------------------------------------------- | ------------------------- |
| MemberID inexistente     | [Error de member no existente]       | 400 Bad Request             |
| Fecha vencimiento < Fecha emision | [Error de validación de coherencia de fechas]       | 409 Conflict              |
| Formato fecha inválida| [Error de validación de formato]              | 400 Bad Request           |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |

## Plan de Implementación

1. Actualizar las interfaces en el paquete `@alentapp/shared` (`UpdateMedicalCertificateRequest`).
2. Agregar al `MedicalCertificateRepository` el método `update`.
3. Implementar la lógica en `UpdateMedicalCertificateUseCase` utilizando el `MedicalCertificateValidator` centralizado.
4. Crear la ruta `PUT` en el controlador y enlazarla a la app de Fastify.
5. Consumir el endpoint desde el Frontend y reutilizar el modal de creación para permitir la edición.