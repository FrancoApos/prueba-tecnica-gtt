import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import type { PaginatedResultDto } from '../../common/dto/paginated-result.dto.js';
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

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

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
      avatarUrl: dto.avatarUrl ?? null,
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
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.status !== undefined) {
      user.status = dto.status;
      user.lastSeenAt = new Date();
    }

    await user.save();
    return UserResponseDto.fromDocument(user);
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }
}
