import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { UnprocessableEntityException } from '@nestjs/common';
import { PdfSanitizerService } from './pdf-sanitizer.service';

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

const mockedSpawn = jest.mocked(spawn);

interface FakeGsOptions {
  exitCode?: number | null;
  stdoutData?: Buffer | null;
  stderrData?: string;
  emitError?: Error | null;
  manual?: boolean; // true: no emite eventos automáticamente (el test los emite manualmente)
}

/** Crea un fake de ChildProcess basado en EventEmitter para simular gs. */
function createFakeGs(options: FakeGsOptions = {}) {
  const {
    exitCode = 0,
    stdoutData = Buffer.from('%PDF-1.7 sanitized'),
    stderrData = '',
    emitError = null,
    manual = false,
  } = options;

  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    stdin: { write: jest.Mock; end: jest.Mock };
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.stdin = { write: jest.fn(), end: jest.fn() };

  mockedSpawn.mockReturnValue(proc as never);

  // Emitir eventos de forma asíncrona para que los listeners se registren antes.
  if (!manual) {
    setImmediate(() => {
      if (emitError) {
        proc.emit('error', emitError);
        return;
      }
      if (stdoutData) proc.stdout.emit('data', stdoutData);
      if (stderrData) proc.stderr.emit('data', Buffer.from(stderrData));
      proc.emit('close', exitCode);
    });
  }

  return proc;
}

describe('PdfSanitizerService', () => {
  let service: PdfSanitizerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PdfSanitizerService();
  });

  describe('sanitize', () => {
    it('ejecuta gs con los args canónicos y stdin desde el buffer de entrada', async () => {
      const proc = createFakeGs();

      await service.sanitize(Buffer.from('input-pdf'));

      expect(mockedSpawn).toHaveBeenCalledTimes(1);
      expect(mockedSpawn).toHaveBeenCalledWith('gs', [
        '-dNOPAUSE', '-dBATCH', '-dQUIET',
        '-dPDFSTOPONERROR',
        '-dCompatibilityLevel=1.7',
        '-dPDFSETTINGS=/screen',
        '-sDEVICE=pdfwrite',
        '-dColorImageResolution=72',
        '-dGrayImageResolution=72',
        '-dMonoImageResolution=72',
        '-dEmbedAllFonts=true',
        '-dSubsetFonts=true',
        '-dDetectDuplicateImages=true',
        '-sOutputFile=-',
        '-',
      ]);
      expect(proc.stdin.write).toHaveBeenCalledWith(Buffer.from('input-pdf'));
      expect(proc.stdin.end).toHaveBeenCalled();
    });

    it('resuelve con el buffer sanitizado cuando gs termina con código 0', async () => {
      const output = Buffer.from('%PDF-1.7 sanitized output');
      createFakeGs({ stdoutData: output });

      const result = await service.sanitize(Buffer.from('input-pdf'));

      expect(result).toEqual({ buffer: output, size: output.length });
    });

    it('concatena múltiples chunks de stdout en un solo buffer', async () => {
      const proc = createFakeGs({ manual: true });
      const promise = service.sanitize(Buffer.from('input-pdf'));
      setImmediate(() => {
        proc.stdout.emit('data', Buffer.from('chunk1'));
        proc.stdout.emit('data', Buffer.from('chunk2'));
        proc.emit('close', 0);
      });

      const result = await promise;

      expect(result.buffer.toString()).toBe('chunk1chunk2');
      expect(result.size).toBe(12);
    });

    it('rechaza con 422 cuando gs termina con exit code distinto de 0', async () => {
      createFakeGs({ exitCode: 1, stderrData: 'Syntax Error' });

      await expect(service.sanitize(Buffer.from('corrupt'))).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });

    it('rechaza con 422 y mensaje de PDF corrupto cuando gs falla', async () => {
      createFakeGs({ exitCode: 1 });

      await expect(service.sanitize(Buffer.from('corrupt'))).rejects.toThrow(
        'El PDF no se pudo procesar: archivo corrupto o inválido',
      );
    });

    it('rechaza con 422 y mensaje de Ghostscript cuando el spawn falla', async () => {
      createFakeGs({ emitError: new Error('spawn gs ENOENT') });

      await expect(service.sanitize(Buffer.from('pdf'))).rejects.toThrow(
        'No se pudo ejecutar Ghostscript',
      );
    });

    it('rechaza con 422 cuando el buffer sanitizado está vacío', async () => {
      createFakeGs({ stdoutData: Buffer.from(''), exitCode: 0 });

      await expect(service.sanitize(Buffer.from('pdf'))).rejects.toThrow(
        'El PDF sanitizado está vacío',
      );
    });

    it('rechaza con 422 cuando gs no emite nada por stdout', async () => {
      createFakeGs({ stdoutData: null, exitCode: 0 });

      await expect(service.sanitize(Buffer.from('pdf'))).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });

    it('rechaza con 422 si el código de salida es null (proceso terminado sin código)', async () => {
      createFakeGs({ exitCode: null, stdoutData: Buffer.from('%PDF') });

      await expect(service.sanitize(Buffer.from('pdf'))).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });
  });
});
