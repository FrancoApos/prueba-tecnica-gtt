import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

/**
 * Normaliza cualquier excepción (HttpException o error no controlado) a un
 * shape de respuesta consistente, para que el frontend siempre pueda
 * confiar en { statusCode, error, message, path, timestamp }.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    // Un `CastError` de Mongoose es un id que no se puede convertir a
    // ObjectId: el cliente mandó `/users/pepe`, no es una falla del servidor.
    // Sin esta rama caía en el `else` de abajo y salía como 500, que se lee
    // como un bug no controlado en vez de como "mandaste mal el id".
    const isCastError = exception instanceof MongooseError.CastError;

    const statusCode = isHttpException
      ? exception.getStatus()
      : isCastError
        ? HttpStatus.BAD_REQUEST
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Ocurrió un error inesperado';
    let error = 'Internal Server Error';

    if (isHttpException) {
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as { message?: string | string[]; error?: string };
        message = b.message ?? exception.message;
        error = b.error ?? HttpStatus[statusCode];
      }
    } else if (isCastError) {
      // `exception.path` es el campo del schema que falló (`_id`, `chatId`…);
      // el valor no se devuelve para no reflejar input crudo en la respuesta.
      message = `El valor de "${exception.path}" no es un id válido`;
      error = 'Bad Request';
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    const body: ErrorResponseBody = {
      statusCode,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }
}
