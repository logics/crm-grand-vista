// Perfil de compra do contato: leitura, substituição e remoção, na transação e
// no `change_id` do save do contato. Não há rota própria: o serviço de contatos
// chama daqui.
//
// Patrimônio estimado e capacidade de investimento existem no banco, mas esta
// fatia não os lê nem os grava: a leitura os ignora e a substituição não os
// toca (o `set` só leva as colunas de `BuyerProfile`), então o valor gravado é
// preservado. Perfil "vazio" considera esses valores: a linha só some se eles
// também estão nulos.
import {
  buyerCrops,
  buyerPaymentMethods,
  buyerProfiles,
  buyerRegions,
  purchaseProfiles,
  type AuditedWrites,
  type Transaction,
} from '@crm/db';
import {
  BUYER_PROFILE_PURCHASE_PROFILE_INACTIVE_MESSAGE,
  BUYER_PROFILE_PURCHASE_PROFILE_UNKNOWN_MESSAGE,
  isBuyerProfileEmpty,
  type BuyerProfile,
  type BuyerProfileInput,
} from '@crm/shared';
import { eq, inArray } from 'drizzle-orm';

type ProfileRow = typeof buyerProfiles.$inferSelect;

/** O que a API expõe da linha: nunca as chaves financeiras. */
export function serializeBuyerProfile(row: ProfileRow): BuyerProfile {
  return {
    purchaseProfileId: row.purchaseProfileId,
    avgTicket: row.avgTicket,
    maxTicket: row.maxTicket,
    minAreaHa: row.minAreaHa,
    maxAreaHa: row.maxAreaHa,
    urgency: row.urgency as BuyerProfile['urgency'],
    qualificationLevel: row.qualificationLevel as BuyerProfile['qualificationLevel'],
  };
}

export async function buyerProfilesByContact(tx: Transaction, contactIds: readonly string[]): Promise<Map<string, BuyerProfile>> {
  const byContact = new Map<string, BuyerProfile>();
  if (contactIds.length === 0) return byContact;
  const rows = await tx
    .select()
    .from(buyerProfiles)
    .where(inArray(buyerProfiles.contactId, [...contactIds]));
  for (const row of rows) byContact.set(row.contactId, serializeBuyerProfile(row));
  return byContact;
}

/**
 * O perfil de compra escolhido existe na empresa (o RLS recorta) e, se está
 * entrando agora, está ativo; o já gravado e depois desativado continua valendo.
 */
export async function purchaseProfileRejection(
  tx: Transaction,
  purchaseProfileId: string | null,
  alreadySavedId: string | null,
): Promise<string | null> {
  if (!purchaseProfileId) return null;
  const [row] = await tx
    .select({ active: purchaseProfiles.active })
    .from(purchaseProfiles)
    .where(eq(purchaseProfiles.id, purchaseProfileId));
  if (!row) return BUYER_PROFILE_PURCHASE_PROFILE_UNKNOWN_MESSAGE;
  if (!row.active && purchaseProfileId !== alreadySavedId) return BUYER_PROFILE_PURCHASE_PROFILE_INACTIVE_MESSAGE;
  return null;
}

export async function currentBuyerProfile(tx: Transaction, contactId: string): Promise<ProfileRow | null> {
  const [row] = await tx.select().from(buyerProfiles).where(eq(buyerProfiles.contactId, contactId));
  return row ?? null;
}

const hasFinancialData = (row: ProfileRow | null) =>
  row !== null && (row.estimatedNetWorth !== null || row.investmentCapacity !== null);

/**
 * Substituição completa das colunas: o que veio ausente já é nulo no schema.
 * Perfil sem nenhuma coluna preenchida (e sem dado financeiro preservado) não
 * tem linha: a existente é apagada, e nenhuma nasce.
 */
export async function replaceBuyerProfile(
  writes: AuditedWrites,
  tenantId: string,
  contactId: string,
  profile: BuyerProfileInput,
  current: ProfileRow | null,
): Promise<void> {
  if (isBuyerProfileEmpty(profile) && !hasFinancialData(current)) {
    if (current) await writes.delete(buyerProfiles, eq(buyerProfiles.id, current.id));
    return;
  }
  if (current) {
    await writes.update(buyerProfiles, profile, eq(buyerProfiles.id, current.id));
  } else {
    await writes.insert(buyerProfiles, { ...profile, tenantId, contactId });
  }
}

/**
 * Apaga o perfil inteiro — colunas (inclusive as financeiras) e as três junções —,
 * auditado pelo mesmo `writes` (mesmo `change_id`) do save: o histórico guarda os valores anteriores.
 */
export async function deleteBuyerProfile(writes: AuditedWrites, contactId: string): Promise<void> {
  await writes.delete(buyerProfiles, eq(buyerProfiles.contactId, contactId));
  await writes.delete(buyerRegions, eq(buyerRegions.contactId, contactId));
  await writes.delete(buyerCrops, eq(buyerCrops.contactId, contactId));
  await writes.delete(buyerPaymentMethods, eq(buyerPaymentMethods.contactId, contactId));
}
