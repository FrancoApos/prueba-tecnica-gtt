import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type ChatDocument = HydratedDocument<Chat>;

@Schema({ _id: false })
export class LastMessagePreview {
  @Prop({ type: String, default: null })
  content!: string | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  senderId!: Types.ObjectId;

  @Prop({ type: Date, required: true })
  sentAt!: Date;
}

export const LastMessagePreviewSchema = SchemaFactory.createForClass(LastMessagePreview);

@Schema({ timestamps: true })
export class Chat {
  /**
   * Siempre 2 elementos: la app solo soporta chats 1 a 1.
   * Es un array (en vez de userA/userB) porque es el modelado idiomático
   * de Mongo para esto — ver docs/DATA_MODEL.md.
   */
  @Prop({ type: [MongooseSchema.Types.ObjectId], ref: 'User', required: true })
  participants!: Types.ObjectId[];

  /** `[idMenor, idMayor].join('_')` — reemplaza el UNIQUE(par) que no existe en Mongo. */
  @Prop({ type: String, required: true, unique: true })
  participantsKey!: string;

  /** Copia denormalizada del último mensaje, para no joinear `messages` al listar chats. */
  @Prop({ type: LastMessagePreviewSchema, default: null })
  lastMessage!: LastMessagePreview | null;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);

/** El índice único de `participantsKey` ya lo crea `unique: true` en el @Prop de arriba. */
ChatSchema.index({ participants: 1 });
