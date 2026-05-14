---
id: 9
estado: Propuesto
autor: Yamil Tundis
fecha: 2026-05-02
titulo: Eliminación de Certificados Médicos
---

# TDD-0009: Eliminación de Certificados Médicos Existentes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administrativos eliminar un certificado médico del sistema permanentemente, eliminando su registro de la base de datos para mantener la lista actualizada y libre de registros duplicados o cancelados erróneamente.

### User Persona

- Nombre: Juan (Administrativo).
- Necesidad: Eliminar un certificado médico en caso de este no ser verídico de manera rápida, y ademas segura ya que el sistema pedirá una confirmación del acto.

### Criterios de Aceptación

- El sistema debe pedir una confirmación explícita antes de proceder con el borrado.
- El sistema debe validar que el certificado médico exista antes de intentar borrarlo.
- El sistema debe corroborar si el certificado a eliminar es el último del cliente (es decir, el que tenga 'esta_valido = true'). Si es el último, debe al anterior asignarle a su atributo 'esta_validado' con 'true'. Esto para determinar que ahora el certificado médico vigente del socio es ahora el anterior al que fue borrado.
- El sistema debe realizar un borrado físico de la base de datos (hard delete).
- Si el borrado es exitoso, la tabla debe actualizarse automáticamente.

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)

Ya que se trata de una operación destructiva, no es necesario mandar un body en la request.

- Endpoint: `DELETE /api/v1/medical_certificate/:id`
- Request Body: `None`
- Response: `204 No Content` en caso de éxito.

### Componentes de Arquitectura Hexagonal

1. Puerto: `MedicalCertificateRepository` (Método `delete(id)`).
2. Caso de Uso: `DeleteMedicalCertificateUseCase` (Comprueba existencia previa vía `findById` y delega la eliminación).
3. Adaptador de Salida: `PostgresMedicalCertificateRepository` (Eliminación usando el método `delete` de Prisma).
4. Adaptador de Entrada: `MedicalCertificateController` (Ruta HTTP que extrae el `id` y devuelve un status 204).

## Casos de Borde y Errores

| Escenario                  | Resultado Esperado                            | Código HTTP actual        |
| -------------------------- | --------------------------------------------- | ------------------------- |
| Certificado Médico inexistente          | Mensaje: "El certificado médico no existe"               | 400 Bad Request           |
| Error de conexión a DB     | Mensaje: "Error interno, reintente más tarde" | 500 Internal Server Error |
| Eliminación exitosa        | Respuesta vacía                               | 204 No Content            |

## Plan de Implementación

1. Ampliar el `MedicalCertificateRepository` y `PostgresMedicalCertificateRepository` con el método `delete`.
2. Crear la lógica de negocio en `DeleteMedicalCertificateUseCase`.
3. Crear el endpoint `DELETE /api/v1/medical_certificate/:id` en el `MdicalCertificaterController` y registrarlo en `app.ts`.
4. Añadir el método `delete` al servicio Frontend (`medical_certificate.ts`).
5. Enlazar el botón de eliminación en `MedicalCertificateView.tsx` agregando la confirmación del navegador (`window.confirm`) antes de hacer la llamada.
