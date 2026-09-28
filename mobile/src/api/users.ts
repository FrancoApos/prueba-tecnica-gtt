import type { ConnectionStatus, PaginatedResult, User } from '@/src/types/api';
import { appendAttachment } from './attachment-form';
import { apiClient } from './client';
import type { OutgoingAttachment } from './messages';

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
}

export function createUser(input: CreateUserInput): Promise<User> {
  return apiClient.post<User>('/users', input, { auth: false });
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  phone?: string;
  status?: ConnectionStatus;
}

export function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  return apiClient.patch<User>(`/users/${id}`, input);
}

/**
 * Sube la foto de perfil. La `avatarUrl` no se manda como campo de texto: el
 * backend la arma él mismo a partir del archivo que guarda (ver
 * `docs/DECISIONS.md`), así que esto devuelve el usuario ya actualizado.
 *
 * Reusa `appendAttachment` de los adjuntos de mensajes porque es el único
 * armado de FormData que funciona en los dos runtimes (ver ese archivo: el
 * `File` de React Native choca con el parche de FormData de Expo).
 */
export async function uploadAvatar(id: string, photo: OutgoingAttachment): Promise<User> {
  const form = new FormData();
  await appendAttachment(form, photo);
  return apiClient.post<User>(`/users/${id}/avatar`, form, { isFormData: true });
}

/** Quita la foto de perfil: vuelve a las iniciales y borra el archivo del server. */
export function deleteAvatar(id: string): Promise<User> {
  return apiClient.delete<User>(`/users/${id}/avatar`);
}

/** Los mismos campos que acepta `SORTABLE_FIELDS` en el backend (QueryUsersDto). */
export type UserSortField = 'firstName' | 'lastName' | 'email' | 'createdAt' | 'lastSeenAt';

export interface ListUsersParams {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: UserSortField;
  sortOrder?: 'asc' | 'desc';
}

export function listUsers(params: ListUsersParams = {}): Promise<PaginatedResult<User>> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  // Si no se mandan, el backend aplica su propio default (lastName asc).
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  const qs = query.toString();
  return apiClient.get<PaginatedResult<User>>(`/users${qs ? `?${qs}` : ''}`);
}

export function getUser(id: string): Promise<User> {
  return apiClient.get<User>(`/users/${id}`);
}

/** Solo el backend decide si esto se permite (dueño, o rol admin) — ver RolesGuard. */
export function deleteUser(id: string): Promise<void> {
  return apiClient.delete<void>(`/users/${id}`);
}
