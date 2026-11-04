import {
  findVocabulary,
  type CreateVocabularyEntryInput,
  VOCABULARY_STATUSES,
  vocabularyListQuerySchema,
  type VocabularyDefinition,
  type VocabularyEntry,
  type VocabularyKey,
  type VocabularyStatus,
} from '@crm/shared';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  IconButton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@crm/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { ListPage } from '../../listing/list-page.js';
import { ErrorMessage } from '../../shell/error-message.js';
import { PageHeader } from '../../shell/page-header.js';
import { tenantQueryKey, useTenantSlug } from '../../shell/tenant-query.js';
import { createEntry, deleteEntry, fetchEntries, updateEntry } from './vocabulary-api.js';
import { VocabularyEntryDialog } from './vocabulary-entry-dialog.js';

const STATUS_LABELS: Record<VocabularyStatus, string> = { all: 'Todas', active: 'Ativas', inactive: 'Inativas' };

/** Concordância do rótulo do cadastro: "Nova cultura" / "Novo status". */
const byGender = (vocabulary: VocabularyDefinition, feminine: string, masculine: string) =>
  vocabulary.gender === 'f' ? feminine : masculine;

type Editing = { kind: 'create' } | { kind: 'rename'; entry: VocabularyEntry };

/** Página de um cadastro auxiliar: a lista da fundação, com o diálogo de entrada e as ações de linha. */
export function VocabularyPage() {
  const vocabulary = findVocabulary(useParams().vocabulary ?? '');
  // A chave é da URL: fora do registro, volta ao menu de Configurações.
  if (!vocabulary) return <Navigate to=".." replace />;
  return <VocabularyList key={vocabulary.key} vocabulary={vocabulary} />;
}

function VocabularyList({ vocabulary }: { vocabulary: VocabularyDefinition & { key: VocabularyKey } }) {
  const { key, label } = vocabulary;
  const meanings = vocabulary.systemMeaning?.options;
  const slug = useTenantSlug();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Editing>();
  const [deleting, setDeleting] = useState<VocabularyEntry>();
  const [actionError, setActionError] = useState<string>();

  const refresh = () => queryClient.invalidateQueries({ queryKey: tenantQueryKey(slug, 'settings', 'vocabularies', key) });
  const toggle = useMutation({
    mutationFn: (entry: VocabularyEntry) => updateEntry(slug, key, entry.id, { active: !entry.active }),
    onSuccess: refresh,
    onError: (error) => setActionError(error.message),
  });
  const remove = useMutation({
    mutationFn: (entry: VocabularyEntry) => deleteEntry(slug, key, entry.id),
    onSuccess: refresh,
    onError: (error) => setActionError(error.message),
  });

  const save = async (input: CreateVocabularyEntryInput) => {
    if (editing?.kind === 'rename') await updateEntry(slug, key, editing.entry.id, { name: input.name });
    else await createEntry(slug, key, input);
    setEditing(undefined);
    await refresh();
  };

  const newLabel = `${byGender(vocabulary, 'Nova', 'Novo')} ${label.singular.toLowerCase()}`;

  const situation = (entry: VocabularyEntry) =>
    entry.active ? <Badge tone="success">Ativa</Badge> : <Badge>Inativa</Badge>;

  const actions = (entry: VocabularyEntry) => (
    <div className="flex items-center justify-end gap-2">
      <IconButton size="sm" icon="pencil" label={`Renomear ${entry.name}`} onClick={() => setEditing({ kind: 'rename', entry })} />
      <Button size="sm" variant="ghost" onClick={() => toggle.mutate(entry)}>
        {entry.active ? 'Desativar' : 'Reativar'}
      </Button>
      <IconButton size="sm" icon="trash-2" label={`Excluir ${entry.name}`} onClick={() => setDeleting(entry)} />
    </div>
  );

  return (
    <div className="flex flex-col gap-gap-shell">
      <PageHeader
        title={label.plural}
        action={
          <Button icon="plus" onClick={() => setEditing({ kind: 'create' })}>
            {newLabel}
          </Button>
        }
      />
      {actionError && <ErrorMessage>{actionError}</ErrorMessage>}
      <ListPage
        schema={vocabularyListQuerySchema}
        queryKey={['settings', 'vocabularies', key]}
        fetchPage={(tenantSlug, query) => fetchEntries(tenantSlug, key, query)}
        searchPlaceholder={`Buscar ${label.singular.toLowerCase()}`}
        columns={[
          { key: 'name', label: 'Nome', strong: true, sortable: true },
          ...(meanings
            ? [{ key: 'systemMeaning', label: 'Significado', render: (entry: VocabularyEntry) => meanings[entry.systemMeaning ?? ''] }]
            : []),
          { key: 'active', label: 'Situação', render: situation },
          { key: 'actions', label: <span className="sr-only">Ações</span>, align: 'right', render: actions },
        ]}
        renderCard={(entry) => (
          <Card title={entry.name} subtitle={situation(entry)} action={actions(entry)} />
        )}
        empty={{
          icon: 'inbox',
          title: `${byGender(vocabulary, 'Nenhuma', 'Nenhum')} ${label.singular.toLowerCase()} ${byGender(vocabulary, 'cadastrada', 'cadastrado')}`,
          description: `As entradas de ${label.plural.toLowerCase()} aparecem nos cadastros que as usam.`,
        }}
      >
        {({ query, update }) => (
          <Select value={query.status} onValueChange={(status) => update({ status: status as VocabularyStatus })}>
            <SelectTrigger size="sm" aria-label="Situação">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOCABULARY_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </ListPage>
      {editing && (
        <VocabularyEntryDialog
          entry={editing.kind === 'rename' ? editing.entry : undefined}
          vocabulary={vocabulary}
          title={editing.kind === 'rename' ? `Renomear ${label.singular.toLowerCase()}` : newLabel}
          onClose={() => setEditing(undefined)}
          onSubmit={save}
        />
      )}
      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(open) => !open && setDeleting(undefined)}
        title={`Excluir ${deleting?.name ?? ''}?`}
        description="A exclusão não pode ser desfeita. Entrada em uso não é excluída: desative-a."
        confirmLabel="Excluir"
        confirmIcon="trash-2"
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </div>
  );
}
