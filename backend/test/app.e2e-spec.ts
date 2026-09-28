import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
// El server HTTP que expone `getHttpServer()`. Antes esto importaba `App` de
// 'supertest/types', que con `moduleResolution: nodenext` no resuelve:
// supertest no declara ese subpath en sus `exports` (venía del template de
// Nest, que usaba la resolución clásica). `http.Server` es el tipo real.
import type { Server } from 'node:http';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/setup-app.js';

/**
 * Levanta la app completa (mismos pipes/filtros/CORS que producción, ver
 * setup-app.ts) contra un MongoDB en memoria — reproducible en cualquier
 * máquina/CI sin depender de Docker ni de un Mongo externo corriendo.
 */
describe('Chat app (e2e)', () => {
  let mongod: MongoMemoryServer;
  let app: INestApplication<Server>;

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

  it('sube un adjunto y lo devuelve con su nombre original, no con el UUID del disco', async () => {
    const server = app.getHttpServer();

    const cuentas = [
      { email: 'dora.e2e@example.com', firstName: 'Dora', phone: '+5491133445566' },
      { email: 'emilio.e2e@example.com', firstName: 'Emilio', phone: '+5491155667788' },
    ];
    for (const { email, firstName, phone } of cuentas) {
      await request(server)
        .post('/users')
        .send({
          email,
          password: 'Sup3rSecret!',
          firstName,
          lastName: 'Adjunto',
          birthDate: '1990-06-15',
          phone,
        })
        .expect(201);
    }

    const login = await request(server)
      .post('/auth/login')
      .send({ email: 'dora.e2e@example.com', password: 'Sup3rSecret!' })
      .expect(200);
    const token = login.body.accessToken as string;

    const emilio = await request(server)
      .get('/users?search=emilio.e2e')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const chat = await request(server)
      .post('/chats')
      .set('Authorization', `Bearer ${token}`)
      .send({ participantId: emilio.body.data[0].id })
      .expect(201);

    // `expo/fetch` manda el filename percent-encodeado (ver `decodeAttachmentName`
    // en messages.service.ts), así que se sube igual que lo haría el cliente real.
    const message = await request(server)
      .post(`/chats/${chat.body.id}/messages`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('contenido-docx-de-prueba'), {
        filename: 'Informe%20final%20a%C3%B1o.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      .expect(201);

    // El nombre se guarda decodificado...
    expect(message.body.attachment.filename).toBe('Informe final año.docx');
    // ...y en disco queda con un UUID, que es lo que viaja en la URL.
    expect(message.body.attachment.url).toMatch(/^\/uploads\/[0-9a-f-]{36}\.docx$/);

    // La descarga tiene que llevar el nombre original en el Content-Disposition,
    // si no el browser usa el último segmento de la URL (el UUID).
    const download = await request(server).get(message.body.attachment.url).responseType('blob').expect(200);
    const disposition = download.headers['content-disposition'] as string;
    expect(disposition).toContain('attachment');
    // Para un nombre representable en latin1 express usa `filename="…"`; recién
    // fuera de ese juego de caracteres agrega el `filename*=UTF-8''…` de RFC 6266.
    // Lo que importa es que viaje el nombre original y no el UUID del disco.
    expect(disposition).toContain('filename="Informe final año.docx"');
    expect(disposition).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/);
    expect(download.headers['x-content-type-options']).toBe('nosniff');
    expect(download.body.toString()).toBe('contenido-docx-de-prueba');

    await request(server).get('/uploads/no-existe.docx').expect(404);
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

    // Una contraseña más corta que la política de alta también es 401, no un
    // 400 de validación: en login el largo no se valida, así que el rechazo no
    // distingue "formato inválido" de "credencial incorrecta".
    await request(server)
      .post('/auth/login')
      .send({ email: 'ana.e2e@example.com', password: 'corta' })
      .expect(401);

    // Sin contraseña sí es 400: no hay nada que comparar.
    await request(server)
      .post('/auth/login')
      .send({ email: 'ana.e2e@example.com', password: '' })
      .expect(400);

    const login = await request(server)
      .post('/auth/login')
      .send({ email: 'ana.e2e@example.com', password: 'Sup3rSecret!' })
      .expect(200);
    const token = login.body.accessToken as string;

    // Rutas protegidas sin token -> 401, con la misma forma de `error` que el
    // resto de la API (Passport lo daba como "UNAUTHORIZED" y en inglés).
    const sinToken = await request(server).get('/chats').expect(401);
    expect(sinToken.body.error).toBe('Unauthorized');
    expect(sinToken.body.message).toBe('Necesitás iniciar sesión');

    // Un id con formato inválido es culpa del cliente, no del servidor: tiene
    // que salir 400 y no el 500 que daba el CastError de Mongoose sin manejar.
    const badId = await request(server)
      .get('/users/no-es-un-objectid')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
    expect(badId.body.error).toBe('Bad Request');

    await request(server)
      .get('/chats/no-es-un-objectid/messages')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

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
