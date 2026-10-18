// @vitest-environment jsdom
import '../support/dom.js';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Field, type MediaItem, MediaUploader } from '../../src/index.js';
import { fakeUpload } from '../support/upload.js';

const photo = (name = 'sede.jpg', size = 1024) => new File([new Uint8Array(size)], name, { type: 'image/jpeg' });
const video = (name = 'voo.mp4') => new File([new Uint8Array(10)], name, { type: 'video/mp4' });

let created: string[];
let revoked: string[];

beforeEach(() => {
  created = [];
  revoked = [];
  // o jsdom não implementa URLs de objeto
  URL.createObjectURL = vi.fn(() => {
    const url = `blob:previa-${created.length + 1}`;
    created.push(url);
    return url;
  });
  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const chooseFiles = (...files: File[]) =>
  userEvent.upload(screen.getByLabelText('Selecionar arquivos', { selector: 'input' }), files);

describe('MediaUploader', () => {
  it('envia o arquivo escolhido e mostra o progresso', async () => {
    const { upload, calls } = fakeUpload();
    render(<MediaUploader upload={upload} />);
    await chooseFiles(photo('sede.jpg'));

    expect(upload).toHaveBeenCalledOnce();
    expect(calls[0]!.file.name).toBe('sede.jpg');
    const bar = screen.getByRole('progressbar', { name: 'Enviando sede.jpg' });
    expect(bar).toHaveAttribute('aria-valuenow', '0');

    act(() => calls[0]!.options.onProgress(45));
    expect(bar).toHaveAttribute('aria-valuenow', '45');
  });

  it('aceita outro limite de envios simultâneos', async () => {
    const { calls, upload } = fakeUpload();
    render(<MediaUploader upload={upload} concurrency={1} />);
    await chooseFiles(photo('a.jpg'), photo('b.jpg'));
    expect(calls).toHaveLength(1);
  });

  it('entrega o resultado com as dimensões da foto e tira o arquivo da fila', async () => {
    const { upload, calls } = fakeUpload();
    const onUploaded = vi.fn();
    render(<MediaUploader upload={upload} onUploaded={onUploaded} />);
    await chooseFiles(photo('sede.jpg'));

    loadPreview('sede.jpg', { naturalWidth: 1600, naturalHeight: 1200 });
    await act(async () => calls[0]!.resolve('fazendas/sede.jpg'));

    expect(onUploaded).toHaveBeenCalledWith('fazendas/sede.jpg', {
      file: calls[0]!.file,
      kind: 'photo',
      width: 1600,
      height: 1200,
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('entrega a duração do vídeo, em segundos inteiros', async () => {
    const { upload, calls } = fakeUpload();
    const onUploaded = vi.fn();
    render(<MediaUploader upload={upload} onUploaded={onUploaded} />);
    await chooseFiles(video('voo.mp4'));

    loadPreview('voo.mp4', { videoWidth: 1920, videoHeight: 1080, duration: 42.6 });
    await act(async () => calls[0]!.resolve('fazendas/voo.mp4'));

    expect(onUploaded).toHaveBeenCalledWith('fazendas/voo.mp4', {
      file: calls[0]!.file,
      kind: 'video',
      width: 1920,
      height: 1080,
      durationSeconds: 43,
    });
  });

  it('espera a leitura da prévia para entregar o resultado, e entrega sem dimensões se ela falhar', async () => {
    const { upload, calls } = fakeUpload();
    const onUploaded = vi.fn();
    render(<MediaUploader upload={upload} onUploaded={onUploaded} />);
    await chooseFiles(photo('sede.jpg'));

    await act(async () => calls[0]!.resolve('fazendas/sede.jpg'));
    expect(onUploaded).not.toHaveBeenCalled();

    await act(async () => fireEvent.error(preview('sede.jpg')));
    expect(onUploaded).toHaveBeenCalledWith('fazendas/sede.jpg', { file: calls[0]!.file, kind: 'photo' });
  });

  it('prévia que o navegador não abre vira o espaço em areia com o rótulo, e o envio segue', async () => {
    const { upload } = fakeUpload();
    render(<MediaUploader upload={upload} />);
    await chooseFiles(photo('sede.heic'));

    await act(async () => fireEvent.error(preview('sede.heic')));
    const tile = screen.getByRole('listitem', { name: 'sede.heic' });
    expect(tile.querySelector('img')).toBeNull();
    expect(tile).toHaveTextContent('Foto');
    expect(screen.getByRole('progressbar', { name: 'Enviando sede.heic' })).toBeInTheDocument();
  });

  // a mecânica da fila (vagas, cancelamento, nova tentativa) é de `useUploadQueue`,
  // testada em `test/lib/upload-queue.test.tsx`; aqui, os botões que a acionam

  it('cancela o envio pelo botão do ladrilho', async () => {
    const { upload, calls } = fakeUpload();
    render(<MediaUploader upload={upload} />);
    await chooseFiles(photo('a.jpg'));

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar envio de a.jpg' }));

    expect(calls[0]!.options.signal.aborted).toBe(true);
    expect(screen.queryByRole('progressbar', { name: 'Enviando a.jpg' })).not.toBeInTheDocument();
  });

  it('no erro, mostra a falha e envia de novo ao pedir', async () => {
    const { upload, calls } = fakeUpload();
    render(<MediaUploader upload={upload} />);
    await chooseFiles(photo('sede.jpg'));

    await act(async () => calls[0]!.reject(new Error('rede')));
    const failed = screen.getByRole('listitem', { name: 'sede.jpg' });
    expect(failed).toHaveTextContent('Falha no envio');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(calls).toHaveLength(2);
    expect(calls[1]!.file.name).toBe('sede.jpg');
    expect(screen.getByRole('progressbar', { name: 'Enviando sede.jpg' })).toHaveAttribute('aria-valuenow', '0');
  });

  it('arquivo com falha pode ser descartado', async () => {
    const { upload, calls } = fakeUpload();
    render(<MediaUploader upload={upload} />);
    await chooseFiles(photo('a.jpg'));

    await act(async () => calls[0]!.reject(new Error('rede')));
    await userEvent.click(screen.getByRole('button', { name: 'Descartar a.jpg' }));
    expect(screen.queryByRole('listitem', { name: 'a.jpg' })).not.toBeInTheDocument();
  });

  it('revoga a URL da prévia ao concluir, cancelar e desmontar', async () => {
    const { upload, calls } = fakeUpload();
    const { unmount } = render(<MediaUploader upload={upload} />);
    await chooseFiles(photo('a.jpg'), photo('b.jpg'), photo('c.jpg'));
    expect(created).toEqual(['blob:previa-1', 'blob:previa-2', 'blob:previa-3']);
    expect(revoked).toEqual([]);

    loadPreview('a.jpg');
    await act(async () => calls[0]!.resolve('a'));
    expect(revoked).toEqual(['blob:previa-1']);

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar envio de b.jpg' }));
    expect(revoked).toEqual(['blob:previa-1', 'blob:previa-2']);

    unmount();
    expect(revoked).toEqual(['blob:previa-1', 'blob:previa-2', 'blob:previa-3']);
    expect(calls[2]!.options.signal.aborted).toBe(true);
  });

  describe('seleção', () => {
    it('o botão "Enviar fotos" abre o seletor de arquivos, que aceita imagens e vídeos', async () => {
      render(<MediaUploader upload={fakeUpload().upload} />);
      const input = screen.getByLabelText('Selecionar arquivos', { selector: 'input' });
      const click = vi.spyOn(input, 'click');

      await userEvent.click(screen.getByRole('button', { name: 'Enviar fotos' }));
      expect(click).toHaveBeenCalled();
      expect(input).toHaveAttribute('accept', 'image/*,video/*');
      expect(input).toHaveAttribute('multiple');
    });

    it('recusa arquivo de tipo não aceito, dizendo o motivo', async () => {
      const { upload } = fakeUpload();
      render(<MediaUploader upload={upload} accept="image/jpeg,.png" />);
      const pdf = new File(['%PDF'], 'matricula.pdf', { type: 'application/pdf' });
      const png = new File(['png'], 'mapa.png', { type: 'image/png' });
      // o seletor do sistema já filtra; o filtro aqui vale para o que chega soltando
      dropFiles(pdf, png, photo('sede.jpg'));

      expect(upload.mock.calls.map(([file]) => file.name)).toEqual(['mapa.png', 'sede.jpg']);
      expect(screen.getByRole('alert')).toHaveTextContent('matricula.pdf: tipo de arquivo não aceito');
    });

    it('recusa arquivo maior que o limite', async () => {
      const { upload } = fakeUpload();
      render(<MediaUploader upload={upload} maxSize={2 * 1024 * 1024} />);
      await chooseFiles(photo('grande.jpg', 3 * 1024 * 1024), photo('pequena.jpg'));

      expect(upload).toHaveBeenCalledOnce();
      expect(screen.getByRole('alert')).toHaveTextContent('grande.jpg: maior que 2 MB');
      expect(screen.getByText('Até 2 MB por arquivo')).toBeInTheDocument();
    });

    it('recusa o que passa do limite de arquivos, contando os já enviados', async () => {
      const { upload } = fakeUpload();
      render(<MediaUploader upload={upload} maxFiles={3} items={[{ id: '1', kind: 'photo', name: 'sede.jpg' }]} />);
      await chooseFiles(photo('a.jpg'), photo('b.jpg'), photo('c.jpg'));

      expect(upload.mock.calls.map(([file]) => file.name)).toEqual(['a.jpg', 'b.jpg']);
      expect(screen.getByRole('alert')).toHaveTextContent('c.jpg: limite de 3 arquivos atingido');
    });

    it('a nova seleção limpa as recusas anteriores', async () => {
      render(<MediaUploader upload={fakeUpload().upload} maxSize={1024} />);
      await chooseFiles(photo('grande.jpg', 2048));
      expect(screen.getByRole('alert')).toBeInTheDocument();

      await chooseFiles(photo('pequena.jpg', 10));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('envia o que é solto na área', () => {
      const { upload } = fakeUpload();
      render(<MediaUploader upload={upload} />);
      dropFiles(photo('sede.jpg'));
      expect(upload).toHaveBeenCalledOnce();
    });

    it('desabilitado, não abre o seletor nem aceita o que é solto', () => {
      const { upload } = fakeUpload();
      render(<MediaUploader upload={upload} disabled />);
      expect(screen.getByRole('button', { name: 'Enviar fotos' })).toBeDisabled();
      dropFiles(photo('sede.jpg'));
      expect(upload).not.toHaveBeenCalled();
    });

    it('o Field nomeia e descreve o botão de envio', async () => {
      render(
        <Field label="Galeria principal" hint="Fotos aéreas primeiro">
          <MediaUploader upload={fakeUpload().upload} />
        </Field>,
      );
      expect(screen.getByRole('button', { name: 'Galeria principal' })).toHaveAccessibleDescription(
        'Fotos aéreas primeiro',
      );
    });
  });
});

/** Solta arquivos na área de envio, como o arrastar do sistema. */
function dropFiles(...files: File[]) {
  const zone = screen.getByRole('region', { name: 'Área de envio' });
  const dataTransfer = { files, types: ['Files'] };
  fireEvent.dragOver(zone, { dataTransfer });
  fireEvent.drop(zone, { dataTransfer });
}

/** A prévia local de um arquivo na fila: `<img>` para foto, `<video>` para vídeo. */
function preview(name: string) {
  const element = document.querySelector(`[data-preview="${name}"]`);
  if (!element) throw new Error(`sem prévia para ${name}`);
  return element;
}

/** O jsdom não carrega mídia: as dimensões entram à mão e o evento de carga é disparado. */
function loadPreview(name: string, dimensions: Record<string, number> = { naturalWidth: 1, naturalHeight: 1 }) {
  const element = preview(name);
  for (const [property, value] of Object.entries(dimensions)) {
    Object.defineProperty(element, property, { value, configurable: true });
  }
  act(() => {
    fireEvent(element, new Event(element.tagName === 'VIDEO' ? 'loadedmetadata' : 'load'));
  });
}

const gallery: MediaItem[] = [
  { id: 'sede', kind: 'photo', name: 'sede.jpg', thumbnail: 'https://cdn.exemplo/sede.jpg' },
  { id: 'pivo', kind: 'photo', name: 'pivo.jpg' },
  { id: 'voo', kind: 'video', name: 'voo.mp4' },
];

const sent = () => screen.getByRole('list', { name: 'Mídia enviada' });
const order = () => within(sent()).getAllByRole('listitem').map((item) => item.getAttribute('aria-label'));

describe('MediaUploader — mídia enviada', () => {
  it('mostra cada item com miniatura; sem miniatura, o espaço em areia com o rótulo', () => {
    render(<MediaUploader upload={fakeUpload().upload} items={gallery} />);
    expect(order()).toEqual(['sede.jpg', 'pivo.jpg', 'voo.mp4']);
    expect(within(sent()).getByRole('img', { name: 'sede.jpg' })).toHaveAttribute('src', 'https://cdn.exemplo/sede.jpg');
    const pivo = within(sent()).getByRole('listitem', { name: 'pivo.jpg' });
    expect(within(pivo).queryByRole('img')).not.toBeInTheDocument();
    expect(pivo).toHaveTextContent('Foto');
    expect(within(sent()).getByRole('listitem', { name: 'voo.mp4' })).toHaveTextContent('Vídeo');
  });

  it('sem mídia, a área mostra o espaço em areia com o rótulo', () => {
    render(<MediaUploader upload={fakeUpload().upload} placeholder="Fotos da sede" />);
    expect(screen.getByText('Fotos da sede')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Mídia enviada' })).not.toBeInTheDocument();
  });

  it('remove só depois de confirmar', async () => {
    const onRemove = vi.fn();
    render(<MediaUploader upload={fakeUpload().upload} items={gallery} onRemove={onRemove} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remover pivo.jpg' }));
    const dialog = screen.getByRole('dialog', { name: 'Remover pivo.jpg?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(onRemove).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Remover pivo.jpg' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover' }));
    expect(onRemove).toHaveBeenCalledWith(gallery[1]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('sem onRemove nem onReorder, não oferece remover nem mover', () => {
    render(<MediaUploader upload={fakeUpload().upload} items={gallery} />);
    expect(screen.queryByRole('button', { name: /^Remover/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Mover/ })).not.toBeInTheDocument();
  });

  describe('reordenação pelo teclado', () => {
    it('Espaço pega, as setas movem, Espaço solta; cada passo é anunciado', async () => {
      const onReorder = vi.fn();
      render(<MediaUploader upload={fakeUpload().upload} items={gallery} onReorder={onReorder} />);
      const handle = screen.getByRole('button', { name: 'Mover sede.jpg' });
      expect(handle).toHaveAccessibleDescription(/Espaço para pegar/);

      handle.focus();
      await userEvent.keyboard(' ');
      expect(handle).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('status')).toHaveTextContent('sede.jpg pego, na posição 1 de 3');

      await userEvent.keyboard('{ArrowRight}');
      expect(order()).toEqual(['pivo.jpg', 'sede.jpg', 'voo.mp4']);
      expect(screen.getByRole('status')).toHaveTextContent('sede.jpg na posição 2 de 3');
      expect(onReorder).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Mover sede.jpg' })).toHaveFocus();

      await userEvent.keyboard('{ArrowDown}{ArrowRight}');
      expect(order()).toEqual(['pivo.jpg', 'voo.mp4', 'sede.jpg']);

      await userEvent.keyboard(' ');
      expect(onReorder).toHaveBeenCalledWith(['pivo', 'voo', 'sede']);
      expect(screen.getByRole('status')).toHaveTextContent('sede.jpg solto na posição 3 de 3');
      expect(handle).toHaveAttribute('aria-pressed', 'false');
    });

    it('Escape devolve à posição original sem reordenar', async () => {
      const onReorder = vi.fn();
      render(<MediaUploader upload={fakeUpload().upload} items={gallery} onReorder={onReorder} />);
      screen.getByRole('button', { name: 'Mover voo.mp4' }).focus();
      await userEvent.keyboard(' {ArrowLeft}{ArrowUp}');
      expect(order()).toEqual(['voo.mp4', 'sede.jpg', 'pivo.jpg']);

      await userEvent.keyboard('{Escape}');
      expect(order()).toEqual(['sede.jpg', 'pivo.jpg', 'voo.mp4']);
      expect(onReorder).not.toHaveBeenCalled();
      expect(screen.getByRole('status')).toHaveTextContent('Movimento cancelado; voo.mp4 voltou à posição 3 de 3');
    });

    it('setas sem pegar não movem nada', async () => {
      render(<MediaUploader upload={fakeUpload().upload} items={gallery} onReorder={vi.fn()} />);
      screen.getByRole('button', { name: 'Mover sede.jpg' }).focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(order()).toEqual(['sede.jpg', 'pivo.jpg', 'voo.mp4']);
    });

    it('soltar sem mudar de lugar não reordena', async () => {
      const onReorder = vi.fn();
      render(<MediaUploader upload={fakeUpload().upload} items={gallery} onReorder={onReorder} />);
      screen.getByRole('button', { name: 'Mover sede.jpg' }).focus();
      await userEvent.keyboard(' {ArrowLeft} ');
      expect(onReorder).not.toHaveBeenCalled();
    });
  });

  it('reordena arrastando um item sobre outro', () => {
    const onReorder = vi.fn();
    render(<MediaUploader upload={fakeUpload().upload} items={gallery} onReorder={onReorder} />);
    const item = (name: string) => within(sent()).getByRole('listitem', { name });
    const dataTransfer = { types: [], setData: vi.fn(), effectAllowed: 'none', dropEffect: 'none' };

    fireEvent.dragStart(item('sede.jpg'), { dataTransfer });
    fireEvent.dragOver(item('voo.mp4'), { dataTransfer });
    expect(order()).toEqual(['pivo.jpg', 'voo.mp4', 'sede.jpg']);
    fireEvent.drop(item('sede.jpg'), { dataTransfer });
    fireEvent.dragEnd(item('sede.jpg'), { dataTransfer });

    expect(onReorder).toHaveBeenCalledOnce();
    expect(onReorder).toHaveBeenCalledWith(['pivo', 'voo', 'sede']);
  });

  it('arrastar e largar fora da grade desfaz a ordem', () => {
    const onReorder = vi.fn();
    render(<MediaUploader upload={fakeUpload().upload} items={gallery} onReorder={onReorder} />);
    const item = (name: string) => within(sent()).getByRole('listitem', { name });
    const dataTransfer = { types: [], setData: vi.fn(), dropEffect: 'none' };

    fireEvent.dragStart(item('sede.jpg'), { dataTransfer });
    fireEvent.dragOver(item('pivo.jpg'), { dataTransfer });
    fireEvent.dragEnd(item('sede.jpg'), { dataTransfer });

    expect(order()).toEqual(['sede.jpg', 'pivo.jpg', 'voo.mp4']);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it('desabilitado, não remove nem move', () => {
    render(<MediaUploader upload={fakeUpload().upload} items={gallery} onRemove={vi.fn()} onReorder={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: 'Remover sede.jpg' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mover sede.jpg' })).toBeDisabled();
  });
});

describe('MediaUploader — achados da revisão', () => {
  it('desabilitado, a fila não cancela, não descarta nem tenta de novo', async () => {
    const { upload, calls } = fakeUpload();
    const { rerender } = render(<MediaUploader upload={upload} />);
    await chooseFiles(photo('a.jpg'), photo('b.jpg'));
    await act(async () => calls[1]!.reject(new Error('rede')));

    rerender(<MediaUploader upload={upload} disabled />);
    expect(screen.getByRole('button', { name: 'Cancelar envio de a.jpg' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Descartar b.jpg' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeDisabled();
  });

  it('a prévia que nunca responde não prende a vaga: o resultado sai sem dimensões', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { upload, calls } = fakeUpload();
      const onUploaded = vi.fn();
      render(<MediaUploader upload={upload} onUploaded={onUploaded} concurrency={1} />);
      await chooseFiles(photo('a.jpg'), photo('b.jpg'));

      await act(async () => calls[0]!.resolve('a'));
      expect(onUploaded).not.toHaveBeenCalled();
      await act(async () => vi.advanceTimersByTime(5000));
      expect(onUploaded).toHaveBeenCalledWith('a', { file: calls[0]!.file, kind: 'photo' });
      expect(calls).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a ordem é de quem usa: soltar sem `items` mudar volta à ordem da prop', async () => {
    render(<MediaUploader upload={fakeUpload().upload} items={gallery} onReorder={vi.fn()} />);
    screen.getByRole('button', { name: 'Mover sede.jpg' }).focus();
    await userEvent.keyboard(' {ArrowRight} ');
    expect(order()).toEqual(['sede.jpg', 'pivo.jpg', 'voo.mp4']);
  });

  it('sair da alça com Tab com o item pego desfaz o movimento', async () => {
    const onReorder = vi.fn();
    render(<MediaUploader upload={fakeUpload().upload} items={gallery} onReorder={onReorder} />);
    const handle = screen.getByRole('button', { name: 'Mover sede.jpg' });
    handle.focus();
    await userEvent.keyboard(' {ArrowRight}');
    await userEvent.tab();

    expect(order()).toEqual(['sede.jpg', 'pivo.jpg', 'voo.mp4']);
    expect(handle).toHaveAttribute('aria-pressed', 'false');
    expect(onReorder).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Movimento cancelado; sede.jpg voltou à posição 1 de 3');
  });

  it('item pego que some de `items` encerra o movimento sem quebrar', async () => {
    const { rerender } = render(<MediaUploader upload={fakeUpload().upload} items={gallery} onReorder={vi.fn()} />);
    screen.getByRole('button', { name: 'Mover sede.jpg' }).focus();
    await userEvent.keyboard(' ');
    rerender(<MediaUploader upload={fakeUpload().upload} items={gallery.slice(1)} onReorder={vi.fn()} />);

    expect(order()).toEqual(['pivo.jpg', 'voo.mp4']);
    screen.getByRole('button', { name: 'Mover pivo.jpg' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(order()).toEqual(['pivo.jpg', 'voo.mp4']);
  });

  it('seta no limite diz que o item já está na ponta', async () => {
    render(<MediaUploader upload={fakeUpload().upload} items={gallery} onReorder={vi.fn()} />);
    screen.getByRole('button', { name: 'Mover sede.jpg' }).focus();
    await userEvent.keyboard(' {ArrowLeft}');
    expect(screen.getByRole('status')).toHaveTextContent('sede.jpg já está na primeira posição');

    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('status')).toHaveTextContent('sede.jpg já está na última posição');
  });

  it('ao confirmar a remoção, o foco vai para o botão de envio', async () => {
    render(<MediaUploader upload={fakeUpload().upload} items={gallery} onRemove={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remover pivo.jpg' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover' }));
    expect(screen.getByRole('button', { name: 'Enviar fotos' })).toHaveFocus();
  });

  it('id e descrição de quem usa vão para o botão de envio', () => {
    render(
      <>
        <span id="dica">Até dez fotos</span>
        <MediaUploader upload={fakeUpload().upload} id="galeria" aria-describedby="dica" />
      </>,
    );
    const button = screen.getByRole('button', { name: 'Enviar fotos' });
    expect(button).toHaveAttribute('id', 'galeria');
    expect(button).toHaveAccessibleDescription('Até dez fotos');
  });
});
