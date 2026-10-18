import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Fila de envio de arquivos com limite de paralelismo, progresso por arquivo,
// cancelamento e nova tentativa. Não sabe para onde o arquivo vai: o envio é a
// função `upload` de quem usa. Serve à mídia das galerias e aos documentos.

export type UploadOptions = {
  /** Progresso do envio, de 0 a 100. */
  onProgress: (percent: number) => void;
  /** Abortado quando quem envia cancela o arquivo ou o componente sai da tela. */
  signal: AbortSignal;
};

export type UploadEntry<P> = {
  key: string;
  file: File;
  /** queued à espera de vaga · uploading subindo · error falhou, à espera de nova tentativa */
  status: 'queued' | 'uploading' | 'error';
  progress: number;
  /** O que quem usa associa ao arquivo ao enfileirá-lo (a prévia, por exemplo). */
  payload: P;
};

export type UploadQueueOptions<T, P> = {
  /** Envia o arquivo; recebe também o dado associado a ele (a categoria de um documento, por exemplo). */
  upload: (file: File, options: UploadOptions, payload: P) => Promise<T>;
  /** Quantos arquivos sobem ao mesmo tempo. */
  concurrency: number;
  /** Libera o dado associado quando o arquivo sai da fila ou o componente sai da tela. */
  release?: (payload: P) => void;
  /** Envio concluído; o arquivo sai da fila quando a promessa devolvida termina. */
  complete: (result: T, entry: UploadEntry<P>) => void | Promise<void>;
};

let nextKey = 0;

export function useUploadQueue<T, P>(options: UploadQueueOptions<T, P>) {
  const [entries, setEntries] = useState<UploadEntry<P>[]>([]);
  // envio em curso de cada arquivo, pela chave
  const controllers = useRef(new Map<string, AbortController>());
  // as opções e a fila mais recentes, para o envio em curso e a limpeza ao desmontar
  const latest = useRef({ options, entries });
  useLayoutEffect(() => {
    latest.current = { options, entries };
  });

  const update = (key: string, patch: Partial<UploadEntry<P>>) =>
    setEntries((current) => current.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)));

  /** Tira o arquivo da fila: cancela o envio em curso e libera o dado associado. */
  const remove = (entry: UploadEntry<P>) => {
    controllers.current.get(entry.key)?.abort();
    controllers.current.delete(entry.key);
    latest.current.options.release?.(entry.payload);
    setEntries((current) => current.filter((item) => item.key !== entry.key));
  };

  const start = (entry: UploadEntry<P>) => {
    const controller = new AbortController();
    controllers.current.set(entry.key, controller);
    update(entry.key, { status: 'uploading', progress: 0 });
    latest.current.options
      .upload(
        entry.file,
        {
          signal: controller.signal,
          onProgress: (percent) => {
            if (!controller.signal.aborted) update(entry.key, { progress: percent });
          },
        },
        entry.payload,
      )
      .then(
        async (result) => {
          if (controller.signal.aborted) return;
          await latest.current.options.complete(result, entry);
          if (controller.signal.aborted) return;
          controllers.current.delete(entry.key);
          remove(entry);
        },
        () => {
          // a rejeição de um envio cancelado é o próprio cancelamento, não falha
          if (controller.signal.aborted) return;
          controllers.current.delete(entry.key);
          update(entry.key, { status: 'error' });
        },
      );
  };

  // a fila anda a cada mudança: arquivo à espera sobe quando há vaga
  useEffect(() => {
    let free = options.concurrency - entries.filter((entry) => entry.status === 'uploading').length;
    for (const entry of entries) {
      if (free <= 0) break;
      if (entry.status !== 'queued' || controllers.current.has(entry.key)) continue;
      start(entry);
      free--;
    }
  });

  // ao sair da tela, nada fica subindo nem preso na memória
  useEffect(
    () => () => {
      for (const controller of controllers.current.values()) controller.abort();
      controllers.current.clear();
      for (const entry of latest.current.entries) latest.current.options.release?.(entry.payload);
    },
    [],
  );

  return {
    entries,
    /** Enfileira os arquivos; `prepare` associa um dado a cada um. */
    add(files: File[], prepare: (file: File) => P) {
      const added = files.map(
        (file): UploadEntry<P> => ({
          key: `upload-${nextKey++}`,
          file,
          status: 'queued',
          progress: 0,
          payload: prepare(file),
        }),
      );
      setEntries((current) => [...current, ...added]);
    },
    /** Cancela o envio em curso ou descarta o arquivo que falhou. */
    remove,
    /** Devolve à fila o arquivo que falhou. */
    retry: (entry: UploadEntry<P>) => update(entry.key, { status: 'queued', progress: 0 }),
  };
}
