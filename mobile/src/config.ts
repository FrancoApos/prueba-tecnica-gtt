/**
 * EXPO_PUBLIC_* env vars son embebidas en el bundle por Expo (sin config
 * extra desde SDK 49). Ver .env.example — en un dispositivo físico hay que
 * usar la IP de LAN de esta máquina, "localhost" no sirve porque el celular
 * es otro dispositivo en la red.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Los adjuntos persistidos vienen del backend como path relativo
 * (`/uploads/x.png`). Un adjunto optimista (todavía no confirmado por el
 * server, ver `useMessages.ts`) usa en cambio la URI local del picker
 * (`file://`, `content://`, `ph://`, `blob:` en web) — cualquier URI que ya
 * tenga esquema propio se devuelve tal cual, no es un path para prefijar.
 */
export function resolveAssetUrl(path: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) {
    return path;
  }
  return `${API_URL}${path}`;
}
