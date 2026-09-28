import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { Module, UnsupportedMediaTypeException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { RealtimeModule } from '../realtime/realtime.module.js';
import {
  AVATARS_SUBDIR,
  AVATAR_ACCEPTED_MIMES,
  AVATAR_EXTENSION_BY_MIME,
  AVATAR_MAX_BYTES,
} from './avatar-storage.js';
import { User, UserSchema } from './schemas/user.schema.js';
import { AvatarsController } from './controllers/avatars.controller.js';
import { UsersController } from './controllers/users.controller.js';
import { UsersService } from './services/users.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    RealtimeModule,
    /**
     * Config de multer propia de este módulo (`MessagesModule` registra la
     * suya para los adjuntos, con otra carpeta, otro límite y sin filtro de
     * tipo). Un avatar es más chico, tiene que ser una imagen, y se guarda en
     * `uploads/avatars/` — ver `avatar-storage.ts`.
     */
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        storage: diskStorage({
          destination: join(configService.get<string>('uploadsDir') ?? 'uploads', AVATARS_SUBDIR),
          // La extensión sale del mime que pasó el filtro, no del nombre que
          // mandó el cliente: así lo que queda en disco nunca es un `.html` o
          // un `.svg` disfrazado.
          filename: (_req, file, callback) => {
            callback(null, `${randomUUID()}${AVATAR_EXTENSION_BY_MIME[file.mimetype]}`);
          },
        }),
        fileFilter: (_req, file, callback) => {
          if (!AVATAR_EXTENSION_BY_MIME[file.mimetype]) {
            callback(
              new UnsupportedMediaTypeException(
                `La foto tiene que ser una imagen ${AVATAR_ACCEPTED_MIMES.join(', ')}`,
              ),
              false,
            );
            return;
          }
          callback(null, true);
        },
        limits: { fileSize: AVATAR_MAX_BYTES },
      }),
    }),
  ],
  controllers: [UsersController, AvatarsController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
