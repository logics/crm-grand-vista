import { vi } from 'vitest';
import type { UploadOptions } from '../../src/lib/upload-queue.js';

// O `upload` falso guarda cada chamada com as alavancas para o teste conduzir o
// envio: avançar o progresso, concluir, falhar — e ver se o sinal foi abortado.
// Serve à fila e a todo componente que a usa (mídia, documentos).
export function fakeUpload<O extends UploadOptions = UploadOptions>() {
  const calls: {
    file: File;
    options: O;
    resolve: (value: string) => void;
    reject: (error: Error) => void;
  }[] = [];
  const upload = vi.fn(
    (file: File, options: O) =>
      new Promise<string>((resolve, reject) => {
        calls.push({ file, options, resolve, reject });
      }),
  );
  return { upload, calls };
}
