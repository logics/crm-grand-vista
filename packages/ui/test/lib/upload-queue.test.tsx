// @vitest-environment jsdom
import '../support/dom.js';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type UploadQueueOptions, useUploadQueue } from '../../src/lib/upload-queue.js';
import { fakeUpload } from '../support/upload.js';

const file = (name: string) => new File([new Uint8Array(1)], name);

/** Fila com o `upload` falso; por padrão, o dado associado a cada arquivo é o próprio nome. */
function renderQueue(options: Partial<UploadQueueOptions<string, string>> = {}, prepare = (added: File) => added.name) {
  const fake = fakeUpload();
  const complete = vi.fn();
  const release = vi.fn();
  const hook = renderHook(() =>
    useUploadQueue<string, string>({
      upload: fake.upload,
      concurrency: 2,
      release,
      complete,
      ...options,
    }),
  );
  const add = (...names: string[]) => act(() => hook.result.current.add(names.map(file), prepare));
  const entry = (name: string) => {
    const found = hook.result.current.entries.find((item) => item.file.name === name);
    if (!found) throw new Error(`${name} não está na fila`);
    return found;
  };
  const started = () => fake.calls.map((call) => call.file.name);
  return { ...fake, ...hook, complete, release, add, entry, started };
}

describe('useUploadQueue', () => {
  it('sobe até o limite de envios simultâneos e começa o próximo quando um termina', async () => {
    const queue = renderQueue();
    queue.add('a', 'b', 'c');

    expect(queue.started()).toEqual(['a', 'b']);
    expect(queue.entry('c').status).toBe('queued');

    await act(async () => queue.calls[0]!.resolve('a'));
    expect(queue.started()).toEqual(['a', 'b', 'c']);
  });

  it('associa a cada arquivo o dado de `prepare`, entregue ao `upload`, e acompanha o progresso', () => {
    const queue = renderQueue({}, (added) => `categoria de ${added.name}`);
    queue.add('a');

    expect(queue.entry('a')).toMatchObject({ status: 'uploading', progress: 0, payload: 'categoria de a' });
    expect(queue.upload).toHaveBeenCalledWith(queue.calls[0]!.file, expect.anything(), 'categoria de a');
    act(() => queue.calls[0]!.options.onProgress(45));
    expect(queue.entry('a').progress).toBe(45);
  });

  it('entrega o resultado e só tira o arquivo da fila quando `complete` termina', async () => {
    let finish!: () => void;
    const queue = renderQueue({ complete: vi.fn(() => new Promise<void>((resolve) => (finish = resolve))) });
    queue.add('a');

    await act(async () => queue.calls[0]!.resolve('fazendas/a'));
    expect(queue.result.current.entries).toHaveLength(1);

    await act(async () => finish());
    expect(queue.result.current.entries).toEqual([]);
  });

  it('passa a `complete` o resultado e o arquivo, e libera o dado associado', async () => {
    const queue = renderQueue();
    queue.add('a');
    await act(async () => queue.calls[0]!.resolve('fazendas/a'));

    expect(queue.complete).toHaveBeenCalledWith('fazendas/a', expect.objectContaining({ payload: 'a' }));
    expect(queue.release).toHaveBeenCalledWith('a');
  });

  it('remover cancela o envio: aborta o sinal, libera a vaga e ignora a rejeição que vem depois', async () => {
    const queue = renderQueue({ concurrency: 1 });
    queue.add('a', 'b');

    act(() => queue.result.current.remove(queue.entry('a')));
    expect(queue.calls[0]!.options.signal.aborted).toBe(true);
    expect(queue.release).toHaveBeenCalledWith('a');
    expect(queue.started()).toEqual(['a', 'b']);

    await act(async () => queue.calls[0]!.reject(new DOMException('Cancelado', 'AbortError')));
    expect(queue.result.current.entries.map((item) => item.file.name)).toEqual(['b']);
    expect(queue.complete).not.toHaveBeenCalled();
  });

  it('o arquivo que falha fica na fila sem ocupar vaga, e a nova tentativa envia de novo', async () => {
    const queue = renderQueue({ concurrency: 1 });
    queue.add('a', 'b');

    await act(async () => queue.calls[0]!.reject(new Error('rede')));
    expect(queue.entry('a').status).toBe('error');
    expect(queue.started()).toEqual(['a', 'b']);

    await act(async () => queue.calls[1]!.resolve('b'));
    act(() => queue.result.current.retry(queue.entry('a')));
    expect(queue.started()).toEqual(['a', 'b', 'a']);
    expect(queue.entry('a')).toMatchObject({ status: 'uploading', progress: 0 });
  });

  it('ao desmontar, aborta o que está subindo e libera o dado de toda a fila', () => {
    const queue = renderQueue({ concurrency: 1 });
    queue.add('a', 'b');

    queue.unmount();
    expect(queue.calls[0]!.options.signal.aborted).toBe(true);
    expect(queue.release.mock.calls.map(([payload]) => payload)).toEqual(['a', 'b']);
  });
});
