// Leitura do histórico de um registro e dos filhos declarados: uma página de
// saves do `audit_log`, montada por `assembleHistory`. Roda na transação da
// empresa ativa — o RLS de `audit_log` e das tabelas referenciadas já recorta
// as linhas dela.
import { auditLog, users, type Transaction } from '@crm/db';
import { HISTORY_PAGE_SIZE, type DisplayContext, type HistoryPage, type RegisteredTable } from '@crm/shared';
import { and, desc, eq, inArray, lt, max, or, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import type { EffectiveAccess } from '../authorization/effective-access.js';
import {
  assembleHistory,
  referencesToResolve,
  visibleChildren,
  type AuditRow,
  type HistoryChildDeclaration,
  type ReferenceNames,
} from './assemble.js';

/**
 * O cursor é a linha mais recente do último save da página. É por save, não
 * por linha: a página seguinte começa no save anterior a ele, inteiro. Opaco
 * para quem consome — a forma pode mudar sem quebrar o contrato.
 */
export const encodeCursor = (newestRowId: number): string => Buffer.from(String(newestRowId)).toString('base64url');

/** O id do cursor, ou nulo se ele não foi emitido por `encodeCursor`. */
export function decodeCursor(cursor: string): number | null {
  const text = Buffer.from(cursor, 'base64url').toString();
  const id = Number(text);
  return /^[1-9]\d*$/.test(text) && Number.isSafeInteger(id) ? id : null;
}

export interface HistoryQuery {
  entity: RegisteredTable;
  entityId: string;
  children?: readonly HistoryChildDeclaration<RegisteredTable>[];
  /** Quem lê, para o filtro de visibilidade dos filhos. */
  reader: EffectiveAccess;
  /** Já decodificado; ausente na primeira página. */
  cursor?: number;
  context?: DisplayContext;
}

/**
 * As linhas de um filho declarado do registro: de todo filho cuja coluna do pai
 * apontou para ele em alguma linha — valor novo no cadastro, anterior na
 * exclusão. A história inteira do filho, não só a da página: é dela que sai o
 * estado que o filtro de visibilidade lê. A mesma regra, sobre as linhas já
 * lidas, está em `visibleChildren` (assemble.ts).
 */
function childRows({ entity, parentColumn }: HistoryChildDeclaration, entityId: string): SQL {
  const linked = sql`(select ${auditLog.entityId} from ${auditLog} where ${and(
    eq(auditLog.entity, entity),
    eq(auditLog.field, parentColumn),
    or(eq(auditLog.oldValue, entityId), eq(auditLog.newValue, entityId)),
  )})`;
  return and(eq(auditLog.entity, entity), sql`${auditLog.entityId} in ${linked}`) as SQL;
}

/** Id de registro: todo `id()` do schema é uuid. */
export const uuidSchema = z.uuid();

/**
 * O nome atual de cada registro referenciado. Tabela e coluna vêm dos
 * metadados de campo, nunca da requisição; id que não é uuid não existe.
 */
async function readReferenceNames(tx: Transaction, rows: readonly AuditRow[], query: HistoryQuery): Promise<ReferenceNames> {
  const names = new Map<string, Map<string, string>>();
  for (const [key, { table, nameColumn, ids }] of referencesToResolve(rows, query)) {
    const valid = [...ids].filter((id) => uuidSchema.safeParse(id).success);
    if (valid.length === 0) continue;
    const { rows: found } = await tx.execute<{ id: string; name: string }>(
      sql`select id::text as id, ${sql.identifier(nameColumn)} as name from ${sql.identifier(table)} where id in (${sql.join(
        valid.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
    names.set(key, new Map(found.map(({ id, name }) => [id, name])));
  }
  return names;
}

const auditRow = {
  id: auditLog.id,
  entity: auditLog.entity,
  entityId: auditLog.entityId,
  changeId: auditLog.changeId,
  field: auditLog.field,
  oldValue: auditLog.oldValue,
  newValue: auditLog.newValue,
  userId: auditLog.userId,
  createdAt: auditLog.createdAt,
};

/** Uma página do histórico do registro, mais nova primeiro, de até `HISTORY_PAGE_SIZE` saves. */
export async function readHistory(tx: Transaction, query: HistoryQuery): Promise<HistoryPage> {
  const { entity, entityId, children = [], reader, cursor } = query;
  const ofRecord = and(eq(auditLog.entity, entity), eq(auditLog.entityId, entityId));
  const newest = max(auditLog.id);

  // Os filhos vêm antes da página: o filtro de visibilidade decide quais o
  // leitor vê, e a página conta só os saves deles e do registro — filho
  // barrado não ocupa lugar nela.
  const childHistory =
    children.length === 0
      ? []
      : await tx
          .select(auditRow)
          .from(auditLog)
          .where(or(...children.map((child) => childRows(child, entityId))));
  const seen = visibleChildren(childHistory, query, reader);
  const ofSeenChildren = children.flatMap((child, index) => {
    const ids = [...(seen[index]?.keys() ?? [])];
    return ids.length === 0 ? [] : [and(eq(auditLog.entity, child.entity), inArray(auditLog.entityId, ids))];
  });

  // Um a mais que a página: se vier, há página seguinte.
  const saves = await tx
    .select({ changeId: auditLog.changeId, newest })
    .from(auditLog)
    .where(or(ofRecord, ...ofSeenChildren))
    .groupBy(auditLog.changeId)
    .having(cursor === undefined ? undefined : (lt(newest, cursor) as SQL))
    .orderBy(desc(newest))
    .limit(HISTORY_PAGE_SIZE + 1);

  const page = saves.slice(0, HISTORY_PAGE_SIZE);
  const last = page.at(-1);
  if (!last) return { entries: [] };

  const pageIds = new Set(page.map((save) => save.changeId));
  const recordRows = await tx
    .select(auditRow)
    .from(auditLog)
    .where(and(ofRecord, inArray(auditLog.changeId, [...pageIds])));
  // Só os filhos visíveis seguem para a montagem: o barrado nunca passa daqui.
  const rows = [...recordRows, ...seen.flatMap((histories) => [...histories.values()].flat())];

  // Pelo nome, sem recorte por vínculo: quem saiu da empresa continua autor do
  // que fez, e o super admin aparece como qualquer um. Só são lidos os autores
  // de linhas que o RLS já mostrou.
  const authorIds = [...new Set(rows.flatMap((row) => (row.userId ? [row.userId] : [])))];
  const authors =
    authorIds.length === 0
      ? []
      : await tx.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, authorIds));

  // A história inteira dos filhos monta saves de outras páginas: ficam só os desta.
  const entries = assembleHistory(rows, {
    ...query,
    authors: new Map(authors.map((author) => [author.id, author.name])),
    references: await readReferenceNames(tx, rows, query),
  }).filter((entry) => pageIds.has(entry.changeId));

  return saves.length > HISTORY_PAGE_SIZE && last.newest !== null
    ? { entries, nextCursor: encodeCursor(last.newest) }
    : { entries };
}
