import type { Message, PaginatedResult } from '@/src/types/api';
import { apiClient } from './client';

export function listMessages(chatId: string, page = 1, limit = 30): Promise<PaginatedResult<Message>> {
  return apiClient.get<PaginatedResult<Message>>(`/chats/${chatId}/messages?page=${page}&limit=${limit}`);
}

export interface OutgoingAttachment {
  uri: string;
  name: string;
  mimeType: string;
}

export function sendMessage(
  chatId: string,
  content: string | undefined,
  attachment?: OutgoingAttachment,
): Promise<Message> {
  const form = new FormData();
  if (content) {
    form.append('content', content);
  }
  if (attachment) {
    // React Native's FormData acepta este shape de "archivo" en vez de un Blob real.
    form.append('file', {
      uri: attachment.uri,
      name: attachment.name,
      type: attachment.mimeType,
    } as unknown as Blob);
  }
  return apiClient.post<Message>(`/chats/${chatId}/messages`, form, { isFormData: true });
}
