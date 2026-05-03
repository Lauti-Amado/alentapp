 | id     | 0015                                 |
 |--------|--------------------------------------|
 | estado | implementado                         |
 | autor  | Figueira Julian                      | 
 | fecha  | 03/05/2025                           | 
 | titulo | Baja de Deportes                     |

#  TDD-0015: Eliminación de Deportes Existentes

## Contexto de Negocio (PRD)

###  Objetivo
Permitir a los administrativos dar de baja permanentemente a un deporte del sistema, eliminando su registro de la base de datos para mantener la lista actualizada y libre de registros duplicados o cancelados erróneamente. 

###  User Persona:
- Nombre: Oscar (Administrativo).
- Necesidad: Borrar un deporte que fue cargado por error o un deporte de prueba, de forma rápida desde la misma tabla principal. Necesita una advertencia antes de borrar para no cometer errores irreparables.

### Criterios de Aceptación: 
- El sistema debe pedir una confirmación explicita (advertencia visual) antes de proceder con el borrado.
- El sistema debe validar que el deporte exista antes de intentar borrarlo.
- El sistema debe realizar un borrado físico de la base de datos (hard delete), eliminando también todas las inscripciones asociadas al deporte.
- Si el borrado es exitoso, la tabla debe actualizarse automáticamente. 

## Diseño Técnico (RFC)

### Contrato de API (@alentapp/shared)
Al tratarse de una operación destructiva que solo requiere conocer el identificador, no se envía cuerpo en la petición HTTP.
- Endpoint:  ```DELETE /api/v1/sports/:id ```
- Request Body: ```None```
- Responde: ```204 No Content``` en caso de éxito. 

### Componentes de Arquitectura Hexagonal
1. Puerto: ```SportRepository``` (método ```delete(id)```).
2. Caso de Uso: ```DeleteSportUseCase``` (comprueba existencia previa via ```findById``` y delega la eliminación).
3. Adaptador de Salida: ```PostgresSportRepository``` (Eliminacion usando el método ```delete``` de Prisma).
4. Adaptador de Entrada: ```SportController``` (Ruta HTTP que extrae el ```id``` y devuelve un status 204).


## Casos de Borde y Errores

 --------------------------------------------------------------------------------------------------
|Escenario	             | Resultado Esperado	                       | Código HTTP actual        |
|------------------------|---------------------------------------------|---------------------------|
| Deporte inexistente    | Mensaje: “el deporte no existe”	           | 400 Bad Request           |
| Error de conexión a DB | Mensaje: “error del motor de base de datos” | 500 Internal Server Error |      
|Eliminación exitosa	 | Respuesta vacía 	                           | 204 no Content            |
 --------------------------------------------------------------------------------------------------


## Plan de Implementación 

1. Ampliar el ```SportRepository``` y ```PostgresSportRepository``` con el método delete.
2. Crear la lógica de negocio en ```DeleteSportUseCase.```
3. Crear el endpoint ```DELETE /api/v1/sports/:id``` en el ```SportController``` y registrarlo en ```app.ts```.
4. Añadir el método ```delete``` al servicio Frontend (```sports.ts```).
5. Enlazar el botón de eliminación en ```SportsView.tsx``` agregando la confirmación del navegador (```window.confirm```) antes de hacer la llamada. 
