import type { OutgoingAttachment } from './messages';

/**
 * Variante web de `attachment-form.ts` (ver ahí el por qué del split).
 *
 * En el browser los pickers devuelven una URI `blob:`/`data:`, y el FormData
 * estándar necesita un Blob de verdad: se lee la URI y se adjunta como File
 * para que multer reciba el nombre y el mime correctos.
 */
export async function appendAttachment(form: FormData, attachment: OutgoingAttachment): Promise<void> {
  const response = await fetch(attachment.uri);
  const blob = await response.blob();
  form.append('file', new File([blob], attachment.name, { type: attachment.mimeType }));
}
