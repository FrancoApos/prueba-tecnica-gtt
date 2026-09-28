import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { AVATARS_SUBDIR } from './users/avatar-storage.js';

/**
 * Configuración compartida entre `main.ts` (runtime real) y los tests e2e,
 * para que un test ejercite exactamente el mismo comportamiento que
 * producción (validaciones, shape de errores, CORS, carpeta de adjuntos).
 */
export function setupApp(app: NestExpressApplication): void {
  const configService = app.get(ConfigService);

  // Se crean las carpetas de subidas por si no existen: multer escribe acá
  // (ver `messages.module.ts` para los adjuntos y `users.module.ts` para las
  // fotos de perfil) y falla si el destino no está. Los archivos NO se sirven
  // como estáticos — los sirven `AttachmentsController` y `AvatarsController`,
  // que son los que saben a qué documento pertenece cada uno.
  const uploadsDir = configService.get<string>('uploadsDir') ?? 'uploads';
  mkdirSync(join(uploadsDir, AVATARS_SUBDIR), { recursive: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: configService.get<string>('corsOrigin') });
}

export function setupSwagger(app: NestExpressApplication): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Chat App API')
    .setDescription('API REST de la prueba técnica: autenticación, usuarios, chats y mensajes.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);
}
