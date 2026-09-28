import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from './app.module.js';
import { Chat, type ChatDocument } from './chats/schemas/chat.schema.js';
import { Message, type MessageDocument } from './messages/schemas/message.schema.js';
import { User, type UserDocument } from './users/schemas/user.schema.js';
import { UsersService } from './users/services/users.service.js';

/* eslint-disable no-console */

export interface SeedOptions {
  /** Vacía la base y los archivos subidos antes de sembrar (`--force`). */
  force?: boolean;
}

interface SeedCount {
  created: number;
  existing: number;
}

export interface SeedReport {
  force: boolean;
  users: SeedCount;
  chats: SeedCount;
  messages: SeedCount;
}

const PASSWORD = 'Sup3rSecret!';

const USERS = [
  {
    email: 'ana@example.com',
    firstName: 'Ana',
    lastName: 'García',
    birthDate: '1995-03-20',
    phone: '+5491122334455',
    role: 'user' as const,
  },
  {
    email: 'bruno@example.com',
    firstName: 'Bruno',
    lastName: 'Díaz',
    birthDate: '1993-07-11',
    phone: '+5491133445566',
    role: 'user' as const,
  },
  {
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'Pulse',
    birthDate: '1990-01-01',
    phone: '+5491100000000',
    role: 'admin' as const,
  },
];

const CONVERSATION = [
  { from: 'ana@example.com', content: 'Hola Bruno! ¿Cómo va todo?', offsetMinutes: -5 },
  { from: 'bruno@example.com', content: 'Todo bien Ana, ¿y vos?', offsetMinutes: -4 },
  { from: 'ana@example.com', content: 'Bien también, arrancando con la prueba técnica 🚀', offsetMinutes: -3 },
];

/**
 * Carga los datos de prueba para poder recorrer el flujo completo sin usar la
 * UI: 3 usuarios (2 `user` + 1 `admin`), el chat entre los dos primeros y unos
 * mensajes. Credenciales en el README y en el log final.
 *
 * **Es idempotente**: cada entidad se busca por su clave natural (el email en
 * usuarios, `participantsKey` en el chat, y el trío chat+remitente+contenido en
 * los mensajes) y solo se crea si falta. Volver a correrlo no duplica nada y
 * **no toca** lo que se haya creado desde la app.
 *
 * Eso es lo que hace seguro el `node dist/seed.js && node dist/main.js` del
 * `docker-compose.yml`, que corre en **cada arranque** del contenedor: el
 * primer `docker compose up` de una máquina limpia deja la API con datos, y un
 * reinicio posterior ya no se lleva puesto lo que haya hecho quien la estaba
 * probando.
 *
 * No se usa un guard global del tipo "si hay usuarios, no hagas nada": con eso,
 * una corrida que hubiera fallado a la mitad (usuarios creados, chat no)
 * dejaría la base en un estado incompleto **para siempre**, porque las
 * siguientes corridas saltarían enteras. Yendo por clave natural, re-correrlo
 * repara lo que falte sin duplicar lo que ya está.
 *
 * Con `force` sí se vacía todo antes (base y archivos subidos), que es el
 * camino para volver a un estado limpio conocido: `npm run seed:reset`.
 *
 * El rol `admin` no se puede pedir vía `POST /users` (no está en el DTO
 * público, para que nadie se auto-promueva): se setea acá sobre el documento
 * después de crearlo, que es la única forma de tener un admin en esta app.
 */
export async function seed(options: SeedOptions = {}): Promise<SeedReport> {
  const force = options.force ?? false;
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const usersService = app.get(UsersService);
    const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
    const chatModel = app.get<Model<ChatDocument>>(getModelToken(Chat.name));
    const messageModel = app.get<Model<MessageDocument>>(getModelToken(Message.name));

    if (force) {
      await Promise.all([userModel.deleteMany({}), chatModel.deleteMany({}), messageModel.deleteMany({})]);
      await emptyUploads(app.get(ConfigService).get<string>('uploadsDir') ?? 'uploads');
      console.log('Seed (--force): base y archivos subidos vaciados antes de sembrar.');
    }

    const report: SeedReport = {
      force,
      users: { created: 0, existing: 0 },
      chats: { created: 0, existing: 0 },
      messages: { created: 0, existing: 0 },
    };

    // --- Usuarios (clave natural: email) ---
    const byEmail = new Map<string, string>();
    for (const spec of USERS) {
      const found = await userModel.findOne({ email: spec.email }).exec();
      if (found) {
        byEmail.set(spec.email, found._id.toString());
        report.users.existing++;
        continue;
      }

      const created = await usersService.create({ ...spec, password: PASSWORD });
      if (spec.role === 'admin') {
        await userModel.updateOne({ _id: created.id }, { role: 'admin' });
      }
      byEmail.set(spec.email, created.id);
      report.users.created++;
    }

    // --- Chat (clave natural: participantsKey, el mismo par ordenado que usa ChatsService) ---
    const anaId = byEmail.get('ana@example.com')!;
    const brunoId = byEmail.get('bruno@example.com')!;
    const participantsKey = [anaId, brunoId].sort().join('_');

    let chat = await chatModel.findOne({ participantsKey }).exec();
    if (chat) {
      report.chats.existing++;
    } else {
      chat = await chatModel.create({ participants: [anaId, brunoId], participantsKey, lastMessage: null });
      report.chats.created++;
    }

    // --- Mensajes (clave natural: chat + remitente + contenido) ---
    const now = Date.now();
    for (const message of CONVERSATION) {
      const result = await messageModel.updateOne(
        { chatId: chat._id, senderId: byEmail.get(message.from), content: message.content },
        { $setOnInsert: { attachment: null, sentAt: new Date(now + message.offsetMinutes * 60_000) } },
        { upsert: true },
      );
      if (result.upsertedCount > 0) {
        report.messages.created++;
      } else {
        report.messages.existing++;
      }
    }

    // El preview del chat se recalcula desde el mensaje más nuevo que haya
    // realmente en la conversación, en vez de fijarlo al último del seed: así
    // repara una corrida que hubiera quedado a medias, y no pisa el preview si
    // desde la app se siguió conversando.
    const newest = await messageModel.findOne({ chatId: chat._id }).sort({ sentAt: -1 }).exec();
    if (newest) {
      await chatModel.updateOne(
        { _id: chat._id },
        {
          lastMessage: {
            content: newest.content,
            senderId: newest.senderId,
            sentAt: newest.sentAt,
          },
        },
      );
    }

    logReport(report);
    return report;
  } finally {
    await app.close();
  }
}

/**
 * Vacía el **contenido** de la carpeta de subidas, no la carpeta: en Docker
 * `uploads/` es el punto de montaje de un volumen y no se puede eliminar desde
 * adentro (EBUSY). Las subcarpetas las vuelve a crear `setup-app.ts` al
 * arrancar el server.
 *
 * Solo corre con `--force`, junto con el borrado de las colecciones. Hacerlo en
 * una corrida normal borraría la foto de perfil de un usuario que sigue
 * existiendo, dejándolo apuntando a un archivo que ya no está.
 */
async function emptyUploads(uploadsDir: string): Promise<void> {
  const absolute = join(process.cwd(), uploadsDir);
  const entries = await readdir(absolute).catch(() => []);
  await Promise.all(entries.map((entry) => rm(join(absolute, entry), { recursive: true, force: true })));
}

/**
 * Deja explícito en el log qué hizo esta corrida. Un salto silencioso en el
 * arranque del contenedor se confunde con una falla del seed, que es
 * justamente lo que quien evalúa está mirando en ese momento.
 */
function logReport(report: SeedReport): void {
  const created = report.users.created + report.chats.created + report.messages.created;
  const cuantos = (n: number, singular: string) => `${n} ${n === 1 ? singular : `${singular}s`}`;
  const detail = (pick: (c: SeedCount) => number) =>
    [
      cuantos(pick(report.users), 'usuario'),
      cuantos(pick(report.chats), 'chat'),
      cuantos(pick(report.messages), 'mensaje'),
    ].join(', ');

  if (created === 0) {
    console.log(`Seed: los datos de prueba ya estaban (${detail((c) => c.existing)}). No se modificó nada.`);
  } else {
    console.log(
      `Seed: creados ${detail((c) => c.created)}. Ya existían: ${detail((c) => c.existing)}.`,
    );
  }

  console.log(`Credenciales de prueba (mismo password para las tres: "${PASSWORD}"):`);
  for (const user of USERS) {
    console.log(`  - ${user.email} (${user.role})`);
  }
  console.log('Para volver a un estado limpio conocido: npm run seed:reset');
}

// Solo siembra si este archivo es el que se ejecutó (`node dist/seed.js`), no
// cuando se lo importa — que es lo que hace el test de `test/seed.e2e-spec.ts`.
const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (import.meta.url === entrypoint) {
  await seed({ force: process.argv.includes('--force') });
}
