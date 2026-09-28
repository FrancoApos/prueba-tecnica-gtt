import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protege una ruta exigiendo un Bearer token válido (ver JwtStrategy). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Passport rechaza con su propio `UnauthorizedException`, cuyo mensaje es
   * el string `"Unauthorized"` — el único texto en inglés que salía de esta
   * API, en medio de mensajes que el cliente muestra tal cual al usuario.
   * Se reemplaza acá, que es donde nace el rechazo, en vez de parchearlo en
   * el filtro global (que no sabe si un 401 vino del guard o de un servicio).
   */
  handleRequest<TUser>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException('Necesitás iniciar sesión');
    }
    return user;
  }
}
