/**
 * EXPO_PUBLIC_* env vars son embebidas en el bundle por Expo (sin config
 * extra desde SDK 49). Ver .env.example — en un dispositivo físico hay que
 * usar la IP de LAN de esta máquina, "localhost" no sirve porque el celular
 * es otro dispositivo en la red.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/** Los adjuntos vienen del backend como path relativo (`/uploads/x.png`). */
export function resolveAssetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  return `${API_URL}${path}`;
}
