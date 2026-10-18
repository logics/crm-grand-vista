// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RejectedFiles, UploadStatus, uploadDismissLabel } from '../../src/index.js';
import type { UploadEntry } from '../../src/lib/upload-queue.js';

const file = new File([new Uint8Array(1)], 'laudo.pdf');
const entry = (patch: Partial<UploadEntry<unknown>> = {}): UploadEntry<unknown> => ({
  key: 'upload-1',
  file,
  status: 'uploading',
  progress: 40,
  payload: null,
  ...patch,
});

describe('UploadStatus', () => {
  it('enquanto sobe, é a barra de progresso nomeada pelo arquivo', () => {
    render(<UploadStatus entry={entry()} onRetry={vi.fn()} />);
    expect(screen.getByRole('progressbar', { name: 'Enviando laudo.pdf' })).toHaveAttribute('aria-valuenow', '40');
  });

  it('na falha, avisa e tenta de novo pelo botão', async () => {
    const onRetry = vi.fn();
    render(<UploadStatus entry={entry({ status: 'error' })} onRetry={onRetry} />);
    expect(screen.getByText('Falha no envio')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('desabilitado, não tenta de novo', () => {
    render(<UploadStatus entry={entry({ status: 'error' })} onRetry={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeDisabled();
  });

  it('o botão de tirar da fila cancela o envio ou descarta a falha', () => {
    expect(uploadDismissLabel(entry())).toBe('Cancelar envio de laudo.pdf');
    expect(uploadDismissLabel(entry({ status: 'queued' }))).toBe('Cancelar envio de laudo.pdf');
    expect(uploadDismissLabel(entry({ status: 'error' }))).toBe('Descartar laudo.pdf');
  });
});

describe('RejectedFiles', () => {
  it('anuncia cada arquivo recusado com o motivo', () => {
    render(<RejectedFiles files={[{ file, reason: 'maior que 10 MB' }]} />);
    expect(screen.getByRole('alert')).toHaveTextContent('laudo.pdf: maior que 10 MB');
  });

  it('sem recusa, não renderiza nada', () => {
    const { container } = render(<RejectedFiles files={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
