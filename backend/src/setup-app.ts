import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

/**
 * Configuración compartida entre `main.ts` (runtime real) y los tests e2e,
 * para que un test ejercite exactamente el mismo comportamiento que
 * producción (validaciones, shape de errores, CORS, estáticos).
 */
export function setupApp(app: NestExpressApplication): void {
  const configService = app.get(ConfigService);

  const uploadsDir = configService.get<string>('uploadsDir') ?? 'uploads';
  mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(join(process.cwd(), uploadsDir), { prefix: '/uploads/' });

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
