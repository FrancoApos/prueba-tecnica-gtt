import { API_URL } from '@/src/config';
import type { ApiErrorBody } from '@/src/types/api';
import { getAuthToken } from './token';

export class ApiError extends Error {
  statusCode: number;

  constructor(body: ApiErrorBody) {
    super(Array.isArray(body.message) ? body.message.join('. ') : body.message);
    this.name = 'ApiError';
    this.statusCode = body.statusCode;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** true si `body` ya es un FormData (adjuntos) — no se serializa ni se manda Content-Type manual. */
  isFormData?: boolean;
  /** false para endpoints públicos (login, alta de cuenta). Default true. */
  auth?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, isFormData = false, auth = true } = options;

  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError({
      statusCode: 0,
      error: 'Network Error',
      message: 'No pudimos conectar con el servidor. Revisá tu conexión.',
      path,
      timestamp: new Date().toISOString(),
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      json ?? {
        statusCode: response.status,
        error: 'Unknown Error',
        message: 'Ocurrió un error inesperado',
        path,
        timestamp: new Date().toISOString(),
      },
    );
  }

  return json as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, options?: Partial<RequestOptions>) =>
    request<T>(path, { method: 'POST', body, ...options }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
