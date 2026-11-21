// Perfil de compra do contato: leitura, substituição e remoção, na transação e
// no `change_id` do save do contato. Não há rota própria: o serviço de contatos
// chama daqui.
//
// Patrimônio estimado e capacidade de investimento (dados financeiros) exigem
// `contatos.ver_dados_financeiros`. Sem ela, a leitura não os devolve (nem
// `null`) e a substituição não os toca, então o valor gravado é preservado
// (a rota já recusou com 403 quem os enviou). Com ela, a substituição é
// completa como nas demais colunas. Perfil "vazio" considera o dado financeiro
// que ficaria: a linha só some se ele também é nulo.
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

/** O que a API expõe da linha; as chaves financeiras só com `financial` (sem ele nem `null`). */
export function serializeBuyerProfile(row: ProfileRow, financial: boolean): BuyerProfile {
  return {
    ...(financial ? { estimatedNetWorth: row.estimatedNetWorth, investmentCapacity: row.investmentCapacity } : {}),
    purchaseProfileId: row.purchaseProfileId,
    avgTicket: row.avgTicket,
    maxTicket: row.maxTicket,
    minAreaHa: row.minAreaHa,
    maxAreaHa: row.maxAreaHa,
    urgency: row.urgency as BuyerProfile['urgency'],
    qualificationLevel: row.qualificationLevel as BuyerProfile['qualificationLevel'],
  };
}

export async function buyerProfilesByContact(
  tx: Transaction,
  contactIds: readonly string[],
  financial: boolean,
): Promise<Map<string, BuyerProfile>> {
  const byContact = new Map<string, BuyerProfile>();
  if (contactIds.length === 0) return byContact;
  const rows = await tx
    .select()
    .from(buyerProfiles)
    .where(inArray(buyerProfiles.contactId, [...contactIds]));
  for (const row of rows) byContact.set(row.contactId, serializeBuyerProfile(row, financial));
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

/** O dado financeiro que a linha terá depois do save: o enviado, com a permissão; o gravado, sem ela. */
function financialAfter(profile: BuyerProfileInput, current: ProfileRow | null, financial: boolean) {
  return financial
    ? { estimatedNetWorth: profile.estimatedNetWorth ?? null, investmentCapacity: profile.investmentCapacity ?? null }
    : { estimatedNetWorth: current?.estimatedNetWorth ?? null, investmentCapacity: current?.investmentCapacity ?? null };
}

/**
 * Substituição completa das colunas: o que veio ausente já é nulo no schema.
 * `financial` (a permissão) decide se as duas colunas financeiras entram na
 * substituição; sem ele, ficam como estão. Perfil sem nenhuma coluna preenchida
 * (e sem dado financeiro que reste) não tem linha: a existente é apagada, e
 * nenhuma nasce.
 */
export async function replaceBuyerProfile(
  writes: AuditedWrites,
  tenantId: string,
  contactId: string,
  profile: BuyerProfileInput,
  current: ProfileRow | null,
  financial: boolean,
): Promise<void> {
  const kept = financialAfter(profile, current, financial);
  if (isBuyerProfileEmpty(profile) && kept.estimatedNetWorth === null && kept.investmentCapacity === null) {
    if (current) await writes.delete(buyerProfiles, eq(buyerProfiles.id, current.id));
    return;
  }
  // Sem a permissão as chaves são descartadas (o `update` ignora `undefined`): o gravado fica.
  const columns = {
    purchaseProfileId: profile.purchaseProfileId,
    avgTicket: profile.avgTicket,
    maxTicket: profile.maxTicket,
    minAreaHa: profile.minAreaHa,
    maxAreaHa: profile.maxAreaHa,
    urgency: profile.urgency,
    qualificationLevel: profile.qualificationLevel,
  };
  const values = financial ? { ...columns, ...kept } : columns;
  if (current) {
    await writes.update(buyerProfiles, values, eq(buyerProfiles.id, current.id));
  } else {
    await writes.insert(buyerProfiles, { ...values, tenantId, contactId });
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
