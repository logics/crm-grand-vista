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
// abreviado e papéis. O papel pedido vai para a busca, que o usa para ordenar
// (quem o tem primeiro) sem filtrar: a opção que não o tem leva a marca "vira
// <papel> ao salvar", pois quem consome o seletor acrescenta o papel ao gravar.

export type ContactPickerSearchOptions = { signal: AbortSignal; cursor?: string; role?: ContactRole };

/** A busca do `AsyncCombobox`, mais o papel pedido em `role`. */
export type ContactPickerSearch = (
  term: string,
  options: ContactPickerSearchOptions,
) => Promise<AsyncComboboxPage<ContactOption>>;

export type ContactPickerProps = AsyncComboboxPickerProps<ContactOption, 'search'> & {
  search: ContactPickerSearch;
  /** Papel que a ficha pede (o proprietário da fazenda): ordena a busca e marca a opção que não o tem. */
  role?: ContactRole;
};

const contactKey = (contact: ContactOption) => contact.id;
const contactName = (contact: ContactOption) => contact.name;

function ContactItem({ contact, role }: { contact: ContactOption; role?: ContactRole }) {
  const roles = contact.roles.map((role) => CONTACT_ROLE_LABELS[role]).join(', ');
  const becomes = role && !contact.roles.includes(role) ? CONTACT_ROLE_LABELS[role].toLocaleLowerCase('pt-BR') : null;
  const taxId = orEmDash(abbreviateTaxId(contact.taxId));
  return (
    <AsyncComboboxOption
      title={contact.name}
      badge={
        <>
          {contact.personType && <Badge size="sm">{PERSON_TYPE_LABELS[contact.personType]}</Badge>}
          {becomes && <Badge size="sm" tone="info">vira {becomes} ao salvar</Badge>}
        </>
      }
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
      renderItem={(contact) => <ContactItem contact={contact} role={role} />}
      placeholder={`Escolha o ${role ? CONTACT_ROLE_LABELS[role].toLocaleLowerCase('pt-BR') : 'contato'}`}
      searchPlaceholder="Buscar contato"
      createLabel="Cadastrar contato"
      {...props}
      search={(term, options) => search(term, role ? { ...options, role } : options)}
    />
  );
}
