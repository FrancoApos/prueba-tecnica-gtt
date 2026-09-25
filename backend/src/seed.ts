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
 * 2 usuarios, el chat entre ellos y algunos mensajes. Ver credenciales
 * impresas al final y en el README.
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
  console.log('Seed OK. Credenciales de prueba (password para ambas: "Sup3rSecret!"):');
  // eslint-disable-next-line no-console
  console.log('  - ana@example.com');
  // eslint-disable-next-line no-console
  console.log('  - bruno@example.com');

  await app.close();
}

await seed();
