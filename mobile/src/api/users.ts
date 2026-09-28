import type { ConnectionStatus, PaginatedResult, User } from '@/src/types/api';
import { apiClient } from './client';

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
  avatarUrl?: string;
  status?: ConnectionStatus;
}

export function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  return apiClient.patch<User>(`/users/${id}`, input);
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
