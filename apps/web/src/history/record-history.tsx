import { type HistoryEntry, type HistoryKind, type HistoryPage, historyPageSchema } from '@crm/shared';
import { AuditTimeline, type AuditTimelineItem, Button, EmptyState, type IconName } from '@crm/ui';
import { formatInstant } from '../lib/instant.js';
import { ErrorMessage } from '../shell/error-message.js';
import { LoadFailedState, LoadingState } from '../shell/page-state.js';
import { ResourceNotFoundError, useTenantInfiniteQuery } from '../shell/tenant-query.js';

// Histórico de alterações de um registro, para qualquer ficha: lê a rota de
// histórico do recurso (`GET /<recurso>/:id/history`), página a página pelo
// cursor, e entrega à `AuditTimeline`. A API manda tudo pronto para exibir,
// menos o instante, que sai aqui no fuso do navegador. O 404 (registro
// inexistente ou fora do escopo de dados) sobe como `ResourceNotFoundError`.

/** A resposta da rota de histórico do recurso, como o cliente RPC a devolve. */
export interface HistoryResponse {
  status: number;
  ok: boolean;
  json(): Promise<unknown>;
}

export interface RecordHistoryProps {
  /** Chave do registro no cache da empresa (`['farms', id]`); o histórico entra depois dela. */
  queryKey: readonly unknown[];
  /** Pede uma página à rota de histórico do recurso; sem cursor, a primeira. */
  fetchPage: (slug: string, cursor: string | undefined) => Promise<HistoryResponse>;
}

const KIND_ICON: Record<HistoryKind, IconName | undefined> = { created: 'plus', updated: undefined, deleted: 'trash-2' };

function toItem(entry: HistoryEntry): AuditTimelineItem {
  return {
    id: entry.changeId,
    title: entry.title,
    date: formatInstant(entry.at),
    author: entry.author,
    icon: KIND_ICON[entry.kind],
    changes: entry.changes,
    // os valores iniciais já estão na ficha: abertos, empurrariam para baixo o que mudou depois
    changesLabel: entry.kind === 'created' ? 'Ver valores iniciais' : undefined,
    related: entry.children,
  };
}

async function readPage(response: HistoryResponse): Promise<HistoryPage> {
  if (response.status === 404) throw new ResourceNotFoundError();
  if (!response.ok) throw new Error(`Falha ao carregar o histórico: HTTP ${response.status}.`);
  return historyPageSchema.parse(await response.json());
}

export function RecordHistory({ queryKey, fetchPage }: RecordHistoryProps) {
  const history = useTenantInfiniteQuery(
    [...queryKey, 'history'],
    async (slug, cursor) => readPage(await fetchPage(slug, cursor)),
    (page) => page.nextCursor,
  );

  if (history.isPending) return <LoadingState />;
  if (!history.data) {
    return <LoadFailedState inline title="Não foi possível carregar o histórico" onRetry={() => void history.refetch()} />;
  }

  const entries = history.data.pages.flatMap((page) => page.entries);
  if (entries.length === 0) {
    return (
      <EmptyState compact title="Nenhuma alteração registrada" description="As alterações salvas neste registro aparecem aqui." />
    );
  }

  return (
    <div className="flex flex-col items-start gap-5">
      <AuditTimeline aria-label="Histórico de alterações" items={entries.map(toItem)} />
      {history.hasNextPage && (
        <>
          <Button variant="secondary" size="sm" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>
            Carregar mais
          </Button>
          {history.isFetchNextPageError && <ErrorMessage>Não foi possível carregar mais alterações. Tente de novo.</ErrorMessage>}
        </>
      )}
    </div>
  );
}
