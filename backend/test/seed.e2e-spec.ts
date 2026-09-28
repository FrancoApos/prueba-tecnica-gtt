import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import type { Model } from 'mongoose';
import { AppModule } from '../src/app.module.js';
import { Chat, type ChatDocument } from '../src/chats/schemas/chat.schema.js';
import { Message, type MessageDocument } from '../src/messages/schemas/message.schema.js';
import { User, type UserDocument } from '../src/users/schemas/user.schema.js';
import { seed } from '../src/seed.js';

/**
 * El seed corre en **cada arranque** del contenedor (ver el `command` del
 * `docker-compose.yml`), así que su idempotencia no es un detalle: si no la
 * tuviera, reiniciar el contenedor borraría lo que quien está probando la app
 * acabara de crear, y se leería como que la persistencia no funciona.
 *
 * Por eso se cubren las dos ramas — que siembre en una base vacía, y que sea
 * un no-op sobre una base ya poblada — contra un MongoDB real en memoria, que
 * es el único lugar donde el upsert por clave natural se puede verificar de
 * verdad (un mock del modelo probaría el mock, no el comportamiento).
 */
describe('Seed (e2e)', () => {
  let mongod: MongoMemoryServer;
  let userModel: Model<UserDocument>;
  let chatModel: Model<ChatDocument>;
  let messageModel: Model<MessageDocument>;
  let close: () => Promise<void>;

  // Carpeta de subidas propia: el caso de `--force` vacía `UPLOADS_DIR`, y con
  // la default (`uploads`) le borraría los archivos por debajo al spec de
  // adjuntos/avatares, que corre en paralelo sobre la misma carpeta — y, peor,
  // a quien tuviera el backend corriendo en local.
  const UPLOADS_DIR = 'uploads-e2e-seed';

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'chat-app-seed' } });
    process.env.MONGODB_URI = mongod.getUri('chat-app-seed');
    process.env.JWT_SECRET = 'seed-test-secret';
    process.env.UPLOADS_DIR = UPLOADS_DIR;

    // Contexto propio, solo para poder mirar las colecciones desde afuera:
    // `seed()` abre y cierra el suyo en cada corrida.
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = await moduleRef.createNestApplication().init();
    userModel = app.get(getModelToken(User.name));
    chatModel = app.get(getModelToken(Chat.name));
    messageModel = app.get(getModelToken(Message.name));
    close = () => app.close();
  }, 60_000);

  afterAll(async () => {
    await close();
    await mongod.stop();
    await rm(join(process.cwd(), UPLOADS_DIR), { recursive: true, force: true });
  });

  async function counts() {
    const [users, chats, messages] = await Promise.all([
      userModel.countDocuments(),
      chatModel.countDocuments(),
      messageModel.countDocuments(),
    ]);
    return { users, chats, messages };
  }

  it('siembra los datos de prueba en una base vacía', async () => {
    const report = await seed();

    expect(report.users).toEqual({ created: 3, existing: 0 });
    expect(report.chats).toEqual({ created: 1, existing: 0 });
    expect(report.messages).toEqual({ created: 3, existing: 0 });
    expect(await counts()).toEqual({ users: 3, chats: 1, messages: 3 });

    // El admin es el único que no puede nacer del alta pública.
    const admin = await userModel.findOne({ email: 'admin@example.com' });
    expect(admin?.role).toBe('admin');

    // El preview del chat queda apuntando al último mensaje de la conversación.
    const chat = await chatModel.findOne({});
    expect(chat?.lastMessage?.content).toBe('Bien también, arrancando con la prueba técnica 🚀');
  });

  it('re-correrlo no duplica nada ni toca lo que ya estaba', async () => {
    const antes = await counts();

    const report = await seed();

    expect(report.users).toEqual({ created: 0, existing: 3 });
    expect(report.chats).toEqual({ created: 0, existing: 1 });
    expect(report.messages).toEqual({ created: 0, existing: 3 });
    expect(await counts()).toEqual(antes);
  });

  it('no se lleva puesto lo que se creó desde la app (el caso del reinicio del contenedor)', async () => {
    // Simula a quien está evaluando: se da de alta y manda un mensaje.
    const nuevo = await userModel.create({
      email: 'evaluador@example.com',
      passwordHash: 'hash-irrelevante-para-este-test',
      firstName: 'Eva',
      lastName: 'Luadora',
      birthDate: new Date('1990-05-05'),
      phone: '+5491199887766',
    });
    const chat = await chatModel.findOne({});
    const suyo = await messageModel.create({
      chatId: chat!._id,
      senderId: nuevo._id,
      content: 'Mensaje escrito desde la app, después del primer seed',
      attachment: null,
      sentAt: new Date(),
    });

    await seed();

    expect(await userModel.findById(nuevo._id)).not.toBeNull();
    expect(await messageModel.findById(suyo._id)).not.toBeNull();
    expect(await counts()).toEqual({ users: 4, chats: 1, messages: 4 });

    // Y el preview del chat sigue el mensaje más nuevo real, no el del seed.
    const actualizado = await chatModel.findById(chat!._id);
    expect(actualizado?.lastMessage?.content).toBe('Mensaje escrito desde la app, después del primer seed');
  });

  it('con --force vacía todo y vuelve al estado limpio conocido', async () => {
    const report = await seed({ force: true });

    expect(report.force).toBe(true);
    expect(report.users).toEqual({ created: 3, existing: 0 });
    expect(await counts()).toEqual({ users: 3, chats: 1, messages: 3 });
    expect(await userModel.findOne({ email: 'evaluador@example.com' })).toBeNull();
  });
});
