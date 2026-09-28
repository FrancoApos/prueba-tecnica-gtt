import { NotFoundException, UnauthorizedException, type ArgumentsHost } from '@nestjs/common';
import { Error as MongooseError } from 'mongoose';
import { HttpExceptionFilter } from './http-exception.filter.js';

describe('HttpExceptionFilter', () => {
  function run(exception: unknown) {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/users/abc' }),
      }),
    } as unknown as ArgumentsHost;

    new HttpExceptionFilter().catch(exception, host);

    return { status: status.mock.calls[0][0] as number, body: json.mock.calls[0][0] };
  }

  /** Lo que tira Mongoose cuando un string no se puede convertir a ObjectId. */
  const castError = () => new MongooseError.CastError('ObjectId', 'pepe', '_id');

  it('keeps the status and message of an HttpException', () => {
    const { status, body } = run(new NotFoundException('Usuario no encontrado'));

    expect(status).toBe(404);
    expect(body.message).toBe('Usuario no encontrado');
  });

  it('maps a malformed id to 400, not 500', () => {
    const { status, body } = run(castError());

    expect(status).toBe(400);
    expect(body.statusCode).toBe(400);
    expect(body.error).toBe('Bad Request');
    expect(body.message).toBe('El valor de "_id" no es un id válido');
  });

  it('does not echo the raw value the client sent', () => {
    const { body } = run(castError());

    expect(JSON.stringify(body)).not.toContain('pepe');
  });

  it('still reports an unexpected error as 500 without leaking the stack', () => {
    const { status, body } = run(new Error('algo explotó en la capa de datos'));

    expect(status).toBe(500);
    expect(body.message).toBe('Ocurrió un error inesperado');
    expect(JSON.stringify(body)).not.toContain('explotó');
  });

  it('names the status the same way whatever threw it', () => {
    // Una UnauthorizedException sin `error` propio (la que tira Passport)
    // salía como "UNAUTHORIZED", en otro formato que el resto de la API.
    expect(run(new UnauthorizedException('Necesitás iniciar sesión')).body.error).toBe('Unauthorized');
    expect(run(new NotFoundException('No está')).body.error).toBe('Not Found');
    expect(run(castError()).body.error).toBe('Bad Request');
  });

  it('always answers with the same shape', () => {
    const { body } = run(castError());

    expect(Object.keys(body).sort()).toEqual(
      ['error', 'message', 'path', 'statusCode', 'timestamp'].sort(),
    );
  });
});
