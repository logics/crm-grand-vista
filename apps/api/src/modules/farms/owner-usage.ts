// Contagem de fazendas do proprietário dentro do escopo de quem pede: só para a
// mensagem de "papel em uso"; o bloqueio conta todas. Peça folha, à parte do serviço.
import { farmOwners, farms, type Transaction } from '@crm/db';
import { and, count, eq } from 'drizzle-orm';
import type { EffectiveAccess } from '../../authorization/effective-access.js';
import { farmScopeOf } from './scope.js';

export async function visibleFarmsOwnedBy(tx: Transaction, access: EffectiveAccess, contactId: string): Promise<number> {
  const [row] = await tx
    .select({ total: count() })
    .from(farmOwners)
    .innerJoin(farms, eq(farms.id, farmOwners.farmId))
    .where(and(eq(farmOwners.contactId, contactId), farmScopeOf(access)));
  return row?.total ?? 0;
}
