# Gestión de Migraciones de Base de Datos

En Alentapp utilizamos **Prisma** como nuestro ORM (Object-Relational Mapping). Prisma no solo nos permite consultar la base de datos de manera tipada mediante Typescript, sino que también gestiona las "migraciones".

## ¿Qué es una Migración?

Una migración es como un "commit" o versión de control para tu base de datos. En lugar de crear tablas o columnas manualmente usando SQL (lo cual es difícil de rastrear y compartir con el equipo), defines la estructura deseada en código y la herramienta genera un archivo histórico de cambios.

De esta manera, si un desarrollador agrega un campo a una tabla, cualquier otro miembro del equipo (o el servidor de producción) puede aplicar exactamente el mismo cambio de forma automatizada y segura.

---

## Flujo de Trabajo con Prisma

En Alentapp, la fuente de la verdad para la estructura de la base de datos es el archivo `schema.prisma` ubicado en `packages/api/prisma/schema.prisma`.

### 1. Modificar el Esquema
Cuando necesites crear una nueva tabla o agregar/eliminar una columna, debes hacerlo editando el archivo `schema.prisma`.

Por ejemplo, si quisieras agregar un teléfono a los socios:
```prisma
model Member {
    id         String         @id @default(uuid())
    dni        String         @unique
    // ... otros campos ...
    telefono   String?        // Nuevo campo opcional
}
```

### 2. Generar y Aplicar la Migración
Una vez editado el archivo, debes decirle a Prisma que detecte esos cambios, cree un archivo SQL con la migración, y la aplique en la base de datos de desarrollo.

Dado que estamos utilizando Docker Compose, la base de datos Postgres expone el puerto `5432` a tu máquina local. Por lo tanto, puedes correr el comando directamente desde tu terminal (asegúrate de tener `docker compose up` corriendo).

Ejecuta el siguiente comando en la raíz del backend:

```bash
cd packages/api
npx prisma migrate dev --name agregar_telefono_socio
```

**¿Qué hace este comando?**
1. Compara el `schema.prisma` actual contra el estado de la base de datos.
2. Crea una nueva carpeta en `packages/api/prisma/migrations/` con un archivo `migration.sql` que contiene las sentencias `ALTER TABLE` o `CREATE TABLE`.
3. Ejecuta ese archivo SQL en la base de datos.
4. Ejecuta `npx prisma generate` internamente para actualizar los tipos de Typescript y que el autocompletado en tu IDE reconozca el nuevo campo `telefono`.

### 3. Migraciones Automáticas en Docker Compose

Es importante saber que nuestro entorno de desarrollo en Docker está configurado para que la API ejecute automáticamente las migraciones pendientes cada vez que se levanta el contenedor. 

Si miras el `docker-compose.yml`, verás que el servicio de la API hace esto antes de encender:
```bash
sh -c "npx prisma migrate dev --name init && ..."
```

Esto significa que si otro desarrollador de tu equipo crea una migración y tú haces `git pull`, al correr `docker compose up` tu base de datos local se actualizará automáticamente con los cambios de tu compañero sin que tengas que hacer nada manual.

---

## Resolución de Conflictos de Migraciones

Al trabajar en equipo usando Git, es común que ocurran conflictos en el historial de migraciones. Esto sucede generalmente en dos escenarios:

1. **Migraciones Paralelas**: Dos desarrolladores crean migraciones distintas al mismo tiempo en ramas diferentes, y al unirlas (Merge), Prisma detecta que el historial de base de datos no coincide con la cronología real de los archivos.
2. **Edición Manual Accidental**: Alguien modificó manualmente un archivo `.sql` de una migración que ya había sido aplicada. Prisma guarda un *checksum* (firma criptográfica) de cada migración aplicada, por lo que detectará la alteración y lanzará un error (*Checksum mismatch*).

### ¿Cómo solucionarlo?

Cuando ocurren estos problemas, la terminal te arrojará un error indicando que hubo un **Drift** o un **Checksum mismatch**.

**Opción 1: Resetear la base de datos local (Recomendado para desarrollo)**
Si estás en tu entorno local y tienes conflictos, la solución más limpia es borrar la base de datos y volverla a construir desde cero ejecutando el historial completo de migraciones consolidado:
```bash
npx prisma migrate reset
```
*(⚠️ Advertencia: Este comando borrará todos los datos locales de tu base de datos y correrá todas las migraciones nuevamente. Solo úsalo en desarrollo).*

**Opción 2: Resolver la migración fallida o aplicada manualmente**
Si unificaste ramas y tienes una migración específica que te causa problemas, pero no quieres borrar la base de datos, puedes marcarla como resuelta usando:
```bash
npx prisma migrate resolve --applied "20260420_nombre_de_la_migracion"
```

**Prevención**: La mejor forma de evitar conflictos es **comunicarse con el equipo**. Si dos personas necesitan modificar `schema.prisma` el mismo día, coordinen quién hace el cambio primero, para que el segundo se baje la rama actualizada antes de generar su propia migración.

---

## Buenas Prácticas

1. **Nombres Descriptivos**: Siempre usa nombres claros en el parámetro `--name` (ej. `add_birthdate`, `create_payments_table`).
2. **Nunca editar las migraciones a mano**: Los archivos SQL generados en la carpeta `migrations` no deben modificarse manualmente después de haber sido creados, a menos que sepas exactamente cómo corregir una migración fallida en Prisma.
3. **Commit**: Los archivos de migración (las carpetas generadas con fechas y nombres dentro de `prisma/migrations/`) **DEBEN** ser commiteados a Git. Son parte del código fuente.
