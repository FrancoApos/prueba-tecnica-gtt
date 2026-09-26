export type ConnectionStatus = 'online' | 'offline';
export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  avatarUrl: string | null;
  status: ConnectionStatus;
  lastSeenAt: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface ChatContact {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  status: ConnectionStatus;
}

export interface LastMessagePreview {
  content: string | null;
  senderId: string;
  sentAt: string;
}

export interface Chat {
  id: string;
  contact: ChatContact;
  lastMessage: LastMessagePreview | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageAttachment {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string | null;
  attachment: MessageAttachment | null;
  sentAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}
