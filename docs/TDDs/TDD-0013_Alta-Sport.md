 | id     | 0013                                 |
 |--------|--------------------------------------|
 | estado | implementado                         |
 | autor  | Figueira Julian                      | 
 | fecha  | 03/05/2025                           | 
 | titulo | Alta de Deportes                     |


# TDD-0013: Alta de Deportes 

## Contexto de Negocio (PRD)

### Objetivo 
   Permitir que un administrativo dé el alta de un deporte en el sistema, asegurando la integridad de los datos desde el primer momento.

### User Persona:
- Nombre: Oscar (Administrativo).
- Necesidad: Registrar rápidamente los deportes que se practicaran en el club. No pueden permitirse errores en el tipeo de los cupos limitados (por ejemplo, que estos sean negativos), o nombre de deportes duplicados.

### Criterios de Aceptación
- El sistema debe validar que el nombre del deporte ingresado sea único. 
- El sistema debe validar que el nombre del deporte ingresado no sea vacio. 
- El sistema debe validar que el número de cupos ingresado sea mayor a cero.
- El sistema debe validar que el precio adicional sea mayor/igual a cero.
- El sistema debe validar que la descripción no supere los 255 caracteres.
- Al finalizar, el sistema debe mostrar un mensaje de éxito y limpiar el formulario.


## Diseño Técnico
 
### Modelo de datos:

Se definirá la entidad ```Sport``` con las siguiente propiedades y restricciones:
- ```Id```: Identificador único universal (UUID)
- ```Nombre```: Cadena de texto, único e indexado.
- ```Cupo_maximo```: Entero
- ```Precio_adicional```: Flotante
- ```Descripcion```: string
- ```Require_certificado_medico```: boolean
 
## Contrato de API

Definiremos los tipos en el paquete compartido para asegurar la sincronización
- Endpoint:  ```POST /api/v1/sports ```
- Request BODY (createSportRequest):
  
  ```
      {
       Nombre: string
       Cupo_maximo: int
       Precio_adicional: float
       Descripcion: string
       Require_certificado_medico: boolean
      }  
 
## Componentes de Arquitectura Hexagonal
1. Puerto: ```SportRepository``` (Interface en el Dominio).
2. Caso de uso: ```CreateSport``` (Logica de aplicación que verifica si el nombre del deporte ya existe antes de llamar al repositorio).
3. Adaptador de Salida: ```PostgresSportRepository```.
4. Adaptador de Entrada: ```SportController``` (ruta HTTP).


## Casos de Borde y Errores

-----------------------------------------------------------------------------------------------------------------------------------
| Escenario 	                 |  Resultado Esperado                                                           |  Código HTTP              |
|----------------------------- |----------------------------------------------------------------------------   |---------------------------|
| Nombra vacio                 |  Mensaje: "El nombre del deporte es obligatorio"                              | 400 Bad Request           |
| Nombre duplicado             |	Mensaje: “Ya existe un deporte con ese nombre”	                             | 409 Conflict              |
| Cupos_Maximo invalido        |  Mensaje: “El formato de cupos máximo debe ser un numero entero mayor a cero" | 400 Bad Request           |
| Descripcion demasiado larga  |  Mensaje: “La descripción no puede superar los 255 caracteres”                | 400 Bad Request           |
| Precio adicional invalido    |  Mensaje: “El precio debe ser un numero mayor/igual a cero”	                 | 400 Bad Request           |
| Error de conexión a BD       |  Mensaje: “Error interno, reintente más tarde”	                               | 500 Internal Server Error | 
--------------------------------------------------------------------------------------------------------------------------------------
       
## Plan de Implementación

1. Definir esquema de persistencia de la entidad ```Sport``` en el archivo schema.prisma y corre migración. 
2. Crear tipos con validaciones estrictas ZOD en ```@alentapp/shared```.
3. Implementar la Interfaz ```SportRepository```.
4. Implementar ```CreateSport```.
5. Crear endpoint en ```SportController```.
