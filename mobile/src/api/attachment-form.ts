import type { OutgoingAttachment } from './messages';

/**
 * Adjunta el archivo al FormData en runtime nativo.
 *
 * Dos caminos descartados antes de llegar a este:
 *
 * 1. El shorthand de RN (`form.append('file', { uri, name, type })`) falla con
 *    "Unsupported FormDataPart implementation": Expo reemplaza el `fetch` global
 *    por `expo/fetch`, que serializa el multipart en JS
 *    (`expo/src/winter/fetch/convertFormData.ts`) y solo entiende partes `string`,
 *    `Blob` o algo con `.bytes()` — un `{ uri }` no es ninguna de las tres.
 *
 * 2. `new File([blob], name, { type })` explota con "Cannot assign to property
 *    'name' which has only a getter". Expo también parchea `FormData.prototype.append`
 *    (`expo/src/winter/FormData.ts`, `normalizeArgs`): si la parte es un Blob sin
 *    `name` *propio*, le asigna uno. En el `File` de RN (`Libraries/Blob/File.js`)
 *    `name` es un getter del **prototipo**, así que no hay descriptor propio, la
 *    asignación sube por la cadena de prototipos, encuentra el accessor sin setter
 *    y tira TypeError.
 *
 * Por eso acá se manda un `Blob` pelado — cuyo prototipo no tiene `name`, así que
 * la asignación crea una propiedad propia sin problema — con el nombre puesto de
 * las dos formas que los serializadores leen: como propiedad propia (lo que mira
 * el `getParts()` de RN) y como tercer argumento de `append()`, que es la forma
 * estándar y la que usa el parche de Expo. El `Blob` se re-envuelve con el
 * `mimeType` del picker porque el que sale de `fetch('file://...')` no es confiable.
 */
export async function appendAttachment(form: FormData, attachment: OutgoingAttachment): Promise<void> {
  const response = await fetch(attachment.uri);
  const blob = await response.blob();
  const file = new Blob([blob], { type: attachment.mimeType });
  Object.assign(file, { name: attachment.name });
  form.append('file', file, attachment.name);
}
