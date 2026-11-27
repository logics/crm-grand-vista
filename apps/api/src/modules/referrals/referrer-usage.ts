// Contagem de elos do indicador dentro do escopo de quem pede: só para a
// mensagem de "papel em uso"; o bloqueio conta todos. Contato não tem escopo de
// dados (base compartilhada), então todo elo de sujeito contato é visível; o de
// sujeito fazenda só se a fazenda está no escopo. Importa só a folha `farms/scope`.
import { farms, referralLinks, type Transaction } from '@crm/db';
import { and, count, eq, isNotNull, or } from 'drizzle-orm';
import type { EffectiveAccess } from '../../authorization/effective-access.js';
import { farmScopeOf } from '../farms/scope.js';

export async function visibleLinksOfReferrer(tx: Transaction, access: EffectiveAccess, contactId: string): Promise<number> {
  const [row] = await tx
    .select({ total: count() })
    .from(referralLinks)
    .leftJoin(farms, eq(farms.id, referralLinks.subjectFarmId))
    .where(
      and(
        eq(referralLinks.referrerContactId, contactId),
        or(isNotNull(referralLinks.subjectContactId), and(isNotNull(farms.id), farmScopeOf(access))),
      ),
    );
  return row?.total ?? 0;
}
