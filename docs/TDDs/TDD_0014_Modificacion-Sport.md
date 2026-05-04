
 | id     | 14                                   |
 |--------|--------------------------------------|
 | estado | Propuesto                            |
 | autor  | Julian Figueira                      | 
 | fecha  | 03-05-2025                           | 
 | titulo | Actualizacion de Deportes Existentes |





# TDD-0014: Actualización de Deportes Existentes

## Contexto de Negocio (PRD)

### Objetivo
Permitir a los administradores corregir o modificar la información de un deporte existente en el sistema, como su número de cupo máximo que se haya cambiado o ingresado incorrectamente. 

### User Persona
- Nombre: Oscar (Administrativo).
- Necesidad: Modificar datos de los deportes rápidamente desde la tabla del panel de administración. Por ejemplo ajustar los cupos disponibles o modificar la descripción de un deporte.

### Criterios de Aceptación
- El sistema debe permitir actualizar los campos de cupo maximo y descripcion.
- El sistema debe impedir que se modifique el nombre del Deporte.
- El sistema debe validar que el cupo máximo sea un numero entero mayor a cero.
- El sistema debe validar que el valor de cupo maximo no sea inferior a la cantidad de inscripciones ya registradas para ese deporte.
- El sistema debe validar que la descripción no supere los 255 caracteres.
- Si la edición es correcta, debe retornar los nuevos datos del deporte actualizados.

## Diseño Tecnico (RFC).

### Contrato de API (@alentapp/shared)
Se utilizará el paquete compartido para definir el cuerpo de la petición. Los campos permitidos para la actualización (cupo máximo y descripción) son opcionales, ya que se trata de una actualización parcial. (PATCH a nivel de negocio, aunque el endpoint implemente PUT).
- Endpoint: ```PUT /api/v1/sports/:id```
- Request BODY (UpdateSportRequest):

  ``` 
    {
      Cupo_Maximo?: int
      descripcion?: string
    } 

### Componentes de Arquitectura Hexagonal
1. Puerto: ```SportRepository``` (Interfaz que define el método update (id, data)).
2. Servicio de Dominio: ```SportValidator``` (Encargado de reutilizar validaciones de Cupo_Maximo).
3. Casos de Uso: ```UpdateSportUseCase``` (Orquesta la validacion y llama al repositorio).
4. Adaptador de Salida: ```PostgresSportRepository``` (Actualizacion usando el método update de Prisma).
5. Adaptador de Entrada: ```SportController``` (Ruta HTTP que extrae id de la URL y mapea excepciones a códigos HTTP).



# Casos de Borde Y Errores


-------------------------------------------------------------------------------------------------------------------------------------------------------------------------                          
| Escenario actual                               | Resultado Esperado	                                                                      | Codigo HTTP               |
|------------------------------------------------|------------------------------------------------------------------------------------------|---------------------------|
| Deporte inexistente                            |	Mensaje: “El deporte no existe”	                                                        | 400 Bad Request           |
| Cupos_Maximo invalido                          |	Mensaje: “El cupo máximo debe ser un numero entero mayor a cero"                        | 400 Bad Request           |
| Cupo Maximo menor a  inscripciones existentes	 |  Mensaje: “El cupo máximo no puede ser menor a la cantidad de inscripciones registradas” |	409 Conflict              |
| Descripcion demasiado larga                    |  Mensaje: “La descripción no puede superar los 255 caracteres”                           | 400 Bad Request           |
| Error de Conexión a DB	                       |  Mensaje: “Error interno, reintente mas tarde”	                                          | 500 Internal Server Error |          
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# Plan de Implementación

1. Actualizar las interfaces en el paquete ```@alentapp/shared``` con validaciones Zod ```(UpdateSportRequest)```.
2. Ampliar el ```SportRepository``` con el método update.
3. Implementar la lógica en ```SportMemberUseCase``` utilizando el ```SportValidator``` centralizado.
4. Crear la ruta ```PUT``` en el controlador y enlazarla a la app de Fastify.
5. Consumir el endpoint desde el servicio de Frontend y reutilizar el modal de creación para permitir la edición. 

