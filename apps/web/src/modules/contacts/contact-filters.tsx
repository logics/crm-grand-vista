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
  Button,
  DateRangePicker,
  Field,
  MunicipalityPicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  useBelowBreakpoint,
} from '@crm/ui';
import { useId, useMemo, useRef, useState } from 'react';
import type { ListQueryState } from '../../listing/list-query.js';
import { useTenantSlug } from '../../shell/tenant-query.js';
import { resolveMunicipalities, searchMunicipalities } from '../municipalities/municipality-source.js';
import { VocabularyField } from '../settings/vocabulary-field.js';

// Filtros da lista de contatos, abaixo da busca, em dois grupos rotulados: os do
// contato e os do perfil de compra. Leem e escrevem a lista da URL
// (`list.query` / `list.update`), então o link copiado reabre os mesmos filtros.

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
  ids,
  labels,
  value,
  onChange,
}: {
  ids: readonly TId[];
  labels: Record<TId, string>;
  value: readonly TId[] | undefined;
  onChange: (ids: TId[] | undefined) => void;
}) {
  const options = ids.map((id) => ({ id, name: labels[id] }));
  return (
    <AsyncCombobox
      multiple
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

// Larguras dos campos pelos tokens (`--space-10` = 40px). `w-N` fora da escala do tema não gera CSS: o campo
// ficaria do tamanho do conteúdo e o painel mudaria de altura a cada valor escolhido. No mobile, uma coluna.
const width = {
  wide: 'w-[calc(6*var(--space-10))] max-mobile:w-full', // 240: papéis, cultura, período
  person: 'w-[calc(5.5*var(--space-10))] max-mobile:w-full', // 220: "Pessoa física e jurídica" cabe
  regular: 'w-[calc(5*var(--space-10))] max-mobile:w-full', // 200
  region: 'w-[calc(7*var(--space-10))] max-mobile:w-full', // 280: "Goiás (UF)" e "Rio Verde — GO" na mesma altura
};

const idList = (entries: { id: string }[]) => (entries.length > 0 ? entries.map((entry) => entry.id) : undefined);

const present = (value: unknown) =>
  Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '';

type ContactQuery = ListQueryState<typeof contactListQuerySchema>['query'];

/** Quantos filtros restringem a lista. O período vale um, a busca (`q`) não conta. */
function profileFilterCount(query: ContactQuery) {
  return [query.purchaseProfileId, query.qualificationLevel, query.urgency, query.cropId, query.region].filter(present).length;
}

function activeFilterCount(query: ContactQuery) {
  const period = present(query.createdFrom) || present(query.createdTo);
  const contact = [query.role, query.personType, query.classificationId, query.leadSourceId].filter(present).length;
  return contact + (period ? 1 : 0) + profileFilterCount(query);
}

const group = 'order-last flex basis-full flex-wrap items-end gap-4';

export function ContactFilters({ query, update, filtered, clearFilters }: ListQueryState<typeof contactListQuerySchema>) {
  const slug = useTenantSlug();
  const searchRegion = useMemo(() => searchMunicipalities(slug, { allowUf: true }), [slug]);
  const resolveRegion = useMemo(() => resolveMunicipalities(slug), [slug]);
  const mobile = useBelowBreakpoint('mobile');
  const profileId = useId();
  const profileCount = profileFilterCount(query);
  const total = activeFilterCount(query);
  // no mobile o grupo do perfil começa fechado, salvo se a URL já traz filtro dele; é estado de tela, não vai à URL
  const [profileOpen, setProfileOpen] = useState(profileCount > 0);
  // a URL que passa a trazer filtro do perfil (voltar no histórico, link novo) abre o grupo; sem filtro, não fecha o que o usuário abriu
  const [hadProfileFilter, setHadProfileFilter] = useState(profileCount > 0);
  if (profileCount > 0 !== hadProfileFilter) {
    setHadProfileFilter(profileCount > 0);
    if (profileCount > 0) setProfileOpen(true);
  }
  const contactGroupRef = useRef<HTMLDivElement>(null);
  // o botão de limpar some ao limpar: o foco vai ao campo de busca da lista (ou, sem ele, ao primeiro filtro)
  const clearAndRefocus = () => {
    clearFilters();
    const group = contactGroupRef.current;
    const target =
      group?.closest('form')?.querySelector<HTMLElement>('input[type="search"]') ??
      group?.querySelector<HTMLElement>('button, input');
    target?.focus();
  };
  const showProfile = !mobile || profileOpen;
  return (
    <>
      <div ref={contactGroupRef} role="group" aria-label="Filtros do contato" className={group}>
        <Field label={CONTACT_ROLES_LABEL} className={width.wide}>
          <AsyncCombobox
            multiple
            size="sm"
            getKey={(option: RoleOption) => option.id}
            getLabel={(option: RoleOption) => option.name}
            placeholder="Todos os papéis"
            searchPlaceholder="Buscar papel"
            search={searchRoles}
            resolve={resolveRoles}
            value={query.role ?? []}
            onChange={(selected) => update({ role: selected.length > 0 ? selected.map((option) => option.id) : undefined })}
          />
        </Field>
        <Field label={fields.person_type.label} className={width.person}>
          <Select
            value={query.personType ?? ANY}
            onValueChange={(value) => update({ personType: value === ANY ? undefined : (value as PersonType) })}
          >
            <SelectTrigger size="sm">
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
        </Field>
        <Field label={fields.classification_id.label} className={width.regular}>
          <VocabularyField
            vocabulary="contact-classifications"
            mode="filter"
            size="sm"
            value={query.classificationId ?? null}
            onChange={(entry) => update({ classificationId: entry?.id })}
          />
        </Field>
        <Field label={fields.lead_source_id.label} className={width.regular}>
          <VocabularyField
            vocabulary="lead-sources"
            mode="filter"
            size="sm"
            value={query.leadSourceId ?? null}
            onChange={(entry) => update({ leadSourceId: entry?.id })}
          />
        </Field>
        <Field label="Cadastrado em" className={width.wide}>
          <DateRangePicker
            size="sm"
            placeholder={['Cadastro de', 'até']}
            value={{
              ...(query.createdFrom ? { from: query.createdFrom } : {}),
              ...(query.createdTo ? { to: query.createdTo } : {}),
            }}
            onChange={(range) => update({ createdFrom: range.from, createdTo: range.to })}
          />
        </Field>
        {filtered && (
          // `type="button"`: dentro do formulário de busca, sem isso o botão enviaria a busca
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon="x"
            count={total > 0 ? total : undefined}
            onClick={clearAndRefocus}
          >
            Limpar busca e filtros
          </Button>
        )}
      </div>
      <div role="group" aria-labelledby={profileId} className={cn(group, 'border-t border-border-subtle pt-5')}>
        {mobile ? (
          <Button
            id={profileId}
            type="button"
            variant="ghost"
            size="sm"
            iconRight={profileOpen ? 'chevron-up' : 'chevron-down'}
            count={profileCount > 0 ? profileCount : undefined}
            aria-expanded={profileOpen}
            aria-controls={`${profileId}-fields`}
            onClick={() => setProfileOpen((open) => !open)}
            className="basis-full justify-between"
          >
            {FIELD_REGISTRY.buyer_profiles.label}
          </Button>
        ) : (
          <span id={profileId} className="gv-eyebrow basis-full">
            {FIELD_REGISTRY.buyer_profiles.label}
          </span>
        )}
        <div
          id={`${profileId}-fields`}
          hidden={!showProfile}
          className={cn(showProfile && 'flex basis-full flex-wrap items-end gap-4 max-mobile:flex-col max-mobile:items-stretch')}
        >
          <Field label={FIELD_REGISTRY.buyer_profiles.label} className={width.regular}>
            <VocabularyField
              multiple
              vocabulary="purchase-profiles"
              mode="filter"
              size="sm"
              value={query.purchaseProfileId ?? []}
              onChange={(entries) => update({ purchaseProfileId: idList(entries) })}
            />
          </Field>
          <Field label={profileFields.qualification_level.label} className={width.regular}>
            <FixedMultiSelect
              ids={QUALIFICATION_LEVELS}
              labels={QUALIFICATION_LEVEL_LABELS}
              value={query.qualificationLevel}
              onChange={(ids) => update({ qualificationLevel: ids })}
            />
          </Field>
          <Field label={profileFields.urgency.label} className={width.regular}>
            <FixedMultiSelect
              ids={LEVELS}
              labels={LEVEL_LABELS}
              value={query.urgency}
              onChange={(ids) => update({ urgency: ids })}
            />
          </Field>
          <Field label={FIELD_REGISTRY.buyer_crops.label} className={width.wide}>
            <VocabularyField
              multiple
              vocabulary="crops"
              mode="filter"
              size="sm"
              value={query.cropId ?? []}
              onChange={(entries) => update({ cropId: idList(entries) })}
            />
          </Field>
          <Field label={FIELD_REGISTRY.buyer_regions.label} className={width.region}>
            <MunicipalityPicker
              multiple
              allowUf
              size="sm"
              search={searchRegion}
              resolve={resolveRegion}
              value={query.region ?? []}
              onChange={(selected) => update({ region: selected.length > 0 ? selected.map(regionKey) : undefined })}
            />
          </Field>
        </div>
      </div>
    </>
  );
}
