import type { OutgoingAttachment } from './messages';

/**
 * Adjunta el archivo al FormData en runtime nativo: el FormData de React
 * Native acepta este shape `{ uri, name, type }` en lugar de un Blob real y
 * se encarga de leer el archivo del filesystem. La variante web vive en
 * `attachment-form.web.ts`, donde ese shape no existe.
 */
export function appendAttachment(form: FormData, attachment: OutgoingAttachment): Promise<void> {
  form.append('file', {
    uri: attachment.uri,
    name: attachment.name,
    type: attachment.mimeType,
  } as unknown as Blob);
  return Promise.resolve();
}
