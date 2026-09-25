import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protege una ruta exigiendo un Bearer token válido (ver JwtStrategy). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
