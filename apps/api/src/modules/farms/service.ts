// Fazendas da empresa ativa. Fazenda e auditoria vão numa transação só (a que a
// rota abre por `withTenant`), num `change_id` por save. O escopo de dados
// (`own` vê só as próprias) entra em toda leitura e escrita; fora dele é 404.
import {
  aptitudes,
  auditedWrites,
  commercialStatuses,
  contacts,
  crops,
  farmAptitudes,
  farmCrops,
  farmOwners,
  farms,
  memberships,
  municipalities,
  normalizedText,
  tradingPosts,
  users,
  type AuditActor,
  type AuditedWrites,
  type Transaction,
} from '@crm/db';
import {
  FARM_APTITUDE_UNKNOWN_MESSAGE,
  FARM_COORDINATES_PAIR_MESSAGE,
  FARM_CROP_UNKNOWN_MESSAGE,
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
  type FarmDuplicate,
  type FarmDuplicatesQuery,
  type FarmListQuery,
  type ListPage,
  type UpdateFarmInput,
} from '@crm/shared';
import { and, asc, eq, exists, inArray, ne, sql, type SQL } from 'drizzle-orm';
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

  const farmIds = rows.map((row) => row.id);
  const [municipalityRows, statusRows, userRows, postRows, aptitudeRows, cropRows, ownerRows] = await Promise.all([
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
      .select({ farmId: farmAptitudes.farmId, id: aptitudes.id, name: aptitudes.name })
      .from(farmAptitudes)
      .innerJoin(aptitudes, eq(aptitudes.id, farmAptitudes.aptitudeId))
      .where(inArray(farmAptitudes.farmId, farmIds))
      .orderBy(sql`${aptitudes.name} collate "pt-BR-x-icu"`, asc(aptitudes.id)),
    tx
      .select({ farmId: farmCrops.farmId, id: crops.id, name: crops.name })
      .from(farmCrops)
      .innerJoin(crops, eq(crops.id, farmCrops.cropId))
      .where(inArray(farmCrops.farmId, farmIds))
      .orderBy(sql`${crops.name} collate "pt-BR-x-icu"`, asc(crops.id)),
    tx
      .select({
        farmId: farmOwners.farmId,
        contactId: farmOwners.contactId,
        name: contacts.name,
        isPrimary: farmOwners.isPrimary,
      })
      .from(farmOwners)
      .innerJoin(contacts, eq(contacts.id, farmOwners.contactId))
      .where(inArray(farmOwners.farmId, farmIds))
      .orderBy(asc(farmOwners.id)),
  ]);
  const groupByFarm = (items: readonly { farmId: string; id: string; name: string }[]) => {
    const grouped = new Map<string, { id: string; name: string }[]>();
    for (const { farmId, id, name } of items) grouped.set(farmId, [...(grouped.get(farmId) ?? []), { id, name }]);
    return grouped;
  };
  const aptitudesByFarm = groupByFarm(aptitudeRows);
  const cropsByFarm = groupByFarm(cropRows);
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
    salesPotential: row.salesPotential as Farm['salesPotential'],
    priority: row.priority as Farm['priority'],
    waterAvailability: row.waterAvailability as Farm['waterAvailability'],
    irrigationPotential: row.irrigationPotential as Farm['irrigationPotential'],
    productivePotential: row.productivePotential as Farm['productivePotential'],
    distanceToHighwayKm: row.distanceToHighwayKm,
    distanceToWarehouseKm: row.distanceToWarehouseKm,
    documentStatus: row.documentStatus as Farm['documentStatus'],
    documentNotes: row.documentNotes,
    soil: row.soil,
    topography: row.topography,
    water: row.water,
    historicalProductivity: row.historicalProductivity,
    infrastructure: row.infrastructure,
    technicalSummary: row.technicalSummary,
    differentials: row.differentials,
    latitude: row.latitude,
    longitude: row.longitude,
    aptitudes: aptitudesByFarm.get(row.id) ?? [],
    crops: cropsByFarm.get(row.id) ?? [],
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
const DUPLICATES_LIMIT = 20;

/**
 * Possíveis duplicatas: mesmo nome (sem caixa nem acento) no mesmo município,
 * dentro do escopo de dados de quem consulta. Igualdade, não substring. Sem
 * nome ou sem município não há o que comparar: lista vazia.
 */
export async function findFarmDuplicates(tx: Transaction, access: EffectiveAccess, query: FarmDuplicatesQuery): Promise<FarmDuplicate[]> {
  const { name, municipalityIbgeCode, excludeId } = query;
  if (!name || !municipalityIbgeCode) return [];
  const rows = await tx
    .select({ id: farms.id, name: farms.name })
    .from(farms)
    .where(
      and(
        sql`${normalizedText(farms.name)} = ${normalizedText(name)}`,
        eq(farms.municipalityIbgeCode, municipalityIbgeCode),
        scopeOf(access),
        excludeId ? ne(farms.id, excludeId) : undefined,
      ),
    )
    .orderBy(sql`${farms.name} collate "pt-BR-x-icu"`, farms.id)
    .limit(DUPLICATES_LIMIT);
  if (rows.length === 0) return [];
  // Todas as linhas estão no mesmo município: uma consulta basta (a tabela é de referência, sem RLS).
  const [municipality] = await tx
    .select({ ibgeCode: municipalities.ibgeCode, name: municipalities.name, uf: municipalities.uf })
    .from(municipalities)
    .where(eq(municipalities.ibgeCode, municipalityIbgeCode));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    municipality: municipality! as FarmDuplicate['municipality'],
    reasons: ['name_municipality'],
  }));
}

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

/** Os campos técnicos e comerciais que vão direto para a coluna; ausente é "não informado". */
const SCALAR_FIELDS = [
  'salesPotential',
  'priority',
  'waterAvailability',
  'irrigationPotential',
  'productivePotential',
  'distanceToHighwayKm',
  'distanceToWarehouseKm',
  'documentStatus',
  'documentNotes',
  'soil',
  'topography',
  'water',
  'historicalProductivity',
  'infrastructure',
  'technicalSummary',
  'differentials',
  'latitude',
  'longitude',
] as const;

const scalarValues = (input: CreateFarmInput) =>
  Object.fromEntries(SCALAR_FIELDS.map((field) => [field, input[field] ?? null])) as Pick<typeof farms.$inferInsert, (typeof SCALAR_FIELDS)[number]>;

/** As duas coordenadas ou nenhuma: no PATCH vale o par efetivo (enviado, senão gravado). */
function coordinatesRejection(input: UpdateFarmInput, current: FarmRow): FarmRejection | null {
  const latitude = input.latitude === undefined ? current.latitude : input.latitude;
  const longitude = input.longitude === undefined ? current.longitude : input.longitude;
  if ((latitude === null) === (longitude === null)) return null;
  return { rejected: FARM_COORDINATES_PAIR_MESSAGE, field: latitude === null ? 'latitude' : 'longitude' };
}

interface JunctionSpec {
  /** Cadastro auxiliar que a junção aponta. */
  vocabulary: typeof aptitudes | typeof crops;
  message: string;
  field: 'aptitudeIds' | 'cropIds';
}

/**
 * Os ids existem na empresa ativa (o RLS esconde os de outra: "não encontrado"
 * é de outra empresa ou inexistente) e os que entram estão ativos. Quem já
 * estava gravado e ficou inativo continua valendo.
 */
async function junctionRejection(
  tx: Transaction,
  { vocabulary, message, field }: JunctionSpec,
  ids: readonly string[],
  currentIds: ReadonlySet<string>,
): Promise<FarmRejection | null> {
  if (ids.length === 0) return null;
  const found = await tx
    .select({ id: vocabulary.id, active: vocabulary.active })
    .from(vocabulary)
    .where(inArray(vocabulary.id, [...ids]));
  const byId = new Map(found.map((row) => [row.id, row.active]));
  const refused = ids.some((id) => !byId.has(id) || (!currentIds.has(id) && !byId.get(id)));
  return refused ? { rejected: message, field } : null;
}

const APTITUDES: JunctionSpec = { vocabulary: aptitudes, message: FARM_APTITUDE_UNKNOWN_MESSAGE, field: 'aptitudeIds' };
const CROPS: JunctionSpec = { vocabulary: crops, message: FARM_CROP_UNKNOWN_MESSAGE, field: 'cropIds' };

async function currentJunctionIds(tx: Transaction, farmId: string): Promise<{ aptitudeIds: Set<string>; cropIds: Set<string> }> {
  const [aptitudeRows, cropRows] = await Promise.all([
    tx.select({ id: farmAptitudes.aptitudeId }).from(farmAptitudes).where(eq(farmAptitudes.farmId, farmId)),
    tx.select({ id: farmCrops.cropId }).from(farmCrops).where(eq(farmCrops.farmId, farmId)),
  ]);
  return { aptitudeIds: new Set(aptitudeRows.map((row) => row.id)), cropIds: new Set(cropRows.map((row) => row.id)) };
}

type Writes = ReturnType<typeof auditedWrites>;

/** Leva o conjunto gravado ao pedido, só pela diferença: quem não mudou não é regravado nem entra no histórico. */
async function applyAptitudes(writes: Writes, tenantId: string, farmId: string, current: ReadonlySet<string>, wanted: readonly string[]) {
  const removed = [...current].filter((id) => !wanted.includes(id));
  if (removed.length > 0) {
    await writes.delete(farmAptitudes, and(eq(farmAptitudes.farmId, farmId), inArray(farmAptitudes.aptitudeId, removed))!);
  }
  for (const aptitudeId of wanted.filter((id) => !current.has(id))) {
    await writes.insert(farmAptitudes, { tenantId, farmId, aptitudeId });
  }
}

async function applyCrops(writes: Writes, tenantId: string, farmId: string, current: ReadonlySet<string>, wanted: readonly string[]) {
  const removed = [...current].filter((id) => !wanted.includes(id));
  if (removed.length > 0) {
    await writes.delete(farmCrops, and(eq(farmCrops.farmId, farmId), inArray(farmCrops.cropId, removed))!);
  }
  for (const cropId of wanted.filter((id) => !current.has(id))) {
    await writes.insert(farmCrops, { tenantId, farmId, cropId });
  }
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

  const none = new Set<string>();
  const aptitudeIds = input.aptitudeIds ?? [];
  const cropIds = input.cropIds ?? [];
  const refusedJunction =
    (await junctionRejection(tx, APTITUDES, aptitudeIds, none)) ?? (await junctionRejection(tx, CROPS, cropIds, none));
  if (refusedJunction) return refusedJunction;

  const writes = auditedWrites(tx, actor);
  const row = await writes.insert(farms, {
    ...scalarValues(input),
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
  await applyAptitudes(writes, actor.tenantId, row.id, none, aptitudeIds);
  await applyCrops(writes, actor.tenantId, row.id, none, cropIds);
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
  const { aptitudeIds, cropIds, owners, ...fields } = input;
  const refused = (await referenceRejection(tx, actor.tenantId, fields, current)) ?? coordinatesRejection(fields, current);
  if (refused) return refused;

  if (owners !== undefined) {
    const ownerRefused = await ownerRejection(tx, owners);
    if (ownerRefused) return ownerRefused;
  }

  const currentJunctions = await currentJunctionIds(tx, id);
  if (aptitudeIds) {
    const refusedAptitudes = await junctionRejection(tx, APTITUDES, aptitudeIds, currentJunctions.aptitudeIds);
    if (refusedAptitudes) return refusedAptitudes;
  }
  if (cropIds) {
    const refusedCrops = await junctionRejection(tx, CROPS, cropIds, currentJunctions.cropIds);
    if (refusedCrops) return refusedCrops;
  }

  // Um `change_id` por save: a fazenda e as junções vão no mesmo histórico.
  const writes = auditedWrites(tx, actor);
  const set: Partial<typeof farms.$inferInsert> = { ...fields };
  const [updated] = Object.keys(set).length === 0 ? [current] : await writes.update(farms, set, eq(farms.id, id));
  if (!updated) return null;
  if (aptitudeIds) await applyAptitudes(writes, actor.tenantId, id, currentJunctions.aptitudeIds, aptitudeIds);
  if (cropIds) await applyCrops(writes, actor.tenantId, id, currentJunctions.cropIds, cropIds);
  if (owners !== undefined) await applyOwners(tx, writes, actor, id, owners);
  return (await serialize(tx, [updated]))[0]!;
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
