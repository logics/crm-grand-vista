import type { ComponentProps } from 'react';
import { cn } from '../lib/cn.js';
import type { RejectedFile } from '../lib/media-files.js';
import type { UploadEntry } from '../lib/upload-queue.js';
import { Button } from './button.js';
import { Icon } from './icon.js';
import { ProgressBar } from './progress-bar.js';

// O que se vê de um arquivo na fila de envio (`useUploadQueue`), igual na
// galeria de mídia e na lista de documentos: o progresso enquanto sobe, a falha
// com a nova tentativa quando cai; e, acima da fila, os arquivos recusados na
// triagem, com o motivo.

export type UploadStatusProps = Omit<ComponentProps<'div'>, 'children'> & {
  entry: UploadEntry<unknown>;
  onRetry: () => void;
  disabled?: boolean;
};

/** Progresso do envio ou, se falhou, o aviso e o botão de tentar de novo. */
export function UploadStatus({ className, entry, onRetry, disabled = false, ...props }: UploadStatusProps) {
  if (entry.status !== 'error') {
    return (
      <div data-slot="upload-status" className={className} {...props}>
        <ProgressBar value={entry.progress} height="sm" aria-label={`Enviando ${entry.file.name}`} />
      </div>
    );
  }
  return (
    <div data-slot="upload-status" className={cn('flex items-center justify-between gap-4', className)} {...props}>
      <span className="inline-flex items-center gap-2 text-xs text-status-danger-fg">
        <Icon name="alert-circle" size="sm" />
        Falha no envio
      </span>
      <Button size="sm" variant="soft" icon="refresh-cw" disabled={disabled} onClick={onRetry}>
        Tentar de novo
      </Button>
    </div>
  );
}

/** Nome acessível do botão que tira o arquivo da fila: cancela o envio ou descarta a falha. */
export const uploadDismissLabel = (entry: UploadEntry<unknown>) =>
  entry.status === 'error' ? `Descartar ${entry.file.name}` : `Cancelar envio de ${entry.file.name}`;

export type RejectedFilesProps = Omit<ComponentProps<'ul'>, 'children'> & {
  files: RejectedFile[];
};

/** Arquivos recusados na triagem, com o motivo; anunciados ao leitor de tela. Sem recusa, nada. */
export function RejectedFiles({ className, files, ...props }: RejectedFilesProps) {
  if (files.length === 0) return null;
  return (
    <ul data-slot="rejected-files" role="alert" className={cn('flex flex-col gap-2', className)} {...props}>
      {files.map(({ file, reason }, index) => (
        <li key={index} className="flex items-center gap-3 text-xs text-status-danger-fg">
          <Icon name="alert-circle" size="sm" />
          {file.name}: {reason}
        </li>
      ))}
    </ul>
  );
}
