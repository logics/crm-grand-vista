import {
  CONTACT_ROLES_LABEL,
  CONTACT_ROLE_LABELS,
  CONTACT_ROLES,
  FIELD_REGISTRY,
  LEVELS,
  LEVEL_LABELS,
  PERSON_TYPE_LABELS,
  PERSON_TYPES,
  QUALIFICATION_LEVELS,
  QUALIFICATION_LEVEL_LABELS,
  regionKey,
  type ContactRole,
  type PersonType,
  type contactListQuerySchema,
} from '@crm/shared';
import {
  AsyncCombobox,
  DateRangePicker,
  Field,
  MunicipalityPicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@crm/ui';
import { useMemo } from 'react';
import type { ListQueryState } from '../../listing/list-query.js';
import { useTenantSlug } from '../../shell/tenant-query.js';
import { resolveMunicipalities, searchMunicipalities } from '../municipalities/municipality-source.js';
import { VocabularyField } from '../settings/vocabulary-field.js';

// Filtros da lista de contatos, ao lado da busca. Leem e escrevem a lista da
// URL (`list.query` / `list.update`), então o link copiado reabre os mesmos
// filtros.

interface RoleOption {
  id: ContactRole;
  name: string;
}

const roleOptions: RoleOption[] = CONTACT_ROLES.map((id) => ({ id, name: CONTACT_ROLE_LABELS[id] }));

const searchRoles = async (term: string) => {
  const needle = term.trim().toLocaleLowerCase('pt-BR');
  return { items: roleOptions.filter((option) => option.name.toLocaleLowerCase('pt-BR').includes(needle)) };
};

const resolveRoles = async (ids: string[]) => roleOptions.filter((option) => ids.includes(option.id));

/** Radix não aceita item de valor vazio: "todos" é uma chave própria, que sai da URL. */
const ANY = 'any';

const fields = FIELD_REGISTRY.contacts.fields;
const profileFields = FIELD_REGISTRY.buyer_profiles.fields;

const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');

/** Seletor múltiplo de opções fixas (grau de qualificação, urgência), gravando a lista de ids ou nada. */
function FixedMultiSelect<TId extends string>({
  label,
  ids,
  labels,
  value,
  onChange,
}: {
  label: string;
  ids: readonly TId[];
  labels: Record<TId, string>;
  value: readonly TId[] | undefined;
  onChange: (ids: TId[] | undefined) => void;
}) {
  const options = ids.map((id) => ({ id, name: labels[id] }));
  return (
    <AsyncCombobox
      multiple
      aria-label={label}
      size="sm"
      getKey={(option: { id: TId; name: string }) => option.id}
      getLabel={(option: { id: TId; name: string }) => option.name}
      placeholder="Todos"
      searchPlaceholder="Buscar"
      search={async (term: string) => ({ items: options.filter((option) => fold(option.name).includes(fold(term.trim()))) })}
      resolve={async (selected: string[]) => options.filter((option) => selected.includes(option.id))}
      value={value ?? []}
      onChange={(selected) => onChange(selected.length > 0 ? selected.map((option) => option.id) : undefined)}
    />
  );
}

const idList = (entries: { id: string }[]) => (entries.length > 0 ? entries.map((entry) => entry.id) : undefined);

export function ContactFilters({ query, update }: ListQueryState<typeof contactListQuerySchema>) {
  const slug = useTenantSlug();
  const searchRegion = useMemo(() => searchMunicipalities(slug, { allowUf: true }), [slug]);
  const resolveRegion = useMemo(() => resolveMunicipalities(slug), [slug]);
  return (
    <>
      <AsyncCombobox
        multiple
        aria-label={CONTACT_ROLES_LABEL}
        size="sm"
        className="w-56"
        getKey={(option: RoleOption) => option.id}
        getLabel={(option: RoleOption) => option.name}
        placeholder="Todos os papéis"
        searchPlaceholder="Buscar papel"
        search={searchRoles}
        resolve={resolveRoles}
        value={query.role ?? []}
        onChange={(selected) => update({ role: selected.length > 0 ? selected.map((option) => option.id) : undefined })}
      />
      <Select
        value={query.personType ?? ANY}
        onValueChange={(value) => update({ personType: value === ANY ? undefined : (value as PersonType) })}
      >
        <SelectTrigger aria-label={fields.person_type.label} size="sm" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Pessoa física e jurídica</SelectItem>
          {PERSON_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {PERSON_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <VocabularyField
        vocabulary="contact-classifications"
        mode="filter"
        size="sm"
        className="w-48"
        aria-label={fields.classification_id.label}
        value={query.classificationId ?? null}
        onChange={(entry) => update({ classificationId: entry?.id })}
      />
      <VocabularyField
        vocabulary="lead-sources"
        mode="filter"
        size="sm"
        className="w-48"
        aria-label={fields.lead_source_id.label}
        value={query.leadSourceId ?? null}
        onChange={(entry) => update({ leadSourceId: entry?.id })}
      />
      <DateRangePicker
        aria-label="Cadastrado em"
        size="sm"
        placeholder={['Cadastro de', 'até']}
        value={{ ...(query.createdFrom ? { from: query.createdFrom } : {}), ...(query.createdTo ? { to: query.createdTo } : {}) }}
        onChange={(range) => update({ createdFrom: range.from, createdTo: range.to })}
      />
      {/* Perfil de compra: segunda linha, com rótulo em cima, como os filtros de fazendas. */}
      <div className="order-last flex basis-full flex-wrap items-end gap-4">
        <Field label={FIELD_REGISTRY.buyer_profiles.label} className="w-48">
          <VocabularyField
            multiple
            vocabulary="purchase-profiles"
            mode="filter"
            size="sm"
            aria-label={FIELD_REGISTRY.buyer_profiles.label}
            value={query.purchaseProfileId ?? []}
            onChange={(entries) => update({ purchaseProfileId: idList(entries) })}
          />
        </Field>
        <Field label={profileFields.qualification_level.label} className="w-48">
          <FixedMultiSelect
            label={profileFields.qualification_level.label}
            ids={QUALIFICATION_LEVELS}
            labels={QUALIFICATION_LEVEL_LABELS}
            value={query.qualificationLevel}
            onChange={(ids) => update({ qualificationLevel: ids })}
          />
        </Field>
        <Field label={profileFields.urgency.label} className="w-48">
          <FixedMultiSelect
            label={profileFields.urgency.label}
            ids={LEVELS}
            labels={LEVEL_LABELS}
            value={query.urgency}
            onChange={(ids) => update({ urgency: ids })}
          />
        </Field>
        <Field label={FIELD_REGISTRY.buyer_crops.label} className="w-56">
          <VocabularyField
            multiple
            vocabulary="crops"
            mode="filter"
            size="sm"
            aria-label={FIELD_REGISTRY.buyer_crops.label}
            value={query.cropId ?? []}
            onChange={(entries) => update({ cropId: idList(entries) })}
          />
        </Field>
        <Field label={FIELD_REGISTRY.buyer_regions.label} className="w-72">
          <MunicipalityPicker
            multiple
            allowUf
            aria-label={FIELD_REGISTRY.buyer_regions.label}
            size="sm"
            search={searchRegion}
            resolve={resolveRegion}
            value={query.region ?? []}
            onChange={(selected) => update({ region: selected.length > 0 ? selected.map(regionKey) : undefined })}
          />
        </Field>
      </div>
    </>
  );
}
