// Montagem do histórico de alterações a partir das linhas do `audit_log` de um
// registro e dos filhos declarados, sem I/O: agrupa por save (`change_id`), dá
// o título pelas regras da spec e troca coluna e valor gravado por rótulo e
// texto formatado, pelos metadados de campo de `@crm/shared`. O que pede o
// banco — nome dos autores e das referências — chega já lido.
import {
  DEFAULT_DISPLAY_CONTEXT,
  FIELD_REGISTRY,
  SYSTEM_AUTHOR,
  metaFields,
  formatFieldValue,
  type DisplayContext,
  type EntityField,
  type EntityMeta,
  type GrammaticalGender,
  type HistoryChange,
  type HistoryChild,
  type HistoryEntry,
  type HistoryKind,
  type ReferenceField,
} from '@crm/shared';
import type { EffectiveAccess } from '../authorization/effective-access.js';

/** Uma linha de `audit_log`, como a consulta a lê. */
export interface AuditRow {
  /** A identity da linha: ordena os saves por gravação. */
  id: number;
  entity: string;
  entityId: string;
  changeId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  userId: string | null;
  createdAt: Date;
}

/** Um filho como o filtro de visibilidade o vê: cada coluna, no texto do `audit_log`. */
export type ChildState = Readonly<Record<string, string | null>>;

/**
 * Tabela filha que o módulo declara no histórico do registro
 * (`farm_documents.farm_id`). As alterações dela entram na entrada do mesmo
 * save, como linha própria — inclusive depois de excluída.
 */
export interface HistoryChildDeclaration<Table extends string = string> {
  entity: Table;
  /** A coluna que aponta para o pai: é por ela que o filho é achado. */
  parentColumn: string;
  /** Coluna que nomeia o filho no título da linha ("Documento adicionado: Matrícula 12.345"). */
  nameColumn?: string;
  /**
   * Se o leitor vê o filho — a quarta camada de controle de acesso. Decide uma
   * vez por filho, sobre o último estado dele (o de antes da exclusão, se foi
   * excluído), e vale para todos os saves dele. Roda antes da paginação: filho
   * barrado some por inteiro, não aparece, não conta no título nem ocupa página.
   */
  canSee?: (reader: EffectiveAccess, child: ChildState) => boolean;
}

/** Nome atual de cada registro referenciado, por `referenceKey` e pelo id. */
export type ReferenceNames = ReadonlyMap<string, ReadonlyMap<string, string>>;

/** Referência a registro que não existe mais. */
export const DELETED_REFERENCE = '(registro excluído)';

type Reference = ReferenceField['references'];

/** A chave de `ReferenceNames`: a tabela e a coluna de nome. */
export const referenceKey = ({ table, nameColumn }: Reference) => `${table}.${nameColumn}`;

/** O registro cujo histórico se monta, e onde estão os metadados dele e dos filhos. */
export interface HistorySubject {
  entity: string;
  entityId: string;
  children?: readonly HistoryChildDeclaration[];
  /** Os metadados de campo; o registro de `@crm/shared` por padrão. */
  registry?: Readonly<Record<string, EntityMeta>>;
}

export interface AssembleOptions extends HistorySubject {
  /** Nome de cada autor, pelo id; quem não está aqui aparece como "Sistema". */
  authors: ReadonlyMap<string, string>;
  references: ReferenceNames;
  /** Quem lê, para o filtro de visibilidade dos filhos. */
  reader: EffectiveAccess;
  context?: DisplayContext;
}

/**
 * A coluna que denuncia cadastro e exclusão: o `id` nunca muda num update, e o
 * wrapper o grava como valor novo no insert e como anterior no delete.
 */
const RECORD_KEY = 'id';

export const inflect = (word: string, gender: GrammaticalGender) => (gender === 'f' ? `${word.slice(0, -1)}a` : word);

/** O rótulo seguido da palavra no gênero dele: "Fazenda cadastrada", "Nome alterado". */
export const labelWith = (word: string, { label, gender }: { label: string; gender: GrammaticalGender }) =>
  `${label} ${inflect(word, gender)}`;

const byId = (a: AuditRow, b: AuditRow) => a.id - b.id;

function metaOf(registry: Readonly<Record<string, EntityMeta>>, entity: string): EntityMeta {
  const meta = registry[entity];
  if (!meta) throw new Error(`Entidade sem metadados de campo: ${entity}.`);
  return meta;
}

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

interface FormatOptions {
  references: ReferenceNames;
  context: DisplayContext;
}

/** Objeto JSON gravado pelo wrapper; qualquer outra coisa conta como vazio. */
function parseObject(value: string | null): Readonly<Record<string, unknown>> | null {
  if (value === null) return null;
  const parsed: unknown = JSON.parse(value);
  return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null;
}

function formatReference(references: ReferenceNames, reference: Reference, id: string | null): string | null {
  if (id === null) return null;
  return references.get(referenceKey(reference))?.get(id) ?? DELETED_REFERENCE;
}

/**
 * As alterações visíveis de um campo, formatadas: nenhuma para coluna oculta,
 * uma por chave para jsonb expandido. Se o save gravou a coluna mais de uma
 * vez (inseriu e alterou no mesmo envio), vale o valor anterior da primeira
 * linha e o novo da última.
 */
function formatChanges(field: EntityField, rows: readonly AuditRow[], { references, context }: FormatOptions): VisibleChange[] {
  const [first] = rows;
  const last = rows.at(-1);
  if (!first || !last || field.type === 'hidden') return [];
  const gender = field.gender ?? 'm';

  if (field.type === 'jsonb') {
    return field
      .expand(parseObject(first.oldValue), parseObject(last.newValue), context)
      .map(({ label, gender: keyGender = 'm', from, to }) => ({ change: { field: label, from, to }, gender: keyGender }));
  }

  const [from, to] =
    field.type === 'reference'
      ? [formatReference(references, field.references, first.oldValue), formatReference(references, field.references, last.newValue)]
      : [formatFieldValue(field, first.oldValue, context), formatFieldValue(field, last.newValue, context)];
  return [{ change: { field: field.label, from, to, ...(field.type === 'long_text' ? { long: true as const } : {}) }, gender }];
}

/** As alterações visíveis de um save de uma entidade, na ordem do registro. */
function changesOf(fields: readonly EntityField[], rows: readonly AuditRow[], options: FormatOptions): VisibleChange[] {
  return fields.flatMap((field) =>
    formatChanges(field, rows.filter((row) => row.field === field.column).sort(byId), options),
  );
}

/**
 * O filho como estava ao fim do save, a partir de todas as suas linhas até
 * ali; no save que o exclui, como estava antes de sair.
 */
function childStateAt(history: readonly AuditRow[], changeId: string): ChildState {
  const saved = history.filter((row) => row.changeId === changeId);
  const deleted = kindOf(saved) === 'deleted';
  const last = Math.max(...saved.map((row) => row.id));
  const state: Record<string, string | null> = {};
  for (const row of history) {
    if (row.id > last) break;
    state[row.field] = deleted && row.changeId === changeId ? row.oldValue : row.newValue;
  }
  return state;
}

/** A história de cada filho visível, por id do filho, em ordem de gravação. */
export type ChildHistories = ReadonlyMap<string, readonly AuditRow[]>;

/**
 * Os filhos do registro que o leitor vê, de cada declaração, com a história
 * inteira de cada um. O filho é achado pela coluna do pai em qualquer linha
 * dele — valor novo no cadastro, anterior na exclusão —, o que acha também o
 * já excluído; a mesma regra, em SQL, está em `childRows` (query.ts). O filtro
 * olha o último estado do filho.
 *
 * A consulta pagina só sobre os filhos daqui, e a montagem só os exibe: os
 * dois lados decidem a visibilidade pela mesma função.
 */
export function visibleChildren(
  rows: readonly AuditRow[],
  { entityId, children = [] }: HistorySubject,
  reader: EffectiveAccess,
): ChildHistories[] {
  const sorted = [...rows].sort(byId);
  return children.map((declaration) => {
    const linked = new Set(
      sorted
        .filter(
          (row) =>
            row.entity === declaration.entity &&
            row.field === declaration.parentColumn &&
            (row.oldValue === entityId || row.newValue === entityId),
        )
        .map((row) => row.entityId),
    );
    const histories = new Map<string, AuditRow[]>();
    for (const row of sorted) {
      if (row.entity === declaration.entity && linked.has(row.entityId)) {
        histories.set(row.entityId, [...(histories.get(row.entityId) ?? []), row]);
      }
    }
    return new Map(
      [...histories].filter(([, history]) => {
        const last = history.at(-1);
        return !declaration.canSee || (last !== undefined && declaration.canSee(reader, childStateAt(history, last.changeId)));
      }),
    );
  });
}

const CHILD_VERBS: Record<HistoryKind, string> = { created: 'adicionado', updated: 'alterado', deleted: 'removido' };

interface VisibleChild {
  child: HistoryChild;
  /** Título sem o nome do filho, para a entrada que só tem ele. */
  shortTitle: string;
}

/** O que a montagem dos filhos de um save consome, além das fontes. */
interface ChildrenContext extends FormatOptions {
  entityId: string;
}

interface ChildSource {
  declaration: HistoryChildDeclaration;
  meta: EntityMeta;
  fields: EntityField[];
  histories: ChildHistories;
}

/** Cadastro e exclusão pelo registro; senão, o título da única alteração, ou "N alterações". */
function titleOf(
  kind: HistoryKind,
  meta: EntityMeta,
  changes: readonly VisibleChange[],
  children: readonly VisibleChild[],
): string {
  if (kind === 'created') return labelWith('cadastrado', meta);
  if (kind === 'deleted') return labelWith('excluído', meta);
  const singles = [
    ...changes.map(({ change, gender }) => labelWith('alterado', { label: change.field, gender })),
    ...children.map((child) => child.shortTitle),
  ];
  const [only, ...rest] = singles;
  return only !== undefined && rest.length === 0 ? only : `${singles.length} alterações`;
}

/**
 * Se o save do filho é deste registro: a coluna do pai aponta para ele ao fim
 * do save, ou o save a tirou dele. Filho que passou para outro registro some
 * daqui a partir dos saves seguintes à mudança.
 */
function belongsTo(entityId: string, parentColumn: string, state: ChildState, saved: readonly AuditRow[]): boolean {
  return (
    state[parentColumn] === entityId ||
    saved.some((row) => row.field === parentColumn && (row.oldValue === entityId || row.newValue === entityId))
  );
}

/** As linhas dos filhos (já só os visíveis) num save, uma por filho. */
function childrenOf(sources: readonly ChildSource[], changeId: string, options: ChildrenContext): VisibleChild[] {
  return sources.flatMap(({ declaration, meta, fields, histories }) =>
    [...histories.values()].flatMap((history): VisibleChild[] => {
      const saved = history.filter((row) => row.changeId === changeId);
      if (saved.length === 0) return [];

      const kind = kindOf(saved);
      const state = childStateAt(history, changeId);
      if (!belongsTo(options.entityId, declaration.parentColumn, state, saved)) return [];

      const changes = changesOf(fields, saved, options);
      if (kind === 'updated' && changes.length === 0) return [];

      const shortTitle = labelWith(CHILD_VERBS[kind], meta);
      const name = declaration.nameColumn ? state[declaration.nameColumn] : null;
      return [
        {
          child: { title: name ? `${shortTitle}: ${name}` : shortTitle, changes: changes.map(({ change }) => change) },
          shortTitle,
        },
      ];
    }),
  );
}

/**
 * Os ids que cada referência das linhas pede resolver — do registro e dos
 * filhos —, por `referenceKey`. A consulta os lê e devolve em `ReferenceNames`.
 */
export function referencesToResolve(
  rows: readonly AuditRow[],
  { entity, children = [], registry = FIELD_REGISTRY }: HistorySubject,
): Map<string, Reference & { ids: Set<string> }> {
  const wanted = new Map<string, Reference & { ids: Set<string> }>();
  for (const table of [entity, ...children.map((child) => child.entity)]) {
    const references = metaFields(metaOf(registry, table)).flatMap((field) =>
      field.type === 'reference' ? [field] : [],
    );
    for (const row of rows) {
      const field = row.entity === table ? references.find((reference) => reference.column === row.field) : undefined;
      if (!field) continue;
      const key = referenceKey(field.references);
      const entry = wanted.get(key) ?? { ...field.references, ids: new Set<string>() };
      for (const id of [row.oldValue, row.newValue]) if (id !== null) entry.ids.add(id);
      wanted.set(key, entry);
    }
  }
  return wanted;
}

/**
 * Uma entrada por save, mais nova primeiro, com os campos na ordem do registro
 * e os filhos declarados como linhas próprias. Coluna oculta ou fora do
 * registro não aparece, nem linha de filho barrada pelo filtro; save sem nada
 * visível não vira entrada vazia: some.
 */
export function assembleHistory(rows: readonly AuditRow[], options: AssembleOptions): HistoryEntry[] {
  const { entity, entityId, children = [], registry = FIELD_REGISTRY, authors, references, reader } = options;
  const meta = metaOf(registry, entity);
  const fields = metaFields(meta);
  const formatting: ChildrenContext = { entityId, references, context: options.context ?? DEFAULT_DISPLAY_CONTEXT };

  const sorted = [...rows].sort(byId);
  const seen = visibleChildren(sorted, options, reader);
  const sources: ChildSource[] = children.map((declaration, index) => {
    const childMeta = metaOf(registry, declaration.entity);
    return { declaration, meta: childMeta, fields: metaFields(childMeta), histories: seen[index] ?? new Map() };
  });

  // Só as linhas do registro e dos seus filhos; a de maior id é a mais recente
  // do save, e é ela que ordena as entradas.
  const ownRows = sorted.filter(
    (row) =>
      (row.entity === entity && row.entityId === entityId) ||
      sources.some((source) => source.declaration.entity === row.entity && source.histories.has(row.entityId)),
  );
  const saves = new Map<string, { newest: AuditRow; rows: AuditRow[] }>();
  for (const row of ownRows) {
    const save = saves.get(row.changeId);
    if (!save) saves.set(row.changeId, { newest: row, rows: [row] });
    else {
      save.rows.push(row);
      save.newest = row;
    }
  }

  return [...saves.values()]
    .sort((a, b) => b.newest.id - a.newest.id)
    .flatMap(({ newest, rows: saved }): HistoryEntry[] => {
      const recordRows = saved.filter((row) => row.entity === entity && row.entityId === entityId);
      const changes = changesOf(fields, recordRows, formatting);
      const visibleChildren = childrenOf(sources, newest.changeId, formatting);
      if (changes.length === 0 && visibleChildren.length === 0) return [];

      const kind = kindOf(recordRows);
      return [
        {
          changeId: newest.changeId,
          at: newest.createdAt.toISOString(),
          author: (newest.userId && authors.get(newest.userId)) || SYSTEM_AUTHOR,
          kind,
          title: titleOf(kind, meta, changes, visibleChildren),
          changes: changes.map(({ change }) => change),
          children: visibleChildren.map(({ child }) => child),
        },
      ];
    });
}
