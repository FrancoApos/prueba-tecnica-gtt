import type { OutgoingAttachment } from './messages';

/**
 * Adjunta el archivo al FormData en runtime nativo.
 *
 * El shorthand documentado de RN (`form.append('file', { uri, name, type })`,
 * que deja que el bridge nativo lea el archivo por su cuenta) resultó frágil
 * en la práctica: con `expo-image-picker` funciona, pero con
 * `expo-document-picker` — probado con un .docx y un .pdf reales en un
 * iPhone físico, ambos casos — el bridge rechaza la parte con
 * "Unsupported FormDataPart implementation" incluso con una `uri` local
 * válida y no vacía. En vez de depender de ese camino, se lee el archivo acá
 * mismo con `fetch()` (RN soporta URIs `file://` en su XHR nativo) y se arma
 * un `File` real — mismo patrón que ya usa `attachment-form.web.ts`, sobre
 * el `Blob`/`File` que React Native expone como globals propios (ver
 * `Libraries/Core/setUpXHR.js`), no los del browser.
 */
export async function appendAttachment(form: FormData, attachment: OutgoingAttachment): Promise<void> {
  const response = await fetch(attachment.uri);
  const blob = await response.blob();
  form.append('file', new File([blob], attachment.name, { type: attachment.mimeType }));
}
