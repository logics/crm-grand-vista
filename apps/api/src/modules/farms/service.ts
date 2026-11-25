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
  FARM_DELETE_NOT_INACTIVE_MESSAGE,
  FARM_OWNER_UNKNOWN_MESSAGE,
  FARM_MUNICIPALITY_UNKNOWN_MESSAGE,
  FARM_NO_DEFAULT_STATUS_MESSAGE,
  FARM_RESPONSIBLE_FORBIDDEN_MESSAGE,
  FARM_RESPONSIBLE_UNKNOWN_MESSAGE,
  FARM_STATUS_UNKNOWN_MESSAGE,
  FARM_VALUATION_CROP_UNKNOWN_MESSAGE,
  FARM_TRADING_POST_UNKNOWN_MESSAGE,
  FARM_USABLE_AREA_EXCEEDS_TOTAL_MESSAGE,
  priceDerivatives,
  usableExceedsTotal,
  type AlqueireType,
  type ContactFarm,
  type PricingMode,
  type ValuationBagsUnit,
  type CreateFarmInput,
  type FarmOwnerInput,
  type Farm,
  type FarmDetail,
  type FarmDuplicate,
  type FarmDuplicatesQuery,
  type FarmListQuery,
  type ListPage,
  type UpdateFarmInput,
} from '@crm/shared';
import { and, asc, eq, exists, inArray, isNull, ne, notInArray, or, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { dataScopeOf, type EffectiveAccess } from '../../authorization/effective-access.js';
import { defineList, escapeLike, paginatedQuery } from '../../listing/query.js';
import { ensureContactRole } from '../../contact-roles/ensure.js';
import { defaultEntries } from '../settings/service.js';
import { deleteReferralChain, readReferralChain, replaceReferralChain } from '../referrals/service.js';
import { farmScopeOf } from './scope.js';

type FarmRow = typeof farms.$inferSelect;

/**
 * Lista de fazendas: mais recentes primeiro, desempate por `id` (feito pelo
 * helper). `q` procura no nome, nos sete textos livres e na observação
 * documental; município e proprietários entram por `farmSearchAlso`. Preço:
 * quem não tem (sem preço e em sacas) fica no fim nas duas direções.
 */
export const farmList = defineList({
  table: farms,
  sortable: {
    createdAt: farms.createdAt,
    name: sql`${farms.name} collate "pt-BR-x-icu"`,
    totalAreaHa: farms.totalAreaHa,
    askingPrice: farms.askingPrice,
  },
  nullsLast: ['askingPrice'],
  defaultSort: '-createdAt',
  searchable: [
    farms.name,
    farms.soil,
    farms.topography,
    farms.water,
    farms.historicalProductivity,
    farms.infrastructure,
    farms.technicalSummary,
    farms.differentials,
    farms.documentNotes,
  ],
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

/** Referências com o nome de hoje, ativas ou não: o inativo já gravado continua exibido. */
async function serialize(tx: Transaction, rows: readonly FarmRow[]): Promise<Farm[]> {
  if (rows.length === 0) return [];
  const unique = <T>(values: readonly (T | null)[]) => [...new Set(values.filter((value): value is T => value !== null))];

  const farmIds = rows.map((row) => row.id);
  const [municipalityRows, statusRows, userRows, postRows, valuationCropRows, aptitudeRows, cropRows, ownerRows] = await Promise.all([
    tx
      .select({ ibgeCode: municipalities.ibgeCode, name: municipalities.name, uf: municipalities.uf })
      .from(municipalities)
      .where(inArray(municipalities.ibgeCode, unique(rows.map((row) => row.municipalityIbgeCode)))),
    tx
      .select({ id: commercialStatuses.id, name: commercialStatuses.name, systemMeaning: commercialStatuses.systemMeaning })
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
      .select({ id: crops.id, name: crops.name })
      .from(crops)
      .where(inArray(crops.id, unique(rows.map((row) => row.valuationCropId)))),
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
  const valuationCropById = new Map(valuationCropRows.map((row) => [row.id, row]));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    municipality: municipalityByCode.get(row.municipalityIbgeCode)! as Farm['municipality'],
    responsible: userById.get(row.responsibleUserId)!,
    tradingPost: row.tradingPostId ? (postById.get(row.tradingPostId) ?? null) : null,
    commercialStatus: statusById.get(row.commercialStatusId)! as Farm['commercialStatus'],
    totalAreaHa: row.totalAreaHa,
    usableAreaHa: row.usableAreaHa,
    pricingMode: row.pricingMode as PricingMode | null,
    askingPrice: row.askingPrice,
    valuationBags: row.valuationBags,
    valuationBagsUnit: row.valuationBagsUnit as ValuationBagsUnit | null,
    valuationBagsAlqueireType: row.valuationBagsAlqueireType as AlqueireType | null,
    valuationCrop: row.valuationCropId ? (valuationCropById.get(row.valuationCropId) ?? null) : null,
    priceDerivatives: priceDerivatives({
      pricingMode: row.pricingMode as PricingMode | null,
      askingPrice: row.askingPrice,
      valuationBags: row.valuationBags,
      valuationBagsUnit: row.valuationBagsUnit as ValuationBagsUnit | null,
      valuationBagsAlqueireType: row.valuationBagsAlqueireType as AlqueireType | null,
      totalAreaHa: row.totalAreaHa,
      usableAreaHa: row.usableAreaHa,
    }),
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

/** Outras maneiras de `q` achar a fazenda: o nome do município e o nome de qualquer proprietário. */
function farmSearchAlso(tx: Transaction, q: string | undefined): (SQL | undefined)[] {
  if (q === undefined) return [];
  const pattern = normalizedText(`%${escapeLike(q)}%`);
  return [
    exists(
      tx
        .select({ one: sql`1` })
        .from(municipalities)
        .where(and(eq(municipalities.ibgeCode, farms.municipalityIbgeCode), sql`${normalizedText(municipalities.name)} like ${pattern}`)),
    ),
    exists(
      tx
        .select({ one: sql`1` })
        .from(farmOwners)
        .innerJoin(contacts, eq(contacts.id, farmOwners.contactId))
        .where(and(eq(farmOwners.farmId, farms.id), sql`${normalizedText(contacts.name)} like ${pattern}`)),
    ),
  ];
}

/** Existe linha da junção da fazenda com algum dos ids (qualquer um dos escolhidos). */
const joinedWithAny = (tx: Transaction, join: typeof farmAptitudes | typeof farmCrops | typeof farmOwners, column: AnyPgColumn, ids: readonly string[]) =>
  exists(
    tx
      .select({ one: sql`1` })
      .from(join)
      .where(and(eq(join.farmId, farms.id), inArray(column, [...ids]))),
  );

function farmFilters(tx: Transaction, access: EffectiveAccess, query: FarmListQuery): (SQL | undefined)[] {
  const ibgeCodes = query.region?.filter((token) => /^\d{7}$/.test(token));
  const ufs = query.region?.filter((token) => !/^\d{7}$/.test(token));
  const region = query.region
    ? or(
        ibgeCodes!.length > 0 ? inArray(farms.municipalityIbgeCode, ibgeCodes!) : undefined,
        ufs!.length > 0
          ? exists(
              tx
                .select({ one: sql`1` })
                .from(municipalities)
                .where(and(eq(municipalities.ibgeCode, farms.municipalityIbgeCode), inArray(municipalities.uf, ufs!))),
            )
          : undefined,
      )
    : undefined;
  // Sem status pedido, as desativadas ficam de fora (pelo significado, não pelo nome), da lista e do total.
  const status = query.commercialStatusId
    ? inArray(farms.commercialStatusId, query.commercialStatusId)
    : notInArray(
        farms.commercialStatusId,
        tx.select({ id: commercialStatuses.id }).from(commercialStatuses).where(eq(commercialStatuses.systemMeaning, 'inactive')),
      );
  // Decimais seguem como texto até o `numeric`: nunca passam por `Number`.
  const numeric = (column: AnyPgColumn, operator: '>=' | '<=', value: string | undefined) =>
    value === undefined ? undefined : sql`${column} ${sql.raw(operator)} ${value}::numeric`;
  const inBrl = sql`${farms.pricingMode} = 'brl'`;

  return [
    region,
    query.tradingPostId ? inArray(farms.tradingPostId, query.tradingPostId) : undefined,
    query.aptitudeId ? joinedWithAny(tx, farmAptitudes, farmAptitudes.aptitudeId, query.aptitudeId) : undefined,
    query.cropId ? joinedWithAny(tx, farmCrops, farmCrops.cropId, query.cropId) : undefined,
    status,
    // `own` já vê só as próprias: o filtro de corretor não tem o que acrescentar.
    query.responsibleUserId && dataScopeOf(access, 'fazendas') === 'all' ? inArray(farms.responsibleUserId, query.responsibleUserId) : undefined,
    query.salesPotential ? inArray(farms.salesPotential, query.salesPotential) : undefined,
    query.priority ? inArray(farms.priority, query.priority) : undefined,
    query.waterAvailability ? inArray(farms.waterAvailability, query.waterAvailability) : undefined,
    query.irrigationPotential ? inArray(farms.irrigationPotential, query.irrigationPotential) : undefined,
    query.productivePotential ? inArray(farms.productivePotential, query.productivePotential) : undefined,
    query.documentStatus ? inArray(farms.documentStatus, query.documentStatus) : undefined,
    numeric(farms.totalAreaHa, '>=', query.areaMin),
    numeric(farms.totalAreaHa, '<=', query.areaMax),
    // Valor só vale para fazenda em reais: em sacas e sem preço ficam fora.
    query.priceMin !== undefined || query.priceMax !== undefined
      ? and(inBrl, numeric(farms.askingPrice, '>=', query.priceMin), numeric(farms.askingPrice, '<=', query.priceMax))
      : undefined,
    query.noPrice ? isNull(farms.pricingMode) : undefined,
    numeric(farms.distanceToHighwayKm, '<=', query.maxDistanceToHighwayKm),
    numeric(farms.distanceToWarehouseKm, '<=', query.maxDistanceToWarehouseKm),
    query.ownerContactId ? joinedWithAny(tx, farmOwners, farmOwners.contactId, [query.ownerContactId]) : undefined,
  ];
}

export async function listFarms(tx: Transaction, access: EffectiveAccess, query: FarmListQuery): Promise<ListPage<Farm>> {
  const page = await paginatedQuery(tx, farmList, query, {
    scope: farmScopeOf(access),
    filters: farmFilters(tx, access, query),
    searchAlso: farmSearchAlso(tx, query.q),
  });
  return { ...page, items: await serialize(tx, page.items) };
}

async function findRow(tx: Transaction, access: EffectiveAccess, id: string, lock = false): Promise<FarmRow | null> {
  const query = tx.select().from(farms).where(and(eq(farms.id, id), farmScopeOf(access)));
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
        farmScopeOf(access),
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
  const [row] = await tx.select({ id: farms.id }).from(farms).where(and(eq(farms.id, id), farmScopeOf(access)));
  return row !== undefined;
}

/** A fazenda com a cadeia de indicação, como `GET /:id`, `POST` e `PATCH` a devolvem. */
async function withReferralChain(tx: Transaction, tenantId: string, farm: Farm): Promise<FarmDetail> {
  return { ...farm, referralChain: await readReferralChain(tx, tenantId, { kind: 'farm', id: farm.id }) };
}

export async function getFarm(tx: Transaction, tenantId: string, access: EffectiveAccess, id: string): Promise<FarmDetail | null> {
  const row = await findRow(tx, access, id);
  return row ? withReferralChain(tx, tenantId, (await serialize(tx, [row]))[0]!) : null;
}

/** Com escopo `own`, o corretor responsável só pode ser o próprio usuário. */
const mayAssign = (access: EffectiveAccess, responsibleUserId: string) =>
  dataScopeOf(access, 'fazendas') === 'all' || responsibleUserId === access.userId;

interface ReferenceInput {
  municipalityIbgeCode?: string | undefined;
  tradingPostId?: string | null | undefined;
  commercialStatusId?: string | undefined;
  responsibleUserId?: string | undefined;
  valuationCropId?: string | null | undefined;
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
  const { municipalityIbgeCode, tradingPostId, commercialStatusId, responsibleUserId, valuationCropId } = input;

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
  if (valuationCropId && valuationCropId !== current?.valuationCropId) {
    // A FK de `crops` não passa pelo RLS: sem esta consulta (que passa), cultura de outra empresa seria aceita.
    const [row] = await tx.select({ active: crops.active }).from(crops).where(eq(crops.id, valuationCropId));
    if (!row?.active) return { rejected: FARM_VALUATION_CROP_UNKNOWN_MESSAGE, field: 'valuationCropId' };
  }
  return null;
}

/** As seis colunas da precificação: as que não pertencem ao modo vão nulas. */
function pricingColumns(input: CreateFarmInput | UpdateFarmInput) {
  const mode = input.pricingMode ?? null;
  const bags = mode === 'bags';
  return {
    pricingMode: mode,
    askingPrice: mode === 'brl' ? (input.askingPrice ?? null) : null,
    valuationBags: bags ? (input.valuationBags ?? null) : null,
    valuationBagsUnit: bags ? (input.valuationBagsUnit ?? null) : null,
    valuationBagsAlqueireType: bags && input.valuationBagsUnit === 'per_alqueire' ? (input.valuationBagsAlqueireType ?? null) : null,
    valuationCropId: bags ? (input.valuationCropId ?? null) : null,
  };
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
): Promise<FarmDetail | FarmRejection | FarmForbidden> {
  const { referralChain } = input;
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
    ...pricingColumns(input),
  });
  await applyOwners(tx, writes, actor, row.id, input.owners ?? []);
  await applyAptitudes(writes, actor.tenantId, row.id, none, aptitudeIds);
  await applyCrops(writes, actor.tenantId, row.id, none, cropIds);
  // Lançada, não devolvida: só o rollback desfaz a fazenda já gravada.
  if (referralChain) await replaceReferralChain(tx, writes, actor, { kind: 'farm', id: row.id, name: row.name }, referralChain);
  return withReferralChain(tx, actor.tenantId, (await serialize(tx, [row]))[0]!);
}

/** Altera a fazenda. Nulo se não existe ou está fora do escopo (404). */
export async function updateFarm(
  tx: Transaction,
  actor: AuditActor & { tenantId: string },
  access: EffectiveAccess,
  id: string,
  input: UpdateFarmInput,
): Promise<FarmDetail | FarmRejection | FarmForbidden | null> {
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
  const { aptitudeIds, cropIds, owners, referralChain, ...fields } = input;
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
  // O modo manda no bloco: com ele no corpo, as seis colunas são regravadas num save só.
  const { pricingMode, askingPrice, valuationBags, valuationBagsUnit, valuationBagsAlqueireType, valuationCropId, ...rest } = fields;
  const set: Partial<typeof farms.$inferInsert> = {
    ...rest,
    ...(pricingMode !== undefined &&
      pricingColumns({ pricingMode, askingPrice, valuationBags, valuationBagsUnit, valuationBagsAlqueireType, valuationCropId })),
  };
  const [updated] = Object.keys(set).length === 0 ? [current] : await writes.update(farms, set, eq(farms.id, id));
  if (!updated) return null;
  if (aptitudeIds) await applyAptitudes(writes, actor.tenantId, id, currentJunctions.aptitudeIds, aptitudeIds);
  if (cropIds) await applyCrops(writes, actor.tenantId, id, currentJunctions.cropIds, cropIds);
  if (owners !== undefined) await applyOwners(tx, writes, actor, id, owners);
  // Lançada, não devolvida: só o rollback desfaz os campos já gravados.
  if (referralChain !== undefined) {
    await replaceReferralChain(tx, writes, actor, { kind: 'farm', id, name: updated.name }, referralChain);
  }
  return withReferralChain(tx, actor.tenantId, (await serialize(tx, [updated]))[0]!);
}

/** A fazenda não está desativada: a exclusão é recusada (409). */
export interface FarmDeleteRefused {
  conflict: string;
}

export const isDeleteRefused = (result: unknown): result is FarmDeleteRefused =>
  typeof result === 'object' && result !== null && 'conflict' in result;

/**
 * Exclui a fazenda, só se o status é de significado `inactive`. A linha é
 * travada (`FOR UPDATE OF farms`) antes de conferir, para uma troca de status
 * concorrente não passar entre a conferência e o delete. Nulo se não existe ou
 * está fora do escopo (404, sem revelar o status de fazenda alheia).
 */
export async function deleteFarm(
  tx: Transaction,
  actor: AuditActor & { tenantId: string },
  access: EffectiveAccess,
  id: string,
): Promise<'deleted' | FarmDeleteRefused | null> {
  const [row] = await tx
    .select({ id: farms.id, systemMeaning: commercialStatuses.systemMeaning })
    .from(farms)
    .innerJoin(commercialStatuses, eq(commercialStatuses.id, farms.commercialStatusId))
    .where(and(eq(farms.id, id), farmScopeOf(access)))
    .for('update', { of: farms });
  if (!row) return null;
  if (row.systemMeaning !== 'inactive') return { conflict: FARM_DELETE_NOT_INACTIVE_MESSAGE };

  // As junções têm ON DELETE cascade, que apagaria as linhas sem auditoria.
  // Por isso saem antes, por `writes.delete(...)`, na mesma instância da
  // fazenda (um só `change_id`): ficam auditadas como filhas.
  const writes = auditedWrites(tx, actor);
  await writes.delete(farmOwners, eq(farmOwners.farmId, id));
  await writes.delete(farmCrops, eq(farmCrops.farmId, id));
  await writes.delete(farmAptitudes, eq(farmAptitudes.farmId, id));
  await deleteReferralChain(writes, { kind: 'farm', id });
  await writes.delete(farms, eq(farms.id, id));
  return 'deleted';
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
  const page = await paginatedQuery(tx, farmList, query, { scope: farmScopeOf(access), filters: [owned] });
  const items = (await serialize(tx, page.items)).map((farm) => ({
    id: farm.id,
    name: farm.name,
    municipality: farm.municipality,
    commercialStatus: farm.commercialStatus,
    isPrimary: farm.owners.some((owner) => owner.contactId === contactId && owner.isPrimary),
  }));
  return { ...page, items };
}
