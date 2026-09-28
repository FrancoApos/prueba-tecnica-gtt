import { randomBytes } from 'node:crypto';
import { Logger } from '@nestjs/common';

export interface AppConfig {
  port: number;
  mongodbUri: string;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  corsOrigin: string;
  uploadsDir: string;
}

/**
 * Valores que viven en el repo (`.env.example`, `docker-compose.yml`, y el
 * default que este archivo tenía antes) y por lo tanto no son secretos: firmar
 * con cualquiera de ellos equivale a no tener secreto, porque cualquiera que
 * lea el repo puede forjar un JWT válido para cualquier usuario. Se tratan
 * igual que si la variable no estuviera definida.
 */
const PLACEHOLDER_SECRETS = new Set([
  'dev-secret-change-me',
  'replace-with-a-long-random-secret',
]);

/**
 * Se memoiza: si `configuration()` se evaluara más de una vez, un secreto
 * random distinto por llamada haría que `JwtModule` firme con uno y
 * `JwtStrategy` verifique con otro — todo token saldría inválido.
 */
let generatedSecret: string | null = null;

/**
 * Sin `JWT_SECRET` usable, el backend **nunca** cae a un secreto conocido:
 * genera uno random para este proceso y avisa. El costo es visible y acotado
 * (las sesiones no sobreviven un reinicio, y el log dice por qué) en vez de
 * silencioso y explotable. Ver la entrada del 2026-09-27 en
 * `docs/DECISIONS.md` para por qué no corta el arranque.
 */
function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET?.trim();
  if (fromEnv && !PLACEHOLDER_SECRETS.has(fromEnv)) {
    return fromEnv;
  }

  const problema = fromEnv
    ? `JWT_SECRET tiene un valor de ejemplo que está publicado en el repo ("${fromEnv}")`
    : 'JWT_SECRET no está definido';

  generatedSecret ??= randomBytes(32).toString('hex');
  new Logger('Configuration').warn(
    `${problema}. Se generó un secreto random para este proceso: los tokens ya emitidos dejan de ser ` +
      'válidos en cada reinicio. Definí JWT_SECRET con un valor privado (`openssl rand -hex 32`) ' +
      'antes de exponer esto en cualquier entorno real.',
  );
  return generatedSecret;
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/chat-app',
  jwt: {
    secret: resolveJwtSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  uploadsDir: process.env.UPLOADS_DIR ?? 'uploads',
});
