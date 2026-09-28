/**
 * Reglas de almacenamiento de las fotos de perfil.
 *
 * Los avatares viven en su propia subcarpeta de `uploads/` y no se mezclan con
 * los adjuntos de mensajes: son de otro dueño (el usuario, no un mensaje) y
 * tienen otro ciclo de vida (se reemplazan y se borran con la cuenta).
 */

/** Subcarpeta dentro de `uploadsDir` donde multer escribe las fotos. */
export const AVATARS_SUBDIR = 'avatars';

/** Prefijo de la URL pública que se guarda en `user.avatarUrl`. */
export const AVATAR_URL_PREFIX = `/uploads/${AVATARS_SUBDIR}/`;

/** 5MB: una foto de perfil no necesita más, y el recorte del picker ya baja el peso. */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Allowlist de formatos, en las dos direcciones que hacen falta: al subir
 * (mime declarado → extensión con la que se guarda) y al servir (extensión del
 * archivo → Content-Type que se responde).
 *
 * **Sin SVG a propósito**, aunque sea una imagen: un SVG puede traer `<script>`
 * y se renderiza como documento, o sea XSS almacenado en el origen de la API.
 * Los adjuntos de mensajes cubren el mismo agujero por otro lado (los fuerza a
 * descargarse, nunca a renderizarse); un avatar sí tiene que renderizarse
 * inline en un `<Image>`, así que acá la única defensa posible es no aceptar
 * formatos ejecutables. Los tres que quedan son bitmaps puros.
 */
export const AVATAR_EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
};

export const AVATAR_MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};

export const AVATAR_ACCEPTED_MIMES = Object.keys(AVATAR_EXTENSION_BY_MIME);
