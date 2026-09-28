import { rm } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import type { PaginatedResultDto } from '../../common/dto/paginated-result.dto.js';
import {
  AVATARS_SUBDIR,
  AVATAR_MIME_BY_EXTENSION,
  AVATAR_URL_PREFIX,
} from '../avatar-storage.js';
import { RealtimeGateway } from '../../realtime/realtime.gateway.js';
import { CreateUserDto } from '../dto/create-user.dto.js';
import { QueryUsersDto } from '../dto/query-users.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { UserResponseDto } from '../dto/user-response.dto.js';
import { User, type UserDocument } from '../schemas/user.schema.js';

const SALT_ROUNDS = 10;

/**
 * Escapa los metacaracteres de regex antes de armar el `$regex` del filtro de
 * texto. Sin esto, un `search` con un caracter como `(`, `[` o `\` (cosas que
 * un usuario real puede tipear — un apellido con paréntesis, etc.) rompe la
 * query con un regex inválido; con más mala suerte, un patrón armado a
 * propósito puede causar backtracking catastrófico (ReDoS). Al escapar, el
 * término de búsqueda siempre se interpreta como texto literal.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Lo mínimo que necesita el servicio de un archivo recién subido por multer. */
export interface UploadedAvatar {
  /** Nombre con el que quedó en disco: el UUID que generó multer. */
  filename: string;
}

/** Lo que necesita `AvatarsController` para servir una foto de perfil. */
export interface StoredAvatar {
  storedName: string;
  mimeType: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const created = await this.userModel.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      birthDate: new Date(dto.birthDate),
      phone: dto.phone,
    });

    return UserResponseDto.fromDocument(created);
  }

  async findAll(query: QueryUsersDto): Promise<PaginatedResultDto<UserResponseDto>> {
    const searchPattern = query.search ? escapeRegExp(query.search) : null;
    const filter = searchPattern
      ? {
          $or: [
            { firstName: { $regex: searchPattern, $options: 'i' } },
            { lastName: { $regex: searchPattern, $options: 'i' } },
            { email: { $regex: searchPattern, $options: 'i' } },
          ],
        }
      : {};

    const skip = (query.page - 1) * query.limit;
    const sort: Record<string, 1 | -1> = { [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 };

    const [docs, total] = await Promise.all([
      this.userModel.find(filter).sort(sort).skip(skip).limit(query.limit).exec(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      data: docs.map((doc) => UserResponseDto.fromDocument(doc)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.findById(id);
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.birthDate !== undefined) user.birthDate = new Date(dto.birthDate);
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.status !== undefined) {
      user.status = dto.status;
      user.lastSeenAt = new Date();
    }

    await user.save();

    if (dto.status !== undefined) {
      // El toggle manual del perfil también tiene que verse en vivo del otro
      // lado, igual que la presencia automática del socket. Si el emit falla,
      // el PATCH igual fue exitoso: no se propaga el error.
      await this.realtimeGateway.emitPresenceChanged(id).catch(() => {});
    }

    return UserResponseDto.fromDocument(user);
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Usuario no encontrado');
    }
    // Sin esto, borrar la cuenta deja la foto en disco para siempre: ya no hay
    // ningún documento que la referencie, así que nadie la va a limpiar después.
    await this.deleteAvatarFile(result.avatarUrl);
  }

  /**
   * Guarda la foto recién subida como avatar del usuario y borra la anterior.
   *
   * El archivo ya está en disco cuando esto corre (multer escribe antes de que
   * el handler se ejecute), así que el orden importa: primero se persiste la
   * URL nueva, recién después se borra la vieja. Al revés, si el `save()`
   * fallara, el usuario quedaría apuntando a un archivo que ya no existe.
   */
  async setAvatar(id: string, file: UploadedAvatar): Promise<UserResponseDto> {
    const user = await this.findById(id).catch(async (error: unknown) => {
      // El usuario no existe (o el id es inválido) pero el archivo ya se
      // escribió: se limpia para no dejarlo huérfano.
      await this.deleteAvatarFile(`${AVATAR_URL_PREFIX}${file.filename}`);
      throw error;
    });

    const previous = user.avatarUrl;
    user.avatarUrl = `${AVATAR_URL_PREFIX}${file.filename}`;
    await user.save();

    await this.deleteAvatarFile(previous);
    return UserResponseDto.fromDocument(user);
  }

  /** Quita la foto de perfil (vuelve a las iniciales) y borra el archivo. */
  async removeAvatar(id: string): Promise<UserResponseDto> {
    const user = await this.findById(id);
    const previous = user.avatarUrl;
    user.avatarUrl = null;
    await user.save();

    await this.deleteAvatarFile(previous);
    return UserResponseDto.fromDocument(user);
  }

  /**
   * Resuelve una foto a partir del nombre con el que quedó en disco.
   *
   * Igual que `MessagesService.findAttachment`, el `storedName` que devuelve
   * sale del valor que guardó el propio servidor y no del segmento crudo de la
   * request: así el controller no puede terminar armando un path fuera de
   * `uploads/avatars/` a partir de un `..%2f` en la URL. Que el archivo tenga
   * que estar referenciado por un usuario es, además, lo que evita servir
   * cualquier cosa que alguien haya dejado en la carpeta.
   */
  async findAvatar(storedName: string): Promise<StoredAvatar> {
    const user = await this.userModel
      .findOne({ avatarUrl: `${AVATAR_URL_PREFIX}${storedName}` })
      .exec();
    const mimeType = user?.avatarUrl
      ? AVATAR_MIME_BY_EXTENSION[extname(user.avatarUrl).toLowerCase()]
      : undefined;

    if (!user?.avatarUrl || !mimeType) {
      throw new NotFoundException('Foto de perfil no encontrada');
    }

    return { storedName: basename(user.avatarUrl), mimeType };
  }

  /** Ruta absoluta de la carpeta donde viven las fotos de perfil. */
  avatarsDirectory(): string {
    return join(process.cwd(), this.configService.get<string>('uploadsDir') ?? 'uploads', AVATARS_SUBDIR);
  }

  /**
   * Borra el archivo detrás de un `avatarUrl`, si lo hay.
   *
   * No propaga errores a propósito: que no se pueda borrar un archivo viejo no
   * tiene que hacer fallar el cambio de foto, que ya está persistido. El costo
   * de fallar en silencio es un archivo huérfano; el de propagar sería un 500
   * sobre una operación que salió bien.
   */
  private async deleteAvatarFile(avatarUrl: string | null): Promise<void> {
    if (!avatarUrl?.startsWith(AVATAR_URL_PREFIX)) {
      return;
    }
    await rm(join(this.avatarsDirectory(), basename(avatarUrl)), { force: true }).catch(() => {});
  }
}
