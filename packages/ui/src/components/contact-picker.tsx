import {
  CONTACT_ROLE_LABELS,
  type ContactOption,
  type ContactRole,
  PERSON_TYPE_LABELS,
  abbreviateTaxId,
} from '@crm/shared';
import { orEmDash } from '../lib/em-dash.js';
import { AsyncCombobox, type AsyncComboboxPage, type AsyncComboboxPickerProps, AsyncComboboxOption } from './async-combobox.js';
import { Badge } from './badge.js';

// Seletor de contato sobre o `AsyncCombobox`: nome, `Badge` PF/PJ, documento
// abreviado e papéis. O filtro por papel não é feito aqui: vai para a busca,
// que pagina já filtrada.

export type ContactPickerSearchOptions = { signal: AbortSignal; cursor?: string; role?: ContactRole };

/** A busca do `AsyncCombobox`, mais o papel pedido em `role`. */
export type ContactPickerSearch = (
  term: string,
  options: ContactPickerSearchOptions,
) => Promise<AsyncComboboxPage<ContactOption>>;

export type ContactPickerProps = AsyncComboboxPickerProps<ContactOption, 'search'> & {
  search: ContactPickerSearch;
  /** Só contatos com este papel: o comprador da oportunidade, o corretor externo da indicação. */
  role?: ContactRole;
};

const contactKey = (contact: ContactOption) => contact.id;
const contactName = (contact: ContactOption) => contact.name;

function ContactItem({ contact }: { contact: ContactOption }) {
  const roles = contact.roles.map((role) => CONTACT_ROLE_LABELS[role]).join(', ');
  const taxId = orEmDash(abbreviateTaxId(contact.taxId));
  return (
    <AsyncComboboxOption
      title={contact.name}
      badge={<Badge size="sm">{PERSON_TYPE_LABELS[contact.personType]}</Badge>}
      detail={
        <>
          <span className="gv-num">{taxId}</span>
          {roles && ` · ${roles}`}
        </>
      }
    />
  );
}

export function ContactPicker({ search, role, ...props }: ContactPickerProps) {
  return (
    <AsyncCombobox
      getKey={contactKey}
      getLabel={contactName}
      renderItem={(contact) => <ContactItem contact={contact} />}
      placeholder={`Escolha o ${role ? CONTACT_ROLE_LABELS[role].toLocaleLowerCase('pt-BR') : 'contato'}`}
      searchPlaceholder="Buscar contato"
      createLabel="Cadastrar contato"
      {...props}
      search={(term, options) => search(term, role ? { ...options, role } : options)}
    />
  );
}
