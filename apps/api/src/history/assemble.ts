// Montagem do histórico de alterações a partir das linhas do `audit_log` de um
// registro, sem I/O: agrupa por save (`change_id`), dá o título pelas regras da
// spec e troca coluna e valor gravado por rótulo e texto formatado, pelos
// metadados de campo de `@crm/shared`.
import {
  DEFAULT_DISPLAY_CONTEXT,
  FIELD_REGISTRY,
  SYSTEM_AUTHOR,
  entityFields,
  formatFieldValue,
  type DisplayContext,
  type EntityField,
  type GrammaticalGender,
  type HistoryChange,
  type HistoryEntry,
  type HistoryKind,
  type RegisteredTable,
} from '@crm/shared';

/** Uma linha de `audit_log`, como a consulta a lê. */
export interface AuditRow {
  /** A identity da linha: ordena os saves por gravação. */
  id: number;
  changeId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  userId: string | null;
  createdAt: Date;
}

export interface AssembleOptions {
  entity: RegisteredTable;
  /** Nome de cada autor, pelo id; quem não está aqui aparece como "Sistema". */
  authors: ReadonlyMap<string, string>;
  context?: DisplayContext;
}

/**
 * A coluna que denuncia cadastro e exclusão: o `id` nunca muda num update, e o
 * wrapper o grava como valor novo no insert e como anterior no delete.
 */
const RECORD_KEY = 'id';

export const inflect = (word: string, gender: GrammaticalGender) => (gender === 'f' ? `${word.slice(0, -1)}a` : word);

function kindOf(rows: readonly AuditRow[]): HistoryKind {
  const key = rows.find((row) => row.field === RECORD_KEY);
  if (key?.oldValue === null) return 'created';
  if (key?.newValue === null) return 'deleted';
  return 'updated';
}

interface VisibleChange {
  change: HistoryChange;
  /** Gênero do rótulo do campo, para o título de uma alteração só. */
  gender: GrammaticalGender;
}

/**
 * O campo visível, formatado; nulo para coluna oculta. Se o save gravou a
 * coluna mais de uma vez (inseriu e alterou no mesmo envio), vale o valor
 * anterior da primeira linha e o novo da última.
 */
function formatChange(field: EntityField, rows: readonly AuditRow[], context: DisplayContext): VisibleChange | null {
  // Referência e jsonb expandido pedem o banco e o resolvedor: entram com os filhos.
  if (field.type === 'hidden' || field.type === 'reference' || field.type === 'jsonb') return null;
  const [first] = rows;
  const last = rows.at(-1);
  if (!first || !last) return null;
  return {
    change: {
      field: field.label,
      from: formatFieldValue(field, first.oldValue, context),
      to: formatFieldValue(field, last.newValue, context),
      ...(field.type === 'long_text' ? { long: true as const } : {}),
    },
    gender: field.gender ?? 'm',
  };
}

function titleOf(kind: HistoryKind, entity: RegisteredTable, changes: readonly VisibleChange[]): string {
  const { label, gender } = FIELD_REGISTRY[entity];
  if (kind === 'created') return `${label} ${inflect('cadastrado', gender)}`;
  if (kind === 'deleted') return `${label} ${inflect('excluído', gender)}`;
  const [only] = changes;
  return changes.length === 1 && only
    ? `${only.change.field} ${inflect('alterado', only.gender)}`
    : `${changes.length} alterações`;
}

/**
 * Uma entrada por save, mais nova primeiro, com os campos na ordem do registro.
 * Coluna oculta ou fora do registro não aparece; save sem nenhum campo visível
 * não vira entrada vazia: some.
 */
export function assembleHistory(
  rows: readonly AuditRow[],
  { entity, authors, context = DEFAULT_DISPLAY_CONTEXT }: AssembleOptions,
): HistoryEntry[] {
  const fields = entityFields(entity);

  // A linha de maior id é a mais recente do save: é ela que ordena as entradas.
  const saves = new Map<string, { newest: AuditRow; rows: AuditRow[] }>();
  for (const row of rows) {
    const save = saves.get(row.changeId);
    if (!save) saves.set(row.changeId, { newest: row, rows: [row] });
    else {
      save.rows.push(row);
      if (row.id > save.newest.id) save.newest = row;
    }
  }

  return [...saves.values()]
    .sort((a, b) => b.newest.id - a.newest.id)
    .flatMap(({ newest, rows: saved }): HistoryEntry[] => {
      const byId = (a: AuditRow, b: AuditRow) => a.id - b.id;
      const changes = fields.flatMap((field) => {
        const change = formatChange(field, saved.filter((row) => row.field === field.column).sort(byId), context);
        return change ? [change] : [];
      });
      if (changes.length === 0) return [];

      const kind = kindOf(saved);
      return [
        {
          changeId: newest.changeId,
          at: newest.createdAt.toISOString(),
          author: (newest.userId && authors.get(newest.userId)) || SYSTEM_AUTHOR,
          kind,
          title: titleOf(kind, entity, changes),
          changes: changes.map(({ change }) => change),
          children: [],
        },
      ];
    });
}
