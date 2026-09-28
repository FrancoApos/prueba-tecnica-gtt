import { Logger } from '@nestjs/common';

/**
 * Cada caso reimporta el módulo: el secreto generado se memoiza a nivel de
 * módulo (a propósito, ver `configuration.ts`), así que reusar la misma
 * instancia entre tests arrastraría el valor del test anterior.
 */
async function loadConfiguration() {
  vi.resetModules();
  const mod = await import('./configuration.js');
  return mod.default;
}

describe('configuration (JWT secret)', () => {
  const originalSecret = process.env.JWT_SECRET;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockRestore();
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  it('uses JWT_SECRET as given when it is a real value', async () => {
    process.env.JWT_SECRET = 'un-secreto-privado-de-verdad';
    const configuration = await loadConfiguration();

    expect(configuration().jwt.secret).toBe('un-secreto-privado-de-verdad');
    expect(warn).not.toHaveBeenCalled();
  });

  it('never falls back to a known secret when JWT_SECRET is missing, and warns', async () => {
    delete process.env.JWT_SECRET;
    const configuration = await loadConfiguration();

    const { secret } = configuration().jwt;

    expect(secret).toMatch(/^[0-9a-f]{64}$/);
    expect(secret).not.toBe('dev-secret-change-me');
    expect(warn).toHaveBeenCalledOnce();
  });

  it('rejects the placeholder values that are published in the repo', async () => {
    process.env.JWT_SECRET = 'replace-with-a-long-random-secret';
    const configuration = await loadConfiguration();

    expect(configuration().jwt.secret).not.toBe('replace-with-a-long-random-secret');
    expect(warn).toHaveBeenCalledOnce();
  });

  it('keeps one generated secret per process, so signing and verifying agree', async () => {
    delete process.env.JWT_SECRET;
    const configuration = await loadConfiguration();

    expect(configuration().jwt.secret).toBe(configuration().jwt.secret);
  });
});
