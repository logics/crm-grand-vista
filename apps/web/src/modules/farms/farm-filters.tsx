import {
  REFERRED_BY_CONTACT_LABEL,
  REFERRED_BY_USER_LABEL,
  DOCUMENT_STATUSES,
  DOCUMENT_STATUS_LABELS,
  FIELD_REGISTRY,
  LEVELS,
  LEVEL_LABELS,
  regionKey,
  type DocumentStatus,
  type Level,
  type farmListQuerySchema,
} from '@crm/shared';
import {
  AreaInput,
  AsyncCombobox,
  Button,
  Checkbox,
  DecimalInput,
  Field,
  MoneyInput,
  MunicipalityPicker,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@crm/ui';
import { useMemo } from 'react';
import type { ListQueryState } from '../../listing/list-query.js';
import { useCan, useDataScope } from '../../shell/tenant-access.js';
import { useTenantSlug } from '../../shell/tenant-query.js';
import { ContactField } from '../contacts/contact-field.js';
import { resolveMunicipalities, searchMunicipalities } from '../municipalities/municipality-source.js';
import { useDisplayContext } from '../settings/display-context.js';
import { VocabularyField } from '../settings/vocabulary-field.js';
import { UserField } from '../users/user-field.js';

// Filtros da lista de fazendas, ao lado da busca. Leem e escrevem a lista da
// URL (`list.query` / `list.update`), com o mesmo `farmListQuerySchema` da API:
// o link copiado reabre os mesmos filtros. Os principais ficam à vista; os
// técnicos, no painel "Mais filtros". Rótulo de campo sai do registro.

const fields = FIELD_REGISTRY.farms.fields;

const PRICE_NOTICE = 'Fazendas avaliadas em sacas não entram neste filtro.';

/** Opção fixa (nível, situação documental) para o seletor múltiplo. */
interface FixedOption<TId extends string> {
  id: TId;
  name: string;
}

const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');

function fixedOptions<TId extends string>(ids: readonly TId[], labels: Record<TId, string>) {
  const options: FixedOption<TId>[] = ids.map((id) => ({ id, name: labels[id] }));
  return {
    search: async (term: string) => ({ items: options.filter((option) => fold(option.name).includes(fold(term.trim()))) }),
    resolve: async (selected: string[]) => options.filter((option) => selected.includes(option.id)),
  };
}

const levelSource = fixedOptions<Level>(LEVELS, LEVEL_LABELS);
const documentSource = fixedOptions<DocumentStatus>(DOCUMENT_STATUSES, DOCUMENT_STATUS_LABELS);

type FarmList = ListQueryState<typeof farmListQuerySchema>;

/** Seletor múltiplo de opções fixas, gravando a lista de ids (ou nada, vazia). */
function FixedMultiSelect<TId extends string>({
  label,
  source,
  value,
  onChange,
}: {
  label: string;
  source: ReturnType<typeof fixedOptions<TId>>;
  value: readonly TId[] | undefined;
  onChange: (ids: TId[] | undefined) => void;
}) {
  return (
    <AsyncCombobox
      multiple
      aria-label={label}
      size="sm"
      getKey={(option: FixedOption<TId>) => option.id}
      getLabel={(option: FixedOption<TId>) => option.name}
      placeholder="Todos"
      searchPlaceholder="Buscar"
      search={source.search}
      resolve={source.resolve as (ids: string[]) => Promise<FixedOption<TId>[]>}
      value={value ?? []}
      onChange={(selected) => onChange(selected.length > 0 ? selected.map((option) => option.id) : undefined)}
    />
  );
}

const idList = (entries: { id: string }[]) => (entries.length > 0 ? entries.map((entry) => entry.id) : undefined);

/** Quantos filtros do painel "Mais filtros" estão ativos (para o contador do botão). */
function activeMoreFilters(query: FarmList['query']): number {
  const keys = [
    'tradingPostId',
    'aptitudeId',
    'cropId',
    'salesPotential',
    'priority',
    'waterAvailability',
    'irrigationPotential',
    'productivePotential',
    'documentStatus',
    'maxDistanceToHighwayKm',
    'maxDistanceToWarehouseKm',
    'ownerContactId',
    'responsibleUserId',
    'referrerContactId',
    'referrerUserId',
  ] as const;
  return keys.filter((key) => query[key] !== undefined).length;
}

export function FarmFilters({ query, update }: FarmList) {
  const slug = useTenantSlug();
  const { areaUnit, alqueireType } = useDisplayContext();
  const canSeeContacts = useCan('contatos.ver');
  const allFarms = useDataScope('fazendas') === 'all';
  const searchRegion = useMemo(() => searchMunicipalities(slug, { allowUf: true }), [slug]);
  const resolveRegion = useMemo(() => resolveMunicipalities(slug), [slug]);
  const unit = areaUnit === 'ha' ? 'hectare' : 'alqueire';
  const hasPrice = query.priceMin !== undefined || query.priceMax !== undefined;
  const moreCount = activeMoreFilters(query);

  // Uma segunda linha, abaixo da busca: todo filtro com rótulo em cima, alinhados pela base.
  return (
    <div className="order-last flex basis-full flex-wrap items-end gap-4">
      <Field label="Região" className="w-72">
        <MunicipalityPicker
          multiple
          allowUf
          aria-label="Região"
          size="sm"
          search={searchRegion}
          resolve={resolveRegion}
          value={query.region ?? []}
          onChange={(selected) => update({ region: selected.length > 0 ? selected.map(regionKey) : undefined })}
        />
      </Field>
      <Field label={fields.commercial_status_id.label} className="w-56">
        <VocabularyField
          multiple
          vocabulary="commercial-statuses"
          mode="filter"
          size="sm"
          aria-label={fields.commercial_status_id.label}
          placeholder="Todos menos desativadas"
          value={query.commercialStatusId ?? []}
          onChange={(entries) => update({ commercialStatusId: idList(entries) })}
        />
      </Field>
      <Field label={`${fields.total_area_ha.label} mín.`} className="w-36">
        <AreaInput
          size="sm"
          unit={unit}
          alqueireType={alqueireType}
          value={query.areaMin ?? null}
          onChange={(value) => update({ areaMin: value ?? undefined })}
        />
      </Field>
      <Field label={`${fields.total_area_ha.label} máx.`} className="w-36">
        <AreaInput
          size="sm"
          unit={unit}
          alqueireType={alqueireType}
          value={query.areaMax ?? null}
          onChange={(value) => update({ areaMax: value ?? undefined })}
        />
      </Field>
      <Field label={`${fields.asking_price.label} mín.`} className="w-44">
        <MoneyInput
          size="sm"
          disabled={query.noPrice}
          value={query.priceMin ?? null}
          onChange={(value) => update({ priceMin: value ?? undefined })}
        />
      </Field>
      <Field label={`${fields.asking_price.label} máx.`} className="w-44">
        <MoneyInput
          size="sm"
          disabled={query.noPrice}
          value={query.priceMax ?? null}
          onChange={(value) => update({ priceMax: value ?? undefined })}
        />
      </Field>
      <Field orientation="horizontal" label="Sem preço">
        <Checkbox
          disabled={hasPrice}
          checked={query.noPrice === true}
          onCheckedChange={(checked) => update({ noPrice: checked === true ? true : undefined })}
        />
      </Field>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="sm" icon="sliders-horizontal" count={moreCount > 0 ? moreCount : undefined}>
            Mais filtros
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="flex max-h-[70vh] w-[calc(var(--space-12)*8)] max-w-[calc(100vw-var(--space-8))] flex-col gap-4 overflow-y-auto"
        >
          <Field label={fields.trading_post_id.label}>
            <VocabularyField
              multiple
              vocabulary="trading-posts"
              mode="filter"
              size="sm"
              aria-label={fields.trading_post_id.label}
              value={query.tradingPostId ?? []}
              onChange={(entries) => update({ tradingPostId: idList(entries) })}
            />
          </Field>
          <Field label={FIELD_REGISTRY.farm_aptitudes.label}>
            <VocabularyField
              multiple
              vocabulary="aptitudes"
              mode="filter"
              size="sm"
              aria-label={FIELD_REGISTRY.farm_aptitudes.label}
              value={query.aptitudeId ?? []}
              onChange={(entries) => update({ aptitudeId: idList(entries) })}
            />
          </Field>
          <Field label={FIELD_REGISTRY.farm_crops.label}>
            <VocabularyField
              multiple
              vocabulary="crops"
              mode="filter"
              size="sm"
              aria-label={FIELD_REGISTRY.farm_crops.label}
              value={query.cropId ?? []}
              onChange={(entries) => update({ cropId: idList(entries) })}
            />
          </Field>
          {(
            [
              ['salesPotential', fields.sales_potential.label],
              ['priority', fields.priority.label],
              ['waterAvailability', fields.water_availability.label],
              ['irrigationPotential', fields.irrigation_potential.label],
              ['productivePotential', fields.productive_potential.label],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <FixedMultiSelect
                label={label}
                source={levelSource}
                value={query[key]}
                onChange={(ids) => update({ [key]: ids })}
              />
            </Field>
          ))}
          <Field label={fields.document_status.label}>
            <FixedMultiSelect
              label={fields.document_status.label}
              source={documentSource}
              value={query.documentStatus}
              onChange={(ids) => update({ documentStatus: ids })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={`${fields.distance_to_highway_km.label} máx.`}>
              <DecimalInput
                size="sm"
                scale={2}
                suffix="km"
                value={query.maxDistanceToHighwayKm ?? null}
                onChange={(value) => update({ maxDistanceToHighwayKm: value ?? undefined })}
              />
            </Field>
            <Field label={`${fields.distance_to_warehouse_km.label} máx.`}>
              <DecimalInput
                size="sm"
                scale={2}
                suffix="km"
                value={query.maxDistanceToWarehouseKm ?? null}
                onChange={(value) => update({ maxDistanceToWarehouseKm: value ?? undefined })}
              />
            </Field>
          </div>
          {(canSeeContacts || query.ownerContactId) && (
            <Field label={FIELD_REGISTRY.farm_owners.fields.contact_id.label}>
              <ContactField
                size="sm"
                aria-label={FIELD_REGISTRY.farm_owners.fields.contact_id.label}
                role="owner"
                value={query.ownerContactId ?? null}
                onChange={(contact) => update({ ownerContactId: contact?.id })}
              />
            </Field>
          )}
          {allFarms && (
            <Field label={fields.responsible_user_id.label}>
              <UserField
                multiple
                size="sm"
                aria-label={fields.responsible_user_id.label}
                value={query.responsibleUserId ?? []}
                onChange={(users) => update({ responsibleUserId: idList(users) })}
              />
            </Field>
          )}
          {(canSeeContacts || query.referrerContactId) && (
            <Field label={REFERRED_BY_CONTACT_LABEL}>
              <ContactField
                multiple
                size="sm"
                role="external_broker"
                aria-label={REFERRED_BY_CONTACT_LABEL}
                value={query.referrerContactId ?? []}
                onChange={(contacts) => update({ referrerContactId: idList(contacts) })}
              />
            </Field>
          )}
          <Field label={REFERRED_BY_USER_LABEL}>
            <UserField
              multiple
              size="sm"
              aria-label={REFERRED_BY_USER_LABEL}
              value={query.referrerUserId ?? []}
              onChange={(users) => update({ referrerUserId: idList(users) })}
            />
          </Field>
        </PopoverContent>
      </Popover>
      {/* o aviso só aparece quando o filtro de valor está em uso: fora disso, é ruído */}
      {hasPrice && <p className="basis-full text-xs text-text-faint">{PRICE_NOTICE}</p>}
    </div>
  );
}
