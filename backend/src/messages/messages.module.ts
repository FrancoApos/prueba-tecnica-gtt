import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ChatsModule } from '../chats/chats.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { AttachmentsController } from './controllers/attachments.controller.js';
import { MessagesController } from './controllers/messages.controller.js';
import { MessagesService } from './services/messages.service.js';
import { Message, MessageSchema } from './schemas/message.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    ChatsModule,
    RealtimeModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        storage: diskStorage({
          destination: configService.get<string>('uploadsDir') ?? 'uploads',
          filename: (_req, file, callback) => {
            callback(null, `${randomUUID()}${extname(file.originalname)}`);
          },
        }),
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      }),
    }),
  ],
  controllers: [MessagesController, AttachmentsController],
  providers: [MessagesService],
})
export class MessagesModule {}
