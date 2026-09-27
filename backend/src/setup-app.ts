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
  app.useStaticAssets(join(process.cwd(), uploadsDir), {
    prefix: '/uploads/',
    // Los adjuntos no tienen restricción de tipo (la consigna solo pide poder
    // subir imagen o archivo): sin esto, un .html/.svg subido como adjunto se
    // serviría con su Content-Type real y, abierto directo en un browser, un
    // <script> embebido correría en el origen de la API (XSS almacenado). Con
    // `attachment` el browser siempre lo descarga en vez de renderizarlo —
    // no afecta a las imágenes, que la app carga como <Image>/subrecurso, no
    // como navegación de página (ahí el navegador ignora Content-Disposition).
    setHeaders: (res) => {
      res.setHeader('Content-Disposition', 'attachment');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  });

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
