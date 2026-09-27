import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/setup-app.js';

/**
 * Levanta la app completa (mismos pipes/filtros/CORS que producción, ver
 * setup-app.ts) contra un MongoDB en memoria — reproducible en cualquier
 * máquina/CI sin depender de Docker ni de un Mongo externo corriendo.
 */
describe('Chat app (e2e)', () => {
  let mongod: MongoMemoryServer;
  let app: INestApplication<App>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'chat-app-e2e' } });
    process.env.MONGODB_URI = mongod.getUri('chat-app-e2e');
    process.env.JWT_SECRET = 'e2e-test-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    setupApp(app as unknown as NestExpressApplication);
    await app.init();
  }, 60_000);

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  it('GET /health responde ok', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
  });

  it('recorre el flujo completo: alta de usuarios, login, chat, mensaje y control de acceso', async () => {
    const server = app.getHttpServer();

    const ana = await request(server)
      .post('/users')
      .send({
        email: 'ana.e2e@example.com',
        password: 'Sup3rSecret!',
        firstName: 'Ana',
        lastName: 'García',
        birthDate: '1995-03-20',
        phone: '+5491122334455',
      })
      .expect(201);

    const bruno = await request(server)
      .post('/users')
      .send({
        email: 'bruno.e2e@example.com',
        password: 'Sup3rSecret!',
        firstName: 'Bruno',
        lastName: 'Diaz',
        birthDate: '1993-07-11',
        phone: '+5491133445566',
      })
      .expect(201);

    // Email duplicado -> 409
    await request(server)
      .post('/users')
      .send({
        email: 'ana.e2e@example.com',
        password: 'Sup3rSecret!',
        firstName: 'Ana',
        lastName: 'Otra',
        birthDate: '1995-03-20',
        phone: '+5491122334455',
      })
      .expect(409);

    // Credenciales inválidas -> 401
    await request(server)
      .post('/auth/login')
      .send({ email: 'ana.e2e@example.com', password: 'incorrecta' })
      .expect(401);

    const login = await request(server)
      .post('/auth/login')
      .send({ email: 'ana.e2e@example.com', password: 'Sup3rSecret!' })
      .expect(200);
    const token = login.body.accessToken as string;

    // Rutas protegidas sin token -> 401
    await request(server).get('/chats').expect(401);

    // Autenticada, antes de crear nada: el listado arranca vacío (no es un
    // valor fijo devuelto sin filtrar por participante).
    const emptyChats = await request(server)
      .get('/chats')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(emptyChats.body).toEqual([]);

    const chat = await request(server)
      .post('/chats')
      .set('Authorization', `Bearer ${token}`)
      .send({ participantId: bruno.body.id })
      .expect(201);

    // Pedir el mismo chat de nuevo es idempotente
    const chatAgain = await request(server)
      .post('/chats')
      .set('Authorization', `Bearer ${token}`)
      .send({ participantId: bruno.body.id })
      .expect(201);
    expect(chatAgain.body.id).toBe(chat.body.id);

    await request(server)
      .post(`/chats/${chat.body.id}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Hola Bruno!' })
      .expect(201);

    const chatsList = await request(server)
      .get('/chats')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(chatsList.body[0].lastMessage.content).toBe('Hola Bruno!');

    const messages = await request(server)
      .get(`/chats/${chat.body.id}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(messages.body.total).toBe(1);
    expect(messages.body.data[0].senderId).toBe(ana.body.id);

    // Control de acceso sobre /users: cualquiera edita lo propio, nadie (sin rol admin) edita ni borra lo ajeno
    const brunoLogin = await request(server)
      .post('/auth/login')
      .send({ email: 'bruno.e2e@example.com', password: 'Sup3rSecret!' })
      .expect(200);
    const brunoToken = brunoLogin.body.accessToken as string;

    await request(server)
      .patch(`/users/${ana.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ phone: '+5491100001111' })
      .expect(200);

    await request(server)
      .patch(`/users/${ana.body.id}`)
      .set('Authorization', `Bearer ${brunoToken}`)
      .send({ phone: '+5491100002222' })
      .expect(403);

    await request(server)
      .delete(`/users/${ana.body.id}`)
      .set('Authorization', `Bearer ${brunoToken}`)
      .expect(403);

    // Un tercero (Carla) no puede ver mensajes de un chat del que no es parte
    await request(server)
      .post('/users')
      .send({
        email: 'carla.e2e@example.com',
        password: 'Sup3rSecret!',
        firstName: 'Carla',
        lastName: 'Ruiz',
        birthDate: '1998-01-05',
        phone: '+5491144556677',
      })
      .expect(201);
    const carlaLogin = await request(server)
      .post('/auth/login')
      .send({ email: 'carla.e2e@example.com', password: 'Sup3rSecret!' })
      .expect(200);

    await request(server)
      .get(`/chats/${chat.body.id}/messages`)
      .set('Authorization', `Bearer ${carlaLogin.body.accessToken}`)
      .expect(403);
  });
});
