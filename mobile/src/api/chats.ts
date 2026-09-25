import type { Chat } from '@/src/types/api';
import { apiClient } from './client';

export function listChats(): Promise<Chat[]> {
  return apiClient.get<Chat[]>('/chats');
}

export function createChat(participantId: string): Promise<Chat> {
  return apiClient.post<Chat>('/chats', { participantId });
}
