# Modelado de datos

MongoDB, pensado desde una cabeza relacional (Postgres). Antes de las colecciones, el glosario de equivalencias que se usa en todo este documento:

| SQL (Postgres) | MongoDB | Diferencia clave |
|---|---|---|
| Tabla | Colección | La colección no tiene schema fijo a nivel de motor (nosotros igual lo fijamos a nivel de app, con Mongoose/class-validator) |
| Fila | Documento (BSON/JSON) | Un documento puede anidar objetos y arrays; no hace falta una tabla aparte para una relación 1-a-N chica |
| PK (`SERIAL`/`UUID`) | `_id` (`ObjectId`) | Autogenerado por Mongo, ya viene indexado por defecto |
| FK + constraint | Campo con un `ObjectId` "de referencia" | **No hay integridad referencial a nivel de motor.** Si borro un `user`, sus `messages` no se borran ni se bloquea el delete solos — hay que resolverlo a nivel de aplicación (o con una transacción) |
| `JOIN` | `$lookup` (aggregation) o dos queries desde la app | `$lookup` existe pero es más costoso que un JOIN en Postgres; el patrón idiomático de Mongo es **denormalizar** lo que se lee junto seguido, en vez de joinear |
| `CREATE INDEX` | `createIndex` / `@Prop({ index: true })` | Misma idea (B-tree por default), pero hay que crearlos explícitamente vos, Mongo no infiere nada por las queries que hagas |
| Normalización (3FN) | Embedding vs. Referencing | La pregunta central del modelado en Mongo no es "cómo evito duplicar datos" sino "qué leo siempre junto" |

## Colecciones

### `users`

Une usuario + perfil en un solo documento (ver [decisión](DECISIONS.md#2026-09-24--user-y-profile-en-una-sola-colección)).

```ts
{
  _id: ObjectId,
  email: string,          // único, lowercase, indexado
  passwordHash: string,   // bcrypt, nunca se devuelve en las respuestas
  firstName: string,
  lastName: string,
  birthDate: Date,
  phone: string,
  avatarUrl: string | null,
  status: "online" | "offline",
  lastSeenAt: Date,
  createdAt: Date,
  updatedAt: Date,
}
```

**Índices**
- `{ email: 1 }` único → equivalente a `UNIQUE` de SQL, resuelve la validación de "email único" a nivel de base.
- `{ firstName: 1, lastName: 1 }` → soporta el ordenamiento/filtro del listado. El filtro de texto libre se resuelve con `$regex` (alcanza para el volumen de datos de una prueba técnica; un índice de texto tipo `$text` sería el paso siguiente si esto creciera).

### `chats`

Representa una conversación 1 a 1.

```ts
{
  _id: ObjectId,
  participants: [ObjectId, ObjectId],  // ref -> users, siempre 2 elementos
  participantsKey: string,             // "<idMenor>_<idMayor>", ver nota
  lastMessage: {
    content: string,
    senderId: ObjectId,
    sentAt: Date,
  } | null,
  createdAt: Date,
  updatedAt: Date,
}
```

**Por qué `participants` es un array y no `userA`/`userB`:** es el modelado idiomático de chat en Mongo (`{ participants: 1 }` es un índice *multikey*, Mongo indexa cada elemento del array). Deja la puerta abierta a un chat grupal el día de mañana sin cambiar el schema — pero **el alcance de esta entrega es solo 1 a 1**, no se construye lógica ni UI de grupos.

**`participantsKey`:** string derivado (`[idA, idB].sort().join("_")`) con índice único. Reemplaza lo que en SQL sería un `UNIQUE (user_a_id, user_b_id)` — Mongo no soporta `UNIQUE` sobre "el par sin importar el orden" directamente, así que se resuelve con este campo calculado. Evita crear dos chats duplicados entre el mismo par de usuarios.

**`lastMessage` embebido:** es una **denormalización intencional**. El listado de chats (pantalla más consultada de la app) necesita "último mensaje + fecha" sin abrir la colección `messages`. En vez de hacer un `$lookup` costoso por cada chat listado, se guarda una copia liviana del último mensaje directamente en el `chat`, y se actualiza cada vez que se crea un `message` nuevo (mismo request, misma transacción lógica). Trade-off documentado: hay un dato duplicado que el código tiene que mantener sincronizado a mano — no hay un trigger de la base que lo haga por vos como en SQL.

**Índices**
- `{ participants: 1 }` → resolver "chats de este usuario" (`find({ participants: userId })`), el equivalente a `WHERE user_a_id = ? OR user_b_id = ?` pero sin el `OR`.
- `{ participantsKey: 1 }` único → evita chats duplicados entre el mismo par.

**Nombre del contacto en el listado:** no se denormaliza (no se copia el nombre del otro usuario dentro del chat) porque cambiaría si esa persona edita su perfil, y en un chat 1 a 1 resolver "quién es el otro participante" es una sola query extra barata (`$lookup` puntual o segunda consulta a `users`), no una lista completa a joinear.

### `messages`

```ts
{
  _id: ObjectId,
  chatId: ObjectId,       // ref -> chats
  senderId: ObjectId,     // ref -> users
  content: string | null, // texto del mensaje; null si es solo adjunto
  attachment: {
    url: string,
    filename: string,
    mimeType: string,
    size: number,
  } | null,
  sentAt: Date,
  createdAt: Date,
}
```

**Adjuntos:** el archivo se guarda en disco del backend (carpeta `uploads/`, servida como estática o vía endpoint dedicado) y el mensaje persiste la referencia (`url`, `filename`, `mimeType`, `size`), no el binario. Ver [decisión](DECISIONS.md#2026-09-24--persistencia-de-adjuntos).

**Índices**
- `{ chatId: 1, sentAt: 1 }` compuesto → es el índice que sostiene la pantalla de conversación: "traeme los mensajes de este chat, ordenados por fecha, paginados". Análogo directo a un índice compuesto `(chat_id, sent_at)` en Postgres para la misma query.

## Relaciones — resumen

```
users 1 ──< participants >── chats
users 1 ───────────────────< messages (senderId)
chats 1 ─────────────────── < messages (chatId)
```

Todas las relaciones se resuelven **por convención de aplicación** (DTOs + servicios validan que el `ObjectId` referenciado exista), no por constraint de la base. Es el punto que más justificación se le va a pedir a esta entrega frente a alguien que conoce SQL: en Postgres esto lo garantiza la FK; acá lo garantiza el `UsersService`/`ChatsService` antes de insertar.

## Qué queda fuera de este MVP (documentado, no implementado)

- Chats grupales (el modelo lo soporta, la lógica/UI no).
- Recibos de lectura / doble check (`read` por mensaje) — se podría sumar un campo `readBy: ObjectId[]` en `messages` sin romper nada existente.
- Borrado/edición de mensajes.
