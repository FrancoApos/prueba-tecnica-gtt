import type { AuthResponse } from '@/src/types/api';
import { apiClient } from './client';

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/auth/login', { email, password }, { auth: false });
}
