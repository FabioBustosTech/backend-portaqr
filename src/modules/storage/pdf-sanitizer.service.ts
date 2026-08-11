import { Injectable, UnprocessableEntityException, Logger } from '@nestjs/common';
import { spawn } from 'child_process';

export interface SanitizedPdf {
  buffer: Buffer;
  size: number;
}

/**
 * Sanitiza un PDF con Ghostscript (SPEC-005 RF-8):
 * - Re-renderiza el PDF desde cero (pdfwrite) descartando JS, acciones, metadata, embedded files.
 * - Re-comprime a 72 DPI (/screen).
 * - Si el PDF está corrupto → -dPDFSTOPONERROR aborta → 422 Unprocessable PDF.
 */
@Injectable()
export class PdfSanitizerService {
  private readonly logger = new Logger(PdfSanitizerService.name);

  async sanitize(inputBuffer: Buffer): Promise<SanitizedPdf> {
    return new Promise((resolve, reject) => {
      const args = [
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
      ];

      const gs = spawn('gs', args);
      const chunks: Buffer[] = [];
      let stderrData = '';

      gs.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
      gs.stderr.on('data', (data: Buffer) => { stderrData += data.toString(); });
      gs.on('error', (err) => {
        this.logger.error(`gs spawn error: ${err.message}`);
        reject(new UnprocessableEntityException('No se pudo ejecutar Ghostscript'));
      });
      gs.on('close', (code) => {
        if (code !== 0) {
          this.logger.warn(`gs exited with code ${code}: ${stderrData}`);
          reject(new UnprocessableEntityException(
            'El PDF no se pudo procesar: archivo corrupto o inválido',
          ));
          return;
        }
        const buffer = Buffer.concat(chunks);
        if (buffer.length === 0) {
          reject(new UnprocessableEntityException('El PDF sanitizado está vacío'));
          return;
        }
        this.logger.log(`pdf_sanitized { inputBytes: ${inputBuffer.length}, outputBytes: ${buffer.length} }`);
        resolve({ buffer, size: buffer.length });
      });

      gs.stdin.write(inputBuffer);
      gs.stdin.end();
    });
  }
}
