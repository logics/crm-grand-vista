// Perfil de compra do contato: leitura, substituição e remoção, na transação e
// no `change_id` do save do contato. Não há rota própria: o serviço de contatos
// chama daqui.
//
// As três junções (regiões, culturas, formas de pagamento) pendem do contato, não
// da linha de `buyer_profiles`, e são gravadas pela diferença contra o estado
// atual: o histórico mostra só o que entrou e o que saiu, nunca apagar-e-recriar.
//
// Patrimônio estimado e capacidade de investimento existem no banco, mas esta
// fatia não os lê nem os grava: a leitura os ignora e a substituição não os
// toca (o `set` só leva as colunas de `BuyerProfile`), então o valor gravado é
// preservado. Perfil "vazio" considera esses valores: a linha só some se eles
// também estão nulos.
import {
  buyerCrops,
  crops,
  municipalities,
  paymentMethods,
  buyerPaymentMethods,
  buyerProfiles,
  buyerRegions,
  purchaseProfiles,
  type AuditedWrites,
  type Transaction,
} from '@crm/db';
import {
  BUYER_PROFILE_CROP_INACTIVE_MESSAGE,
  BUYER_PROFILE_CROP_UNKNOWN_MESSAGE,
  BUYER_PROFILE_PAYMENT_METHOD_INACTIVE_MESSAGE,
  BUYER_PROFILE_PAYMENT_METHOD_UNKNOWN_MESSAGE,
  BUYER_PROFILE_REGION_INACTIVE_MESSAGE,
  BUYER_PROFILE_REGION_UNKNOWN_MESSAGE,
  BUYER_PROFILE_PURCHASE_PROFILE_INACTIVE_MESSAGE,
  BUYER_PROFILE_PURCHASE_PROFILE_UNKNOWN_MESSAGE,
  isBuyerProfileEmpty,
  type BuyerProfile,
  type BuyerProfileInput,
  type BuyerRegionKey,
  type Uf,
  buyerRegionKeyOf,
} from '@crm/shared';
import { and, eq, inArray, or } from 'drizzle-orm';

type ProfileRow = typeof buyerProfiles.$inferSelect;

const NO_COLUMNS: Omit<BuyerProfile, 'regions' | 'cropIds' | 'paymentMethodIds'> = {
  purchaseProfileId: null,
  avgTicket: null,
  maxTicket: null,
  minAreaHa: null,
  maxAreaHa: null,
  urgency: null,
  qualificationLevel: null,
};

/** O que a API expõe da linha: nunca as chaves financeiras. */
function serializeColumns(row: ProfileRow | undefined): typeof NO_COLUMNS {
  if (!row) return NO_COLUMNS;
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

const regionKeyOfRow = (row: { municipalityIbgeCode: string | null; uf: string | null }): BuyerRegionKey =>
  row.municipalityIbgeCode ? { ibgeCode: row.municipalityIbgeCode } : { uf: row.uf as Uf };

/** As UFs antes dos municípios, cada grupo por chave: a ordem não depende da inserção. */
const byRegionKey = (a: BuyerRegionKey, b: BuyerRegionKey) =>
  Number('ibgeCode' in a) - Number('ibgeCode' in b) || buyerRegionKeyOf(a).localeCompare(buyerRegionKeyOf(b));

/**
 * Perfil de cada contato que tem linha ou alguma junção. Só junções: o objeto
 * sai com as colunas nulas. Sem nada, o contato não entra no mapa (perfil nulo).
 */
export async function buyerProfilesByContact(tx: Transaction, contactIds: readonly string[]): Promise<Map<string, BuyerProfile>> {
  const byContact = new Map<string, BuyerProfile>();
  if (contactIds.length === 0) return byContact;
  const ids = [...contactIds];
  const [profileRows, regionRows, cropRows, paymentRows] = await Promise.all([
    tx.select().from(buyerProfiles).where(inArray(buyerProfiles.contactId, ids)),
    tx.select().from(buyerRegions).where(inArray(buyerRegions.contactId, ids)),
    tx.select().from(buyerCrops).where(inArray(buyerCrops.contactId, ids)),
    tx.select().from(buyerPaymentMethods).where(inArray(buyerPaymentMethods.contactId, ids)),
  ]);
  const profileByContact = new Map(profileRows.map((row) => [row.contactId, row]));
  const group = <Row extends { contactId: string }, Item>(rows: readonly Row[], item: (row: Row) => Item) => {
    const grouped = new Map<string, Item[]>();
    for (const row of rows) grouped.set(row.contactId, [...(grouped.get(row.contactId) ?? []), item(row)]);
    return grouped;
  };
  const regions = group(regionRows, regionKeyOfRow);
  const cropIds = group(cropRows, (row) => row.cropId);
  const paymentMethodIds = group(paymentRows, (row) => row.paymentMethodId);

  for (const id of ids) {
    const row = profileByContact.get(id);
    const hasJunction = regions.has(id) || cropIds.has(id) || paymentMethodIds.has(id);
    if (!row && !hasJunction) continue;
    byContact.set(id, {
      ...serializeColumns(row),
      regions: (regions.get(id) ?? []).sort(byRegionKey),
      cropIds: (cropIds.get(id) ?? []).sort(),
      paymentMethodIds: (paymentMethodIds.get(id) ?? []).sort(),
    });
  }
  return byContact;
}

/** O que está gravado do perfil do contato: a linha (se há) e as três junções. */
export interface CurrentBuyerProfile {
  row: ProfileRow | null;
  regions: BuyerRegionKey[];
  cropIds: Set<string>;
  paymentMethodIds: Set<string>;
}

export const NO_CURRENT_BUYER_PROFILE: CurrentBuyerProfile = {
  row: null,
  regions: [],
  cropIds: new Set(),
  paymentMethodIds: new Set(),
};

export async function currentBuyerProfile(tx: Transaction, contactId: string): Promise<CurrentBuyerProfile> {
  const [[row], regionRows, cropRows, paymentRows] = await Promise.all([
    tx.select().from(buyerProfiles).where(eq(buyerProfiles.contactId, contactId)),
    tx.select().from(buyerRegions).where(eq(buyerRegions.contactId, contactId)),
    tx.select({ id: buyerCrops.cropId }).from(buyerCrops).where(eq(buyerCrops.contactId, contactId)),
    tx
      .select({ id: buyerPaymentMethods.paymentMethodId })
      .from(buyerPaymentMethods)
      .where(eq(buyerPaymentMethods.contactId, contactId)),
  ]);
  return {
    row: row ?? null,
    regions: regionRows.map(regionKeyOfRow),
    cropIds: new Set(cropRows.map((r) => r.id)),
    paymentMethodIds: new Set(paymentRows.map((r) => r.id)),
  };
}

/**
 * Os ids existem na empresa ativa (o RLS esconde os de outra) e os que entram
 * estão ativos; quem já estava gravado e ficou inativo continua valendo.
 */
async function vocabularyRejection(
  tx: Transaction,
  vocabulary: typeof crops | typeof paymentMethods,
  ids: readonly string[],
  current: ReadonlySet<string>,
  messages: { unknown: string; inactive: string },
): Promise<string | null> {
  if (ids.length === 0) return null;
  const found = await tx
    .select({ id: vocabulary.id, active: vocabulary.active })
    .from(vocabulary)
    .where(inArray(vocabulary.id, [...ids]));
  const activeById = new Map(found.map((row) => [row.id, row.active]));
  if (ids.some((id) => !activeById.has(id))) return messages.unknown;
  if (ids.some((id) => !current.has(id) && !activeById.get(id))) return messages.inactive;
  return null;
}

async function regionsRejection(tx: Transaction, regions: readonly BuyerRegionKey[], current: readonly BuyerRegionKey[]) {
  const wanted = regions.flatMap((region) => ('ibgeCode' in region ? [region.ibgeCode] : []));
  if (wanted.length === 0) return null;
  const saved = new Set(current.map(buyerRegionKeyOf));
  const found = await tx
    .select({ ibgeCode: municipalities.ibgeCode, active: municipalities.active })
    .from(municipalities)
    .where(inArray(municipalities.ibgeCode, wanted));
  const activeByCode = new Map(found.map((row) => [row.ibgeCode, row.active]));
  if (wanted.some((code) => !activeByCode.has(code))) return BUYER_PROFILE_REGION_UNKNOWN_MESSAGE;
  if (wanted.some((code) => !saved.has(code) && !activeByCode.get(code))) return BUYER_PROFILE_REGION_INACTIVE_MESSAGE;
  return null;
}

/**
 * O perfil de compra escolhido existe na empresa (o RLS recorta) e, se está
 * entrando agora, está ativo; o já gravado e depois desativado continua valendo.
 */
async function purchaseProfileRejection(
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

/** A mensagem da primeira recusa do perfil, ou `null` se pode gravar: perfil de compra, regiões, culturas e formas de pagamento. */
export async function buyerProfileRejection(
  tx: Transaction,
  profile: BuyerProfileInput,
  current: CurrentBuyerProfile,
): Promise<string | null> {
  return (
    (await purchaseProfileRejection(tx, profile.purchaseProfileId, current.row?.purchaseProfileId ?? null)) ??
    (await regionsRejection(tx, profile.regions, current.regions)) ??
    (await vocabularyRejection(tx, crops, profile.cropIds, current.cropIds, {
      unknown: BUYER_PROFILE_CROP_UNKNOWN_MESSAGE,
      inactive: BUYER_PROFILE_CROP_INACTIVE_MESSAGE,
    })) ??
    (await vocabularyRejection(tx, paymentMethods, profile.paymentMethodIds, current.paymentMethodIds, {
      unknown: BUYER_PROFILE_PAYMENT_METHOD_UNKNOWN_MESSAGE,
      inactive: BUYER_PROFILE_PAYMENT_METHOD_INACTIVE_MESSAGE,
    }))
  );
}

const hasFinancialData = (row: ProfileRow | null) =>
  row !== null && (row.estimatedNetWorth !== null || row.investmentCapacity !== null);

type Wanted = { current: ReadonlySet<string>; wanted: readonly string[] };
const added = ({ current, wanted }: Wanted) => wanted.filter((id) => !current.has(id));
const removed = ({ current, wanted }: Wanted) => [...current].filter((id) => !wanted.includes(id));

/** Leva as três junções ao pedido, só pela diferença: quem não mudou não é regravado nem entra no histórico. */
async function applyJunctions(
  writes: AuditedWrites,
  tenantId: string,
  contactId: string,
  profile: BuyerProfileInput,
  current: CurrentBuyerProfile,
): Promise<void> {
  const regions = { current: new Set(current.regions.map(buyerRegionKeyOf)), wanted: profile.regions.map(buyerRegionKeyOf) };
  const leavingRegions = removed(regions);
  if (leavingRegions.length > 0) {
    const codes = leavingRegions.filter((key) => /^\d/.test(key));
    const ufs = leavingRegions.filter((key) => !/^\d/.test(key));
    await writes.delete(
      buyerRegions,
      and(
        eq(buyerRegions.contactId, contactId),
        or(
          codes.length > 0 ? inArray(buyerRegions.municipalityIbgeCode, codes) : undefined,
          ufs.length > 0 ? inArray(buyerRegions.uf, ufs) : undefined,
        ),
      )!,
    );
  }
  for (const region of profile.regions.filter((r) => added(regions).includes(buyerRegionKeyOf(r)))) {
    await writes.insert(buyerRegions, {
      tenantId,
      contactId,
      municipalityIbgeCode: 'ibgeCode' in region ? region.ibgeCode : null,
      uf: 'uf' in region ? region.uf : null,
    });
  }

  const crop = { current: current.cropIds, wanted: profile.cropIds };
  if (removed(crop).length > 0) {
    await writes.delete(buyerCrops, and(eq(buyerCrops.contactId, contactId), inArray(buyerCrops.cropId, removed(crop)))!);
  }
  for (const cropId of added(crop)) await writes.insert(buyerCrops, { tenantId, contactId, cropId });

  const payment = { current: current.paymentMethodIds, wanted: profile.paymentMethodIds };
  if (removed(payment).length > 0) {
    await writes.delete(
      buyerPaymentMethods,
      and(eq(buyerPaymentMethods.contactId, contactId), inArray(buyerPaymentMethods.paymentMethodId, removed(payment)))!,
    );
  }
  for (const paymentMethodId of added(payment))
    await writes.insert(buyerPaymentMethods, { tenantId, contactId, paymentMethodId });
}

/**
 * Substituição completa: colunas e as três junções (o que veio ausente já é
 * vazio no schema). Perfil sem nenhuma coluna preenchida (e sem dado financeiro
 * preservado) não tem linha: a existente é apagada, e nenhuma nasce — as
 * junções seguem as suas listas.
 */
export async function replaceBuyerProfile(
  writes: AuditedWrites,
  tenantId: string,
  contactId: string,
  profile: BuyerProfileInput,
  current: CurrentBuyerProfile,
): Promise<void> {
  const { regions: _regions, cropIds: _cropIds, paymentMethodIds: _paymentMethodIds, ...columns } = profile;
  if (isBuyerProfileEmpty(columns) && !hasFinancialData(current.row)) {
    if (current.row) await writes.delete(buyerProfiles, eq(buyerProfiles.id, current.row.id));
  } else if (current.row) {
    await writes.update(buyerProfiles, columns, eq(buyerProfiles.id, current.row.id));
  } else {
    await writes.insert(buyerProfiles, { ...columns, tenantId, contactId });
  }
  await applyJunctions(writes, tenantId, contactId, profile, current);
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
