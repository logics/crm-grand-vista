// Garantir papel de contato: peça neutra, usada por quem precisa dar um papel
// ao contato na transação do próprio save (fazendas, cadeia de indicação).
import { auditLog, contactRoles, diffRecords, uuidv7, type AuditActor, type Transaction } from '@crm/db';
import type { ContactRole } from '@crm/shared';
import { getTableColumns, getTableName } from 'drizzle-orm';

/** Garantir papel: acrescenta se faltar, na transação de quem chama. Verdadeiro se acrescentou. */
export async function ensureContactRole(
  tx: Transaction,
  actor: AuditActor,
  contactId: string,
  role: ContactRole,
): Promise<boolean> {
  // `ON CONFLICT DO NOTHING` no unique (contact_id, role): chamadas simultâneas não
  // estouram 23505; quem perde a corrida não recebe linha e devolve falso.
  const [row] = await tx
    .insert(contactRoles)
    .values({ tenantId: actor.tenantId!, contactId, role })
    .onConflictDoNothing({ target: [contactRoles.contactId, contactRoles.role] })
    .returning();
  if (!row) return false;

  // Mesma auditoria de `auditedWrites.insert` (um campo por linha, valor anterior nulo,
  // um `change_id` por chamada); o insert acima não passa pelo wrapper por causa do ON CONFLICT.
  const after: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(getTableColumns(contactRoles))) {
    after[column.name] = row[key as keyof typeof row];
  }
  const changeId = uuidv7();
  const changes = diffRecords(null, after);
  await tx.insert(auditLog).values(
    changes.map((change) => ({
      tenantId: actor.tenantId,
      entity: getTableName(contactRoles),
      entityId: row.id,
      changeId,
      field: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue,
      userId: actor.userId,
    })),
  );
  return true;
}
