// Fazendas da empresa ativa. Fazenda e auditoria vão numa transação só (a que a
// rota abre por `withTenant`), num `change_id` por save. O escopo de dados
// (`own` vê só as próprias) entra em toda leitura e escrita; fora dele é 404.
import {
  auditedWrites,
  commercialStatuses,
  contacts,
  farmOwners,
  farms,
  memberships,
  municipalities,
  tradingPosts,
  users,
  type AuditActor,
  type AuditedWrites,
  type Transaction,
} from '@crm/db';
import {
  FARM_OWNER_UNKNOWN_MESSAGE,
  FARM_MUNICIPALITY_UNKNOWN_MESSAGE,
  FARM_NO_DEFAULT_STATUS_MESSAGE,
  FARM_RESPONSIBLE_FORBIDDEN_MESSAGE,
  FARM_RESPONSIBLE_UNKNOWN_MESSAGE,
  FARM_STATUS_UNKNOWN_MESSAGE,
  FARM_TRADING_POST_UNKNOWN_MESSAGE,
  FARM_USABLE_AREA_EXCEEDS_TOTAL_MESSAGE,
  usableExceedsTotal,
  type ContactFarm,
  type CreateFarmInput,
  type FarmOwnerInput,
  type Farm,
  type FarmListQuery,
  type ListPage,
  type UpdateFarmInput,
} from '@crm/shared';
import { and, asc, eq, exists, inArray, sql, type SQL } from 'drizzle-orm';
import { dataScopeClause } from '../../authorization/data-scope.js';
import { dataScopeOf, type EffectiveAccess } from '../../authorization/effective-access.js';
import { defineList, paginatedQuery } from '../../listing/query.js';
import { ensureContactRole } from '../contacts/service.js';
import { defaultEntries } from '../settings/service.js';

type FarmRow = typeof farms.$inferSelect;

/** Lista de fazendas: mais recentes primeiro, desempate por `id` (feito pelo helper). `q` e filtros chegam em issue seguinte. */
export const farmList = defineList({
  table: farms,
  sortable: {
    createdAt: farms.createdAt,
    name: sql`${farms.name} collate "pt-BR-x-icu"`,
    totalAreaHa: farms.totalAreaHa,
  },
  defaultSort: '-createdAt',
  searchable: [],
});

/** Recusa de regra de negócio (400), com a mensagem pronta para exibir e o campo, se há um. */
export interface FarmRejection {
  rejected: string;
  field?: string;
}

/** Quem tem escopo `own` tentou atribuir a fazenda a outro corretor (403). */
export interface FarmForbidden {
  forbidden: string;
}

export const isRejection = (result: unknown): result is FarmRejection =>
  typeof result === 'object' && result !== null && 'rejected' in result;

export const isForbidden = (result: unknown): result is FarmForbidden =>
  typeof result === 'object' && result !== null && 'forbidden' in result;

/** O predicado de escopo de dados do módulo, o mesmo em lista, total, detalhe, histórico e escrita. */
const scopeOf = (access: EffectiveAccess): SQL => dataScopeClause(access, 'fazendas', farms.responsibleUserId);

/** Referências com o nome de hoje, ativas ou não: o inativo já gravado continua exibido. */
async function serialize(tx: Transaction, rows: readonly FarmRow[]): Promise<Farm[]> {
  if (rows.length === 0) return [];
  const unique = <T>(values: readonly (T | null)[]) => [...new Set(values.filter((value): value is T => value !== null))];

  const [municipalityRows, statusRows, userRows, postRows, ownerRows] = await Promise.all([
    tx
      .select({ ibgeCode: municipalities.ibgeCode, name: municipalities.name, uf: municipalities.uf })
      .from(municipalities)
      .where(inArray(municipalities.ibgeCode, unique(rows.map((row) => row.municipalityIbgeCode)))),
    tx
      .select({ id: commercialStatuses.id, name: commercialStatuses.name })
      .from(commercialStatuses)
      .where(inArray(commercialStatuses.id, unique(rows.map((row) => row.commercialStatusId)))),
    tx
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, unique(rows.map((row) => row.responsibleUserId)))),
    tx
      .select({ id: tradingPosts.id, name: tradingPosts.name })
      .from(tradingPosts)
      .where(inArray(tradingPosts.id, unique(rows.map((row) => row.tradingPostId)))),
    tx
      .select({
        farmId: farmOwners.farmId,
        contactId: farmOwners.contactId,
        name: contacts.name,
        isPrimary: farmOwners.isPrimary,
      })
      .from(farmOwners)
      .innerJoin(contacts, eq(contacts.id, farmOwners.contactId))
      .where(inArray(farmOwners.farmId, rows.map((row) => row.id)))
      .orderBy(asc(farmOwners.id)),
  ]);
  const ownersByFarm = new Map<string, Farm['owners']>();
  for (const { farmId, ...owner } of ownerRows) ownersByFarm.set(farmId, [...(ownersByFarm.get(farmId) ?? []), owner]);
  const municipalityByCode = new Map(municipalityRows.map((row) => [row.ibgeCode, row]));
  const statusById = new Map(statusRows.map((row) => [row.id, row]));
  const userById = new Map(userRows.map((row) => [row.id, row]));
  const postById = new Map(postRows.map((row) => [row.id, row]));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    municipality: municipalityByCode.get(row.municipalityIbgeCode)! as Farm['municipality'],
    responsible: userById.get(row.responsibleUserId)!,
    tradingPost: row.tradingPostId ? (postById.get(row.tradingPostId) ?? null) : null,
    commercialStatus: statusById.get(row.commercialStatusId)!,
    totalAreaHa: row.totalAreaHa,
    usableAreaHa: row.usableAreaHa,
    owners: ownersByFarm.get(row.id) ?? [],
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function listFarms(tx: Transaction, access: EffectiveAccess, query: FarmListQuery): Promise<ListPage<Farm>> {
  const page = await paginatedQuery(tx, farmList, query, { scope: scopeOf(access) });
  return { ...page, items: await serialize(tx, page.items) };
}

async function findRow(tx: Transaction, access: EffectiveAccess, id: string, lock = false): Promise<FarmRow | null> {
  const query = tx.select().from(farms).where(and(eq(farms.id, id), scopeOf(access)));
  const [row] = await (lock ? query.for('update') : query);
  return row ?? null;
}

/** Se o leitor vê a fazenda (existe na empresa e está no escopo dele); é o `isVisible` do histórico. */
export async function farmVisible(tx: Transaction, access: EffectiveAccess, id: string): Promise<boolean> {
  const [row] = await tx.select({ id: farms.id }).from(farms).where(and(eq(farms.id, id), scopeOf(access)));
  return row !== undefined;
}

export async function getFarm(tx: Transaction, access: EffectiveAccess, id: string): Promise<Farm | null> {
  const row = await findRow(tx, access, id);
  return row ? (await serialize(tx, [row]))[0]! : null;
}

/** Com escopo `own`, o corretor responsável só pode ser o próprio usuário. */
const mayAssign = (access: EffectiveAccess, responsibleUserId: string) =>
  dataScopeOf(access, 'fazendas') === 'all' || responsibleUserId === access.userId;

interface ReferenceInput {
  municipalityIbgeCode?: string | undefined;
  tradingPostId?: string | null | undefined;
  commercialStatusId?: string | undefined;
  responsibleUserId?: string | undefined;
}

/**
 * As referências existem na empresa ativa (a FK não passa pelo RLS, então o
 * serviço confere) e, as que mudam, estão ativas. O que já estava gravado
 * continua valendo mesmo que tenha ficado inativo. `current` é a fazenda
 * salva, na edição.
 */
async function referenceRejection(
  tx: Transaction,
  tenantId: string,
  input: ReferenceInput,
  current?: FarmRow,
): Promise<FarmRejection | null> {
  const { municipalityIbgeCode, tradingPostId, commercialStatusId, responsibleUserId } = input;

  if (municipalityIbgeCode !== undefined && municipalityIbgeCode !== current?.municipalityIbgeCode) {
    const [row] = await tx
      .select({ active: municipalities.active })
      .from(municipalities)
      .where(eq(municipalities.ibgeCode, municipalityIbgeCode));
    if (!row?.active) return { rejected: FARM_MUNICIPALITY_UNKNOWN_MESSAGE, field: 'municipalityIbgeCode' };
  }
  if (tradingPostId && tradingPostId !== current?.tradingPostId) {
    const [row] = await tx.select({ active: tradingPosts.active }).from(tradingPosts).where(eq(tradingPosts.id, tradingPostId));
    if (!row?.active) return { rejected: FARM_TRADING_POST_UNKNOWN_MESSAGE, field: 'tradingPostId' };
  }
  if (commercialStatusId && commercialStatusId !== current?.commercialStatusId) {
    const [row] = await tx
      .select({ active: commercialStatuses.active })
      .from(commercialStatuses)
      .where(eq(commercialStatuses.id, commercialStatusId));
    if (!row?.active) return { rejected: FARM_STATUS_UNKNOWN_MESSAGE, field: 'commercialStatusId' };
  }
  if (responsibleUserId && responsibleUserId !== current?.responsibleUserId) {
    const [row] = await tx
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, responsibleUserId)));
    if (!row) return { rejected: FARM_RESPONSIBLE_UNKNOWN_MESSAGE, field: 'responsibleUserId' };
  }
  return null;
}

export async function createFarm(
  tx: Transaction,
  actor: AuditActor & { tenantId: string },
  access: EffectiveAccess,
  input: CreateFarmInput,
): Promise<Farm | FarmRejection | FarmForbidden> {
  const responsibleUserId = input.responsibleUserId ?? actor.userId!;
  if (!mayAssign(access, responsibleUserId)) return { forbidden: FARM_RESPONSIBLE_FORBIDDEN_MESSAGE };

  const commercialStatusId = input.commercialStatusId ?? (await defaultEntries(tx, 'commercial-statuses')).available?.id;
  if (!commercialStatusId) return { rejected: FARM_NO_DEFAULT_STATUS_MESSAGE, field: 'commercialStatusId' };

  const refused = await referenceRejection(tx, actor.tenantId, { ...input, responsibleUserId, commercialStatusId });
  if (refused) return refused;
  const ownerRefused = await ownerRejection(tx, input.owners ?? []);
  if (ownerRefused) return ownerRefused;

  const writes = auditedWrites(tx, actor);
  const row = await writes.insert(farms, {
    tenantId: actor.tenantId,
    name: input.name,
    municipalityIbgeCode: input.municipalityIbgeCode,
    responsibleUserId,
    tradingPostId: input.tradingPostId ?? null,
    totalAreaHa: input.totalAreaHa,
    usableAreaHa: input.usableAreaHa ?? null,
    commercialStatusId,
  });
  await applyOwners(tx, writes, actor, row.id, input.owners ?? []);
  return (await serialize(tx, [row]))[0]!;
}

/** Altera a fazenda. Nulo se não existe ou está fora do escopo (404). */
export async function updateFarm(
  tx: Transaction,
  actor: AuditActor & { tenantId: string },
  access: EffectiveAccess,
  id: string,
  input: UpdateFarmInput,
): Promise<Farm | FarmRejection | FarmForbidden | null> {
  // Trava a fazenda no início do save: saves concorrentes são serializados, e os
  // proprietários lidos depois do lock já refletem o save que terminou antes.
  const current = await findRow(tx, access, id, true);
  if (!current) return null;

  if (input.responsibleUserId !== undefined && !mayAssign(access, input.responsibleUserId)) {
    return { forbidden: FARM_RESPONSIBLE_FORBIDDEN_MESSAGE };
  }
  // O schema só confere o par que veio junto; o resto é conferido contra o cadastro.
  const totalAreaHa = input.totalAreaHa ?? current.totalAreaHa;
  const usableAreaHa = input.usableAreaHa === undefined ? current.usableAreaHa : input.usableAreaHa;
  if (usableExceedsTotal(totalAreaHa, usableAreaHa)) {
    return { rejected: FARM_USABLE_AREA_EXCEEDS_TOTAL_MESSAGE, field: 'usableAreaHa' };
  }
  const refused = await referenceRejection(tx, actor.tenantId, input, current);
  if (refused) return refused;

  if (input.owners !== undefined) {
    const ownerRefused = await ownerRejection(tx, input.owners);
    if (ownerRefused) return ownerRefused;
  }

  const { owners, ...fields } = input;
  const set: Partial<typeof farms.$inferInsert> = { ...fields };
  const writes = auditedWrites(tx, actor);
  let row: FarmRow | undefined = current;
  if (Object.keys(set).length > 0) [row] = await writes.update(farms, set, eq(farms.id, id));
  if (!row) return null;
  if (owners !== undefined) await applyOwners(tx, writes, actor, id, owners);
  return (await serialize(tx, [row]))[0]!;
}

/** Os contatos existem na empresa ativa (a FK não passa pelo RLS e o papel seria gravado em contato alheio). */
async function ownerRejection(tx: Transaction, owners: readonly FarmOwnerInput[]): Promise<FarmRejection | null> {
  if (owners.length === 0) return null;
  const ids = owners.map((owner) => owner.contactId);
  const found = await tx.select({ id: contacts.id }).from(contacts).where(inArray(contacts.id, ids));
  return found.length === new Set(ids).size ? null : { rejected: FARM_OWNER_UNKNOWN_MESSAGE, field: 'owners' };
}

/**
 * Substitui o conjunto de proprietários por diferença, em ordem fixa (nunca
 * delete + insert): apaga os retirados; tira a marca do principal antigo; marca o
 * novo principal entre os que ficam; insere os novos (já com a marca, porque o
 * passo anterior liberou o índice parcial). Quem não mudou não é regravado. A
 * fazenda já está travada por quem chama.
 */
async function applyOwners(
  tx: Transaction,
  writes: AuditedWrites,
  actor: AuditActor & { tenantId: string },
  farmId: string,
  desired: readonly FarmOwnerInput[],
): Promise<void> {
  const current = await tx.select().from(farmOwners).where(eq(farmOwners.farmId, farmId));
  const currentByContact = new Map(current.map((owner) => [owner.contactId, owner]));
  const desiredIds = new Set(desired.map((owner) => owner.contactId));

  const removed = current.filter((owner) => !desiredIds.has(owner.contactId));
  if (removed.length > 0) {
    await writes.delete(
      farmOwners,
      and(
        eq(farmOwners.farmId, farmId),
        inArray(
          farmOwners.contactId,
          removed.map((owner) => owner.contactId),
        ),
      )!,
    );
  }

  const newPrimary = desired.find((owner) => owner.isPrimary);
  const oldPrimary = current.find((owner) => owner.isPrimary && desiredIds.has(owner.contactId));
  if (oldPrimary && newPrimary && oldPrimary.contactId !== newPrimary.contactId) {
    await writes.update(farmOwners, { isPrimary: false }, eq(farmOwners.id, oldPrimary.id));
  }
  const promoted = newPrimary && currentByContact.get(newPrimary.contactId);
  if (promoted && !promoted.isPrimary) {
    await writes.update(farmOwners, { isPrimary: true }, eq(farmOwners.id, promoted.id));
  }

  for (const owner of desired) {
    if (currentByContact.has(owner.contactId)) continue;
    await writes.insert(farmOwners, {
      tenantId: actor.tenantId,
      farmId,
      contactId: owner.contactId,
      isPrimary: owner.isPrimary,
    });
    await ensureContactRole(tx, actor, owner.contactId, 'owner');
  }
}

/** Fazendas de que o contato é proprietário, no escopo do leitor e em qualquer status (a lista e o total). */
export async function listFarmsOfOwner(
  tx: Transaction,
  access: EffectiveAccess,
  contactId: string,
  query: FarmListQuery,
): Promise<ListPage<ContactFarm>> {
  const owned = exists(
    tx
      .select({ one: sql`1` })
      .from(farmOwners)
      .where(and(eq(farmOwners.farmId, farms.id), eq(farmOwners.contactId, contactId))),
  );
  const page = await paginatedQuery(tx, farmList, query, { scope: scopeOf(access), filters: [owned] });
  const items = (await serialize(tx, page.items)).map((farm) => ({
    id: farm.id,
    name: farm.name,
    municipality: farm.municipality,
    commercialStatus: farm.commercialStatus,
    isPrimary: farm.owners.some((owner) => owner.contactId === contactId && owner.isPrimary),
  }));
  return { ...page, items };
}
