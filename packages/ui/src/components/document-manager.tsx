import { type ComponentProps, type FormEvent, type ReactNode, useId, useRef, useState } from 'react';
import { cn } from '../lib/cn.js';
import { documentKind } from '../lib/document-kind.js';
import { formatBytes, type RejectedFile, screenFiles } from '../lib/media-files.js';
import { matchesSearch } from '../lib/search-text.js';
import { type UploadEntry, type UploadOptions, useUploadQueue } from '../lib/upload-queue.js';
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../primitives/dialog.js';
import { Input } from '../primitives/input.js';
import { Button } from './button.js';
import { ConfirmDialog } from './confirm-dialog.js';
import { EmptyState } from './empty-state.js';
import { Field } from './field.js';
import { Icon } from './icon.js';
import { IconButton, type IconButtonProps } from './icon-button.js';
import { RejectedFiles, UploadStatus, uploadDismissLabel } from './upload-status.js';

// Documentos de uma fazenda (ou de uma due diligence), agrupados pelas
// categorias da empresa. Não conhece R2 nem API: o envio é a função `upload`
// recebida, que reporta o progresso e respeita o cancelamento — a mesma fila
// do `MediaUploader`; baixar, editar e remover são de quem usa. Cada ação só
// aparece quando quem usa passa a função dela.

export type DocumentCategory = { id: string; name: string };

/** Documento já enviado. */
export type DocumentItem = {
  id: string;
  categoryId: string;
  /** Nome do arquivo. */
  name: string;
  /** Tamanho em bytes. */
  size: number;
  /** Define o ícone; sem ele, vale a extensão do nome. */
  contentType?: string;
  /** Data do envio: `Date` ou ISO ("2026-07-24", "2026-07-24T14:30:00Z"). */
  uploadedAt: Date | string;
  notes?: string;
};

export type DocumentUploadOptions = UploadOptions & {
  /** Categoria em que o arquivo entra. */
  categoryId: string;
};

/** O que a edição de um documento muda. */
export type DocumentChanges = { name: string; notes: string };

export type DocumentManagerProps<T> = Omit<ComponentProps<'div'>, 'children'> & {
  /** Categorias da empresa, na ordem de exibição; cada uma vira um grupo, mesmo vazia. */
  categories: DocumentCategory[];
  documents?: DocumentItem[];
  /** Envia um arquivo na categoria: reporta o progresso (0 a 100) e para quando `signal` aborta. Sem ela, não há "Adicionar". */
  upload?: (file: File, options: DocumentUploadOptions) => Promise<T>;
  /** Envio concluído: o resultado de `upload`, o arquivo e a categoria. */
  onUploaded?: (result: T, document: { file: File; categoryId: string }) => void;
  onDownload?: (document: DocumentItem) => void;
  /** Novo nome e nota, ao salvar a edição. */
  onEdit?: (document: DocumentItem, changes: DocumentChanges) => void;
  /** Remoção confirmada. */
  onRemove?: (document: DocumentItem) => void;
  /** Tipos aceitos, na sintaxe do `accept` do `<input type="file">`; vazio aceita tudo. */
  accept?: string;
  /** Tamanho máximo de cada arquivo, em bytes. */
  maxSize?: number;
  /** Quantos arquivos sobem ao mesmo tempo. */
  concurrency?: number;
  disabled?: boolean;
};

const dateFormat = new Intl.DateTimeFormat('pt-BR');

/** "24/07/2026". Data sem hora é do calendário, não um instante em UTC: não volta um dia no fuso do Brasil. */
function formatDate(value: Date | string) {
  const day = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.exec(value);
  if (day) {
    const [year, month, date] = value.split('-').map(Number) as [number, number, number];
    return dateFormat.format(new Date(year, month - 1, date));
  }
  return dateFormat.format(new Date(value));
}

export function DocumentManager<T>({
  className,
  categories,
  documents = [],
  upload,
  onUploaded,
  onDownload,
  onEdit,
  onRemove,
  accept = '',
  maxSize,
  concurrency = 3,
  disabled = false,
  ...props
}: DocumentManagerProps<T>) {
  const baseId = useId();
  const headingId = (category: DocumentCategory) => `${baseId}${category.id}`;
  const [query, setQuery] = useState('');
  const [rejected, setRejected] = useState<RejectedFile[]>([]);
  // o documento fica guardado depois de fechar: o título não some durante a animação de saída
  const [removal, setRemoval] = useState<{ document: DocumentItem; open: boolean } | null>(null);
  const [editing, setEditing] = useState<{ document: DocumentItem; open: boolean } | null>(null);

  const queue = useUploadQueue<T, string>({
    // o dado de cada arquivo na fila é a categoria em que ele entra
    upload: (file, options, categoryId) => upload!(file, { ...options, categoryId }),
    concurrency,
    complete: (result, { file, payload: categoryId }) => onUploaded?.(result, { file, categoryId }),
  });

  const add = (category: DocumentCategory, files: File[]) => {
    const screened = screenFiles(files, { accept, maxSize });
    setRejected(screened.rejected);
    queue.add(screened.accepted, () => category.id);
  };

  const groups = categories
    .map((category) => ({
      category,
      documents: documents.filter((item) => item.categoryId === category.id && matchesSearch(item.name, query)),
      entries: queue.entries.filter((entry) => entry.payload === category.id && matchesSearch(entry.file.name, query)),
    }))
    // na busca, só os grupos com resultado
    .filter((group) => !query.trim() || group.documents.length > 0 || group.entries.length > 0);

  return (
    <div data-slot="document-manager" className={cn('flex flex-col gap-7', className)} {...props}>
      <Input
        pill
        icon="search"
        type="search"
        placeholder="Buscar documentos"
        aria-label="Buscar documentos"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <RejectedFiles files={rejected} />

      {categories.length === 0 ? (
        <EmptyState
          compact
          icon="file-text"
          title="Nenhuma categoria de documento"
          description="Cadastre as categorias da empresa para organizar os documentos."
        />
      ) : groups.length === 0 ? (
        <EmptyState
          compact
          icon="search-x"
          title="Nenhum documento encontrado"
          description="Confira o nome digitado ou limpe a busca."
        />
      ) : (
        groups.map(({ category, documents: listed, entries }) => (
          <DocumentGroup
            key={category.id}
            category={category}
            headingId={headingId(category)}
            count={listed.length}
            accept={accept}
            disabled={disabled}
            onAdd={upload && ((files) => add(category, files))}
          >
            {listed.map((item) => (
              <DocumentRow
                key={item.id}
                name={item.name}
                contentType={item.contentType}
                meta={
                  <>
                    <span className="gv-num">{formatBytes(item.size)}</span> · {formatDate(item.uploadedAt)}
                  </>
                }
                notes={item.notes}
                actions={
                  <>
                    {onDownload && (
                      <RowAction icon="download" label={`Baixar ${item.name}`} disabled={disabled} onClick={() => onDownload(item)} />
                    )}
                    {onEdit && (
                      <RowAction
                        icon="pencil"
                        label={`Editar ${item.name}`}
                        disabled={disabled}
                        onClick={() => setEditing({ document: item, open: true })}
                      />
                    )}
                    {onRemove && (
                      <RowAction
                        icon="trash-2"
                        label={`Remover ${item.name}`}
                        disabled={disabled}
                        onClick={() => setRemoval({ document: item, open: true })}
                      />
                    )}
                  </>
                }
              />
            ))}
            {entries.map((entry) => (
              <QueueRow
                key={entry.key}
                entry={entry}
                disabled={disabled}
                onRemove={() => queue.remove(entry)}
                onRetry={() => queue.retry(entry)}
              />
            ))}
          </DocumentGroup>
        ))
      )}

      <ConfirmDialog
        open={removal?.open ?? false}
        onOpenChange={(open) => setRemoval((current) => current && { ...current, open })}
        title={`Remover ${removal?.document.name}?`}
        description="O arquivo sai da lista de documentos."
        confirmLabel="Remover"
        confirmIcon="trash-2"
        onConfirm={() => removal && onRemove?.(removal.document)}
        // o botão que abriu o diálogo saiu da lista com o documento: o foco vai para o título da categoria
        focusAfterConfirm={() => {
          const category = categories.find((item) => item.id === removal?.document.categoryId);
          return category && document.getElementById(headingId(category));
        }}
      />

      <Dialog
        open={editing?.open ?? false}
        onOpenChange={(open) => setEditing((current) => current && { ...current, open })}
      >
        {editing && (
          <EditDocumentDialog
            key={editing.document.id}
            document={editing.document}
            onSave={(changes) => {
              onEdit?.(editing.document, changes);
              setEditing({ ...editing, open: false });
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

type DocumentGroupProps = {
  category: DocumentCategory;
  headingId: string;
  /** Documentos enviados no grupo (os da busca, quando há busca). */
  count: number;
  accept: string;
  disabled: boolean;
  /** Arquivos escolhidos para a categoria; sem ela, não há "Adicionar". */
  onAdd?: (files: File[]) => void;
  /** Linhas de documento e de envio. */
  children: ReactNode[];
};

/** Uma categoria: título com a contagem, "Adicionar" e as linhas; sem linha, o vazio dela. */
function DocumentGroup({ category, headingId, count, accept, disabled, onAdd, children }: DocumentGroupProps) {
  const input = useRef<HTMLInputElement>(null);
  const nameId = `${headingId}-name`;
  const empty = children.flat().length === 0;
  return (
    <section aria-labelledby={nameId} className="flex flex-col gap-3">
      <header className="flex items-center justify-between gap-5">
        {/* alvo do foco quando o documento removido leva junto o botão que abriu a confirmação */}
        <h4 id={headingId} tabIndex={-1} className="text-sm font-semibold text-text-heading">
          <span id={nameId}>{category.name}</span>{' '}
          <span className="font-regular text-text-faint">
            · <span className="gv-num">{count}</span>
          </span>
        </h4>
        {onAdd && (
          <>
            <Button
              size="sm"
              variant="soft"
              icon="plus"
              aria-label={`Adicionar em ${category.name}`}
              disabled={disabled}
              onClick={() => input.current?.click()}
            >
              Adicionar
            </Button>
            <input
              ref={input}
              type="file"
              multiple
              hidden
              accept={accept || undefined}
              disabled={disabled}
              aria-label={`Selecionar arquivos para ${category.name}`}
              onChange={(event) => {
                onAdd(Array.from(event.target.files ?? []));
                // limpa a seleção: escolher o mesmo arquivo de novo dispara outra vez
                event.target.value = '';
              }}
            />
          </>
        )}
      </header>
      <ul aria-label={`Documentos de ${category.name}`} className="flex flex-col">
        {children}
      </ul>
      {empty && <p className="m-0 py-4 text-sm text-text-faint">Nenhum documento nesta categoria.</p>}
    </section>
  );
}

type DocumentRowProps = {
  name: string;
  contentType?: string;
  /** Linha sob o nome: tamanho e data, ou a situação do envio. */
  meta: ReactNode;
  notes?: string;
  actions: ReactNode;
};

/** Linha da lista: ícone do tipo, nome, detalhes e as ações no fim. */
function DocumentRow({ name, contentType, meta, notes, actions }: DocumentRowProps) {
  const kind = documentKind(name, contentType);
  return (
    <li aria-label={name} className="flex items-center gap-5 border-b border-border-subtle py-4 last:border-b-0">
      <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-surface-sunken text-text-muted">
        <Icon name={kind.icon} size="sm" title={kind.label} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-sm font-medium leading-snug text-text-body">{name}</span>
        <span className="text-xs leading-snug text-text-faint">{meta}</span>
        {notes && <span className="text-xs leading-snug text-text-muted">{notes}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-1">{actions}</span>
    </li>
  );
}

type QueueRowProps = {
  entry: UploadEntry<string>;
  disabled: boolean;
  onRemove: () => void;
  onRetry: () => void;
};

/** Arquivo na fila de envio: o progresso ou a falha no lugar dos detalhes. */
function QueueRow({ entry, disabled, onRemove, onRetry }: QueueRowProps) {
  return (
    <DocumentRow
      name={entry.file.name}
      contentType={entry.file.type}
      meta={<UploadStatus entry={entry} disabled={disabled} onRetry={onRetry} className="pt-1" />}
      actions={<RowAction icon="x" label={uploadDismissLabel(entry)} disabled={disabled} onClick={onRemove} />}
    />
  );
}

function RowAction(props: Omit<IconButtonProps, 'size' | 'variant'>) {
  return <IconButton size="sm" variant="ghost" {...props} />;
}

type EditDocumentDialogProps = {
  document: DocumentItem;
  onSave: (changes: DocumentChanges) => void;
};

/** Renomear e editar a nota; o nome não fica vazio. */
function EditDocumentDialog({ document, onSave }: EditDocumentDialogProps) {
  const [name, setName] = useState(document.name);
  const [notes, setNotes] = useState(document.notes ?? '');
  const [missingName, setMissingName] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setMissingName(true);
      return;
    }
    onSave({ name: name.trim(), notes: notes.trim() });
  };

  return (
    <DialogContent>
      <form noValidate onSubmit={submit} className="contents">
        <DialogHeader>
          <DialogTitle>Editar documento</DialogTitle>
          <DialogDescription>{document.name}</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-6">
          <Field label="Nome" required error={missingName && 'Informe o nome do documento.'}>
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setMissingName(false);
              }}
            />
          </Field>
          <Field label="Nota">
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button type="submit" icon="check">
            Salvar
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
