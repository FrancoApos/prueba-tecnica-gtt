import { join } from 'node:path';
import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { MessagesService } from '../services/messages.service.js';

/**
 * Sirve los adjuntos de los mensajes.
 *
 * Antes esto lo hacía `app.useStaticAssets('/uploads')`, pero el servidor de
 * estáticos solo conoce el nombre con el que el archivo quedó en disco — un
 * UUID — así que el `Content-Disposition: attachment` salía sin `filename` y el
 * browser bajaba el archivo como "46a2965d-….docx". El nombre original vive en
 * la base (`attachment.filename`), así que hace falta una ruta que lo consulte.
 *
 * Se mantiene público (sin `JwtAuthGuard`) igual que el estático que reemplaza:
 * las imágenes se cargan con `<Image>`, que no puede mandar el header
 * `Authorization`. La URL lleva un UUID aleatorio, que es lo único que la
 * protege — vale anotarlo como límite conocido, no como decisión de seguridad.
 */
@ApiTags('attachments')
@Controller('uploads')
export class AttachmentsController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly configService: ConfigService,
  ) {}

  @Get(':storedName')
  @ApiOperation({ summary: 'Descarga el adjunto de un mensaje con su nombre original' })
  @ApiOkResponse({ description: 'El archivo, como descarga' })
  async download(@Param('storedName') storedName: string, @Res() res: Response): Promise<void> {
    const attachment = await this.messagesService.findAttachment(storedName);
    const uploadsDir = this.configService.get<string>('uploadsDir') ?? 'uploads';
    const absolutePath = join(process.cwd(), uploadsDir, attachment.storedName);

    // `res.download` fuerza `Content-Disposition: attachment`, que además de dar
    // el nombre correcto es lo que evita que un .html/.svg subido como adjunto
    // se renderice en el origen de la API (XSS almacenado): el browser siempre
    // lo baja en vez de ejecutarlo. `nosniff` cierra el mismo agujero por el
    // lado del sniffing de Content-Type. El tipo se fija desde lo que guardó la
    // base y no desde la extensión, porque es lo que declaró el cliente al subir.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.type(attachment.mimeType);

    await new Promise<void>((resolve, reject) => {
      res.download(absolutePath, attachment.filename, (error) => {
        // Un error después de empezar a escribir el body ya no se puede
        // convertir en una respuesta HTTP: ahí solo queda cerrar.
        if (error && !res.headersSent) {
          reject(new NotFoundException('Adjunto no encontrado'));
          return;
        }
        resolve();
      });
    });
  }
}
