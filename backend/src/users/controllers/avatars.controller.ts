import { join } from 'node:path';
import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { UsersService } from '../services/users.service.js';

/**
 * Sirve las fotos de perfil.
 *
 * Va aparte de `AttachmentsController` (que sirve `/uploads/:storedName`)
 * porque ese resuelve el archivo buscando el **mensaje** que lo referencia, y
 * un avatar no tiene mensaje: por esa ruta daría 404 aunque el archivo exista.
 * Las dos rutas no se pisan — `/uploads/avatars/x.png` tiene un segmento más
 * que `/uploads/:storedName`.
 *
 * La otra diferencia importante es **inline vs. descarga**: un adjunto se
 * fuerza a descargar (`Content-Disposition: attachment`) justamente para que
 * nada de lo subido se renderice en el origen de la API. Una foto de perfil
 * tiene que renderizarse — es un `<Image>` — así que acá esa defensa no está
 * disponible y la reemplaza la allowlist de formatos: solo png/jpeg/webp,
 * nunca SVG (ver `avatar-storage.ts`).
 *
 * Público (sin `JwtAuthGuard`) igual que los adjuntos: `<Image>` no puede
 * mandar el header `Authorization`. Lo único que protege la URL es el UUID
 * aleatorio; vale anotarlo como límite conocido, no como decisión de seguridad.
 */
@ApiTags('users')
@Controller('uploads/avatars')
export class AvatarsController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':storedName')
  @ApiOperation({ summary: 'Devuelve la foto de perfil de un usuario' })
  @ApiOkResponse({ description: 'La imagen, para mostrar inline' })
  async serve(@Param('storedName') storedName: string, @Res() res: Response): Promise<void> {
    const avatar = await this.usersService.findAvatar(storedName);
    const absolutePath = join(this.usersService.avatarsDirectory(), avatar.storedName);

    // El Content-Type sale de la allowlist y no de lo que declaró el cliente al
    // subir; `nosniff` evita que el browser adivine otro distinto.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.type(avatar.mimeType);

    await new Promise<void>((resolve, reject) => {
      res.sendFile(absolutePath, (error) => {
        // Un error después de empezar a escribir el body ya no se puede
        // convertir en una respuesta HTTP: ahí solo queda cerrar.
        if (error && !res.headersSent) {
          reject(new NotFoundException('Foto de perfil no encontrada'));
          return;
        }
        resolve();
      });
    });
  }
}
