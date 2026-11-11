import {
  CONTACT_ROLE_LABELS,
  CONTACT_ROLES,
  FIELD_REGISTRY,
  PERSON_TYPE_LABELS,
  PERSON_TYPES,
  type ContactRole,
  type PersonType,
  type contactListQuerySchema,
} from '@crm/shared';
import {
  AsyncCombobox,
  DateRangePicker,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@crm/ui';
import type { ListQueryState } from '../../listing/list-query.js';
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

export function ContactFilters({ query, update }: ListQueryState<typeof contactListQuerySchema>) {
  return (
    <>
      <AsyncCombobox
        multiple
        aria-label="Papel"
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
        <SelectTrigger aria-label="Tipo de pessoa" size="sm" className="w-40">
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
    </>
  );
}
