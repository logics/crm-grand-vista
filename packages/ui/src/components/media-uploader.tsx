import { type ComponentProps, type DragEvent, type ReactNode, type SyntheticEvent, useRef, useState } from 'react';
import { cn } from '../lib/cn.js';
import { mediaFill, mediaFrame } from '../lib/styles.js';
import { type FieldControlProps, useFieldControl } from '../lib/field-control.js';
import { formatBytes, type RejectedFile, screenFiles } from '../lib/media-files.js';
import { reorderInstructions, useReorder } from '../lib/reorder.js';
import { type UploadEntry, type UploadOptions, useUploadQueue } from '../lib/upload-queue.js';
import { Button } from './button.js';
import { ConfirmDialog } from './confirm-dialog.js';
import { Icon } from './icon.js';
import { IconButton, type IconButtonProps } from './icon-button.js';
import { RejectedFiles, UploadStatus, uploadDismissLabel } from './upload-status.js';

// Envio de fotos e vídeos de uma galeria. Não conhece R2 nem API: o envio é a
// função `upload` recebida, que reporta o progresso e respeita o cancelamento;
// gravar o resultado, remover e reordenar são de quem usa. Antes de subir, cada
// arquivo ganha uma prévia local, de onde saem largura, altura e duração.

export type MediaKind = 'photo' | 'video';

export type MediaUploadOptions = UploadOptions;

/** O arquivo enviado e o que a prévia leu dele, para quem grava. */
export type UploadedMedia = {
  file: File;
  kind: MediaKind;
  width?: number;
  height?: number;
  /** Só de vídeo, arredondada para o segundo. */
  durationSeconds?: number;
};

/** Mídia já enviada, na ordem de exibição. */
export type MediaItem = {
  id: string;
  kind: MediaKind;
  /** Nome do arquivo; também é o texto alternativo da miniatura. */
  name: string;
  /** Endereço da miniatura; sem ele, fica o espaço em areia. */
  thumbnail?: string;
};

type Dimensions = Pick<UploadedMedia, 'width' | 'height' | 'durationSeconds'>;

/** Prévia de um arquivo na fila e a leitura das dimensões, que termina num evento do elemento. */
type Preview = {
  kind: MediaKind;
  url: string;
  dimensions: Promise<Dimensions>;
  settle: (dimensions: Dimensions) => void;
};

function createPreview(file: File): Preview {
  let settle!: Preview['settle'];
  const dimensions = new Promise<Dimensions>((resolve) => {
    settle = resolve;
  });
  return {
    kind: file.type.startsWith('video/') ? 'video' : 'photo',
    url: URL.createObjectURL(file),
    dimensions,
    settle,
  };
}

function readDimensions(element: HTMLImageElement | HTMLVideoElement): Dimensions {
  if (element instanceof HTMLVideoElement) {
    return {
      width: element.videoWidth,
      height: element.videoHeight,
      durationSeconds: Number.isFinite(element.duration) ? Math.round(element.duration) : undefined,
    };
  }
  return { width: element.naturalWidth, height: element.naturalHeight };
}

const kindLabel = { photo: 'Foto', video: 'Vídeo' } as const satisfies Record<MediaKind, string>;

/** Ladrilhos de 160px (4 × --space-10) no mínimo, quantos couberem na linha. */
const tileGrid = 'grid grid-cols-[repeat(auto-fill,minmax(calc(4*var(--space-10)),1fr))] gap-5';

/** Sem resposta da prévia nesse prazo, o resultado sai sem dimensões e a vaga se libera. */
const dimensionsTimeout = 5000;

const withoutDimensions = () =>
  new Promise<Dimensions>((resolve) => {
    setTimeout(() => resolve({}), dimensionsTimeout);
  });

export type MediaUploaderProps<T> = Omit<ComponentProps<'div'>, 'children'> & {
  /** Envia um arquivo: reporta o progresso (0 a 100) por `onProgress` e para quando `signal` aborta. */
  upload: (file: File, options: MediaUploadOptions) => Promise<T>;
  /** Envio concluído: o resultado de `upload` e o arquivo com as dimensões lidas. */
  onUploaded?: (result: T, media: UploadedMedia) => void;
  /** Mídia já enviada, na ordem de exibição. */
  items?: MediaItem[];
  /** Nova ordem, pelos ids, ao soltar um item movido. Sem ela, a grade não reordena. */
  onReorder?: (ids: string[]) => void;
  /** Remoção confirmada. Sem ela, a grade não remove. */
  onRemove?: (item: MediaItem) => void;
  /** Tipos aceitos, na sintaxe do `accept` do `<input type="file">`. */
  accept?: string;
  /** Tamanho máximo de cada arquivo, em bytes. */
  maxSize?: number;
  /** Quantos arquivos a galeria comporta, contando os já enviados. */
  maxFiles?: number;
  /** Quantos arquivos sobem ao mesmo tempo. */
  concurrency?: number;
  /** Rótulo do botão de envio. */
  uploadLabel?: string;
  /** Rótulo do espaço em areia quando não há mídia. */
  placeholder?: string;
  disabled?: boolean;
};

export function MediaUploader<T>({
  className,
  upload,
  onUploaded,
  items = [],
  onReorder,
  onRemove,
  accept = 'image/*,video/*',
  maxSize,
  maxFiles,
  concurrency = 3,
  uploadLabel = 'Enviar fotos',
  placeholder = 'Fotos da propriedade',
  disabled = false,
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  ...props
}: MediaUploaderProps<T>) {
  // o botão de envio é o controle que o `Field` nomeia e descreve
  const control = useFieldControl<FieldControlProps>({
    id,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-required': ariaRequired,
  });
  const input = useRef<HTMLInputElement>(null);
  const uploadButton = useRef<HTMLButtonElement>(null);
  const [rejected, setRejected] = useState<RejectedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  // o item fica guardado depois de fechar: o título não some durante a animação de saída
  const [removal, setRemoval] = useState<{ item: MediaItem; open: boolean } | null>(null);

  const queue = useUploadQueue<T, Preview>({
    // a prévia é interna: não vai para o `upload` de quem usa
    upload: (file, options) => upload(file, options),
    concurrency,
    release: (preview) => URL.revokeObjectURL(preview.url),
    async complete(result, { file, payload }) {
      const dimensions = await Promise.race([payload.dimensions, withoutDimensions()]);
      onUploaded?.(result, { file, kind: payload.kind, ...dimensions });
    },
  });

  const reorder = useReorder({ items, getId: (item) => item.id, getLabel: (item) => item.name, onReorder, disabled });

  const add = (files: File[]) => {
    const screened = screenFiles(files, {
      accept,
      maxSize,
      maxFiles,
      current: items.length + queue.entries.length,
    });
    setRejected(screened.rejected);
    queue.add(screened.accepted, createPreview);
  };

  // só arquivos do sistema: o arrastar da grade é reordenação, não envio
  const acceptsDrag = (event: DragEvent) => !disabled && event.dataTransfer.types.includes('Files');
  const dropZone = {
    onDragOver(event: DragEvent) {
      if (!acceptsDrag(event)) return;
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave(event: DragEvent) {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
    },
    onDrop(event: DragEvent) {
      if (!acceptsDrag(event)) return;
      event.preventDefault();
      setDragging(false);
      add(Array.from(event.dataTransfer.files));
    },
  };

  const limits = [
    maxSize !== undefined && `Até ${formatBytes(maxSize)} por arquivo`,
    maxFiles !== undefined && `até ${maxFiles} arquivos`,
  ].filter(Boolean);

  return (
    <div
      data-slot="media-uploader"
      data-disabled={disabled || undefined}
      className={cn('flex flex-col gap-6', className)}
      {...props}
    >
      <div
        role="region"
        aria-label="Área de envio"
        data-dragging={dragging || undefined}
        className={cn(
          'flex flex-col items-center gap-4 rounded-media border border-dashed border-border-default bg-surface-muted px-7 py-9 text-center',
          'transition-control data-dragging:border-brand-accent data-dragging:bg-surface-sunken',
        )}
        {...dropZone}
      >
        {items.length === 0 && queue.entries.length === 0 && <span className="gv-eyebrow">{placeholder}</span>}
        <p className="m-0 text-sm text-text-muted">Arraste fotos e vídeos para cá</p>
        <Button
          ref={uploadButton}
          variant="secondary"
          icon="upload"
          disabled={disabled}
          onClick={() => input.current?.click()}
          {...control}
        >
          {uploadLabel}
        </Button>
        {limits.length > 0 && <span className="text-xs text-text-faint">{limits.join(' · ')}</span>}
        <input
          ref={input}
          type="file"
          multiple
          hidden
          accept={accept}
          disabled={disabled}
          aria-label="Selecionar arquivos"
          onChange={(event) => {
            add(Array.from(event.target.files ?? []));
            // limpa a seleção: escolher o mesmo arquivo de novo dispara outra vez
            event.target.value = '';
          }}
        />
      </div>

      <RejectedFiles files={rejected} />

      {items.length > 0 && (
        <ul aria-label="Mídia enviada" className={tileGrid} {...reorder.listProps}>
          {reorder.ordered.map((item) => (
            <MediaTile
              key={item.id}
              name={item.name}
              moving={reorder.movingId === item.id}
              {...reorder.itemProps(item)}
              thumbnail={
                item.thumbnail ? (
                  <img src={item.thumbnail} alt={item.name} loading="lazy" className={mediaFill} />
                ) : (
                  <KindPlaceholder kind={item.kind} />
                )
              }
              badge={item.kind === 'video' && item.thumbnail && <Icon name="video" title={kindLabel.video} />}
              start={
                onReorder && (
                  <TileAction icon="grip-vertical" label={`Mover ${item.name}`} {...reorder.handleProps(item)} />
                )
              }
              end={
                onRemove && (
                  <TileAction
                    icon="trash-2"
                    label={`Remover ${item.name}`}
                    disabled={disabled}
                    onClick={() => setRemoval({ item, open: true })}
                  />
                )
              }
            />
          ))}
        </ul>
      )}

      {queue.entries.length > 0 && (
        <ul aria-label="Envios em andamento" className={tileGrid}>
          {queue.entries.map((entry) => (
            <QueueTile key={entry.key} entry={entry} disabled={disabled} onRemove={queue.remove} onRetry={queue.retry} />
          ))}
        </ul>
      )}

      <span id={reorder.instructionsId} hidden>
        {reorderInstructions}
      </span>
      <div role="status" className="sr-only">
        {reorder.announcement}
      </div>

      <ConfirmDialog
        open={removal?.open ?? false}
        onOpenChange={(open) => setRemoval((current) => current && { ...current, open })}
        title={`Remover ${removal?.item.name}?`}
        description="O arquivo sai da galeria."
        confirmLabel="Remover"
        confirmIcon="trash-2"
        onConfirm={() => removal && onRemove?.(removal.item)}
        // o botão que abriu o diálogo saiu da grade com o item: o foco vai para o envio
        focusAfterConfirm={() => uploadButton.current}
      />
    </div>
  );
}

type QueueTileProps = {
  entry: UploadEntry<Preview>;
  disabled: boolean;
  onRemove: (entry: UploadEntry<Preview>) => void;
  onRetry: (entry: UploadEntry<Preview>) => void;
};

/** Arquivo na fila: a prévia local, de onde saem as dimensões, e o progresso ou a falha. */
function QueueTile({ entry, disabled, onRemove, onRetry }: QueueTileProps) {
  const { file, payload: preview } = entry;
  const failed = entry.status === 'error';
  // HEIC no Chrome, vídeo sem codec: sem prévia, fica a areia; o envio segue
  const [unreadable, setUnreadable] = useState(false);
  const media = {
    'data-preview': file.name,
    className: cn(mediaFill, !failed && 'opacity-60'),
    onError: () => {
      preview.settle({});
      setUnreadable(true);
    },
  };
  return (
    <MediaTile
      name={file.name}
      thumbnail={
        unreadable ? (
          <KindPlaceholder kind={preview.kind} />
        ) : preview.kind === 'video' ? (
          <video
            {...media}
            src={preview.url}
            muted
            preload="metadata"
            onLoadedMetadata={(event: SyntheticEvent<HTMLVideoElement>) => preview.settle(readDimensions(event.currentTarget))}
          />
        ) : (
          <img {...media} src={preview.url} alt="" onLoad={(event) => preview.settle(readDimensions(event.currentTarget))} />
        )
      }
      end={
        <TileAction icon="x" label={uploadDismissLabel(entry)} disabled={disabled} onClick={() => onRemove(entry)} />
      }
    >
      <UploadStatus entry={entry} disabled={disabled} onRetry={() => onRetry(entry)} />
    </MediaTile>
  );
}

/** Botão no canto da miniatura: branco com filete, para destacar sobre a foto. */
function TileAction(props: Omit<IconButtonProps, 'size' | 'variant'>) {
  return <IconButton size="sm" variant="outline" {...props} />;
}

/** Sem miniatura: o rótulo do tipo sobre a areia do ladrilho, nunca imagem genérica. */
function KindPlaceholder({ kind }: { kind: MediaKind }) {
  return <span className="gv-eyebrow">{kindLabel[kind]}</span>;
}

type MediaTileProps = Omit<ComponentProps<'li'>, 'children'> & {
  name: string;
  thumbnail: ReactNode;
  /** Marca no canto inferior da miniatura (vídeo). */
  badge?: ReactNode;
  /** Botão no canto superior esquerdo da miniatura. */
  start?: ReactNode;
  /** Botão no canto superior direito da miniatura. */
  end?: ReactNode;
  /** Item sendo movido: anel dourado. */
  moving?: boolean;
  /** Situação sob o nome: progresso, falha. */
  children?: ReactNode;
};

/** Ladrilho da grade: miniatura sobre a areia, nome e situação. */
function MediaTile({ className, name, thumbnail, badge, start, end, moving = false, children, ...props }: MediaTileProps) {
  return (
    <li aria-label={name} className={cn('flex min-w-0 flex-col gap-3', className)} {...props}>
      {/* 4:3, a proporção das fotos de campo */}
      <div
        className={cn(
          mediaFrame,
          'aspect-4/3 transition-shadow',
          moving && 'shadow-ring-focus',
        )}
      >
        {thumbnail}
        {badge && (
          <span className="absolute bottom-3 left-3 grid size-control-height-sm place-items-center rounded-pill bg-surface-card text-text-body shadow-xs">
            {badge}
          </span>
        )}
        {start && <div className="absolute top-3 left-3">{start}</div>}
        {end && <div className="absolute top-3 right-3">{end}</div>}
      </div>
      <span className="truncate text-xs text-text-muted">{name}</span>
      {children}
    </li>
  );
}
