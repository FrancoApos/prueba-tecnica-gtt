import type { Message, PaginatedResult } from '@/src/types/api';
import { appendAttachment } from './attachment-form';
import { apiClient } from './client';

export function listMessages(chatId: string, page = 1, limit = 30): Promise<PaginatedResult<Message>> {
  return apiClient.get<PaginatedResult<Message>>(`/chats/${chatId}/messages?page=${page}&limit=${limit}`);
}

export interface OutgoingAttachment {
  uri: string;
  name: string;
  mimeType: string;
}

export async function sendMessage(
  chatId: string,
  content: string | undefined,
  attachment?: OutgoingAttachment,
): Promise<Message> {
  const form = new FormData();
  if (content) {
    form.append('content', content);
  }
  if (attachment) {
    // El armado del archivo difiere entre nativo y web (ver attachment-form.ts).
    await appendAttachment(form, attachment);
  }
  return apiClient.post<Message>(`/chats/${chatId}/messages`, form, { isFormData: true });
}
