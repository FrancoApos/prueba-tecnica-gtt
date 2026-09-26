import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export type ConnectionStatus = 'online' | 'offline';
export type UserRole = 'user' | 'admin';

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  /** Nunca se incluye en una query por default (`select: false`) — hay que pedirlo explícito con `.select('+passwordHash')`. */
  @Prop({ type: String, required: true, select: false })
  passwordHash!: string;

  @Prop({ type: String, required: true, trim: true })
  firstName!: string;

  @Prop({ type: String, required: true, trim: true })
  lastName!: string;

  @Prop({ type: Date, required: true })
  birthDate!: Date;

  @Prop({ type: String, required: true, trim: true })
  phone!: string;

  @Prop({ type: String, default: null })
  avatarUrl!: string | null;

  @Prop({ type: String, enum: ['online', 'offline'], default: 'offline' })
  status!: ConnectionStatus;

  @Prop({ type: Date, default: null })
  lastSeenAt!: Date | null;

  /**
   * No expuesto en `CreateUserDto` a propósito: el alta pública (`POST /users`)
   * nunca puede setear el rol — siempre nace `'user'`. El único `admin` de la
   * app se crea vía seed (`src/seed.ts`), no hay endpoint para promoverlo.
   */
  @Prop({ type: String, enum: ['user', 'admin'], default: 'user' })
  role!: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);

/** El índice único de `email` ya lo crea `unique: true` en el @Prop de arriba. */
UserSchema.index({ firstName: 1, lastName: 1 });
