// Leitura do histórico de um registro: uma página de saves do `audit_log`,
// montada por `assembleHistory`. Roda na transação da empresa ativa — o RLS de
// `audit_log` já recorta as linhas dela.
import { auditLog, users, type Transaction } from '@crm/db';
import { HISTORY_PAGE_SIZE, type DisplayContext, type HistoryPage, type RegisteredTable } from '@crm/shared';
import { and, desc, eq, inArray, lt, max, type SQL } from 'drizzle-orm';
import { assembleHistory } from './assemble.js';

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
  /** Já decodificado; ausente na primeira página. */
  cursor?: number;
  context?: DisplayContext;
}

/** Uma página do histórico do registro, mais nova primeiro, de até `HISTORY_PAGE_SIZE` saves. */
export async function readHistory(
  tx: Transaction,
  { entity, entityId, cursor, context }: HistoryQuery,
): Promise<HistoryPage> {
  const ofRecord = and(eq(auditLog.entity, entity), eq(auditLog.entityId, entityId));
  const newest = max(auditLog.id);

  // Um a mais que a página: se vier, há página seguinte.
  const saves = await tx
    .select({ changeId: auditLog.changeId, newest })
    .from(auditLog)
    .where(ofRecord)
    .groupBy(auditLog.changeId)
    .having(cursor === undefined ? undefined : (lt(newest, cursor) as SQL))
    .orderBy(desc(newest))
    .limit(HISTORY_PAGE_SIZE + 1);

  const page = saves.slice(0, HISTORY_PAGE_SIZE);
  const last = page.at(-1);
  if (!last) return { entries: [] };

  const rows = await tx
    .select({
      id: auditLog.id,
      changeId: auditLog.changeId,
      field: auditLog.field,
      oldValue: auditLog.oldValue,
      newValue: auditLog.newValue,
      userId: auditLog.userId,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(and(ofRecord, inArray(auditLog.changeId, page.map((save) => save.changeId))));

  // Pelo nome, sem recorte por vínculo: quem saiu da empresa continua autor do
  // que fez, e o super admin aparece como qualquer um. Só são lidos os autores
  // de linhas que o RLS já mostrou.
  const authorIds = [...new Set(rows.flatMap((row) => (row.userId ? [row.userId] : [])))];
  const authors =
    authorIds.length === 0
      ? []
      : await tx.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, authorIds));

  const entries = assembleHistory(rows, {
    entity,
    authors: new Map(authors.map((author) => [author.id, author.name])),
    context,
  });

  return saves.length > HISTORY_PAGE_SIZE && last.newest !== null
    ? { entries, nextCursor: encodeCursor(last.newest) }
    : { entries };
}
