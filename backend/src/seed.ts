import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from './app.module.js';
import { Chat, type ChatDocument } from './chats/schemas/chat.schema.js';
import { Message, type MessageDocument } from './messages/schemas/message.schema.js';
import { User, type UserDocument } from './users/schemas/user.schema.js';
import { UsersService } from './users/users.service.js';

/**
 * Carga datos de prueba para poder probar el flujo completo sin usar la UI:
 * 3 usuarios (2 "user" + 1 "admin"), el chat entre los dos primeros y
 * algunos mensajes. Ver credenciales impresas al final y en el README.
 *
 * El rol "admin" no se puede pedir vía `POST /users` (no está en el DTO
 * público, para que nadie se auto-promueva) — acá se setea directo sobre el
 * documento después de crearlo, que es la única forma de tener un admin en
 * esta app (no hay endpoint para promover usuarios, ver docs/DECISIONS.md).
 *
 * Uso: npm run seed (con MONGODB_URI apuntando a una base vacía o de prueba).
 */
async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);
  const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
  const chatModel = app.get<Model<ChatDocument>>(getModelToken(Chat.name));
  const messageModel = app.get<Model<MessageDocument>>(getModelToken(Message.name));

  await Promise.all([userModel.deleteMany({}), chatModel.deleteMany({}), messageModel.deleteMany({})]);

  const ana = await usersService.create({
    email: 'ana@example.com',
    password: 'Sup3rSecret!',
    firstName: 'Ana',
    lastName: 'García',
    birthDate: '1995-03-20',
    phone: '+5491122334455',
  });

  const bruno = await usersService.create({
    email: 'bruno@example.com',
    password: 'Sup3rSecret!',
    firstName: 'Bruno',
    lastName: 'Díaz',
    birthDate: '1993-07-11',
    phone: '+5491133445566',
  });

  const admin = await usersService.create({
    email: 'admin@example.com',
    password: 'Sup3rSecret!',
    firstName: 'Admin',
    lastName: 'Pulse',
    birthDate: '1990-01-01',
    phone: '+5491100000000',
  });
  await userModel.updateOne({ _id: admin.id }, { role: 'admin' });

  const participantsKey = [ana.id, bruno.id].sort().join('_');
  const chat = await chatModel.create({
    participants: [ana.id, bruno.id],
    participantsKey,
    lastMessage: null,
  });

  const now = Date.now();
  const messages = [
    { sender: ana.id, content: 'Hola Bruno! ¿Cómo va todo?', offsetMs: -1000 * 60 * 5 },
    { sender: bruno.id, content: 'Todo bien Ana, ¿y vos?', offsetMs: -1000 * 60 * 4 },
    { sender: ana.id, content: 'Bien también, arrancando con la prueba técnica 🚀', offsetMs: -1000 * 60 * 3 },
  ];

  for (const m of messages) {
    await messageModel.create({
      chatId: chat._id,
      senderId: m.sender,
      content: m.content,
      attachment: null,
      sentAt: new Date(now + m.offsetMs),
    });
  }

  const last = messages[messages.length - 1];
  await chatModel.updateOne(
    { _id: chat._id },
    { lastMessage: { content: last.content, senderId: last.sender, sentAt: new Date(now + last.offsetMs) } },
  );

  // eslint-disable-next-line no-console
  console.log('Seed OK. Credenciales de prueba (mismo password para las tres: "Sup3rSecret!"):');
  // eslint-disable-next-line no-console
  console.log('  - ana@example.com (user)');
  // eslint-disable-next-line no-console
  console.log('  - bruno@example.com (user)');
  // eslint-disable-next-line no-console
  console.log('  - admin@example.com (admin)');

  await app.close();
}

await seed();
