import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ _id: false })
export class MessageAttachment {
  @Prop({ type: String, required: true })
  url!: string;

  @Prop({ type: String, required: true })
  filename!: string;

  @Prop({ type: String, required: true })
  mimeType!: string;

  @Prop({ type: Number, required: true })
  size!: number;
}

export const MessageAttachmentSchema = SchemaFactory.createForClass(MessageAttachment);

@Schema({ timestamps: { createdAt: 'createdAt', updatedAt: false } })
export class Message {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Chat', required: true })
  chatId!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  senderId!: Types.ObjectId;

  /** Puede ser null si el mensaje es solo un adjunto. */
  @Prop({ type: String, default: null, trim: true })
  content!: string | null;

  @Prop({ type: MessageAttachmentSchema, default: null })
  attachment!: MessageAttachment | null;

  @Prop({ type: Date, required: true, default: () => new Date() })
  sentAt!: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

/** Sostiene la query de la pantalla de conversación: mensajes de un chat, ordenados, paginados. */
MessageSchema.index({ chatId: 1, sentAt: 1 });
