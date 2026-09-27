import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatsModule } from '../chats/chats.module.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import { PresenceService } from './presence.service.js';
import { RealtimeGateway } from './realtime.gateway.js';

/**
 * Registra su propio JwtModule (mismo secreto que AuthModule, leído del
 * ConfigService) para validar el handshake del socket sin acoplarse a
 * AuthModule, que no exporta el JwtModule. Toma el modelo de User directo de
 * Mongoose en vez de UsersModule: así UsersModule puede importar este módulo
 * (para emitir el cambio manual de estado) sin que se arme un ciclo.
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
      }),
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ChatsModule,
  ],
  providers: [RealtimeGateway, PresenceService],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
