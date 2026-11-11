import type { Contact, ContactOption } from '@crm/shared';
import { ContactPicker, type ContactPickerProps, Input } from '@crm/ui';
import { useMemo, useState } from 'react';
import { useCan } from '../../shell/tenant-access.js';
import { useTenantQuery, useTenantSlug } from '../../shell/tenant-query.js';
import { resolveContactOptions, searchContactOptions } from './contacts-api.js';
import { QuickContactDialog } from './quick-contact-dialog.js';

// Seletor de contato já ligado à API da empresa ativa, como o `VocabularyField`
// é para os cadastros auxiliares: nenhum módulo escreve a sua busca de contato.
// Com `contatos.criar`, o "Cadastrar" abre o cadastro rápido e o contato novo
// volta selecionado; sem `contatos.ver`, o campo é só leitura, com o nome.
// Gravar o papel no registro consumidor é da spec de cada consumidor.

/** `Omit` que preserva a união entre seleção única e múltipla. */
type WithoutSource<P> = P extends unknown ? Omit<P, 'search' | 'resolve' | 'onCreate'> : never;

export type ContactFieldProps = WithoutSource<ContactPickerProps>;

const toOption = (contact: Contact): ContactOption => ({
  id: contact.id,
  name: contact.name,
  personType: contact.personType,
  taxId: contact.taxId,
  roles: contact.roles,
});

export function ContactField(props: ContactFieldProps) {
  const canView = useCan('contatos.ver');
  return canView ? <EditableContactField {...props} /> : <ReadOnlyContactField {...props} />;
}

function EditableContactField(props: ContactFieldProps) {
  const slug = useTenantSlug();
  const canCreate = useCan('contatos.criar');
  const search = useMemo(() => searchContactOptions(slug), [slug]);
  const resolve = useMemo(() => resolveContactOptions(slug), [slug]);
  const [creating, setCreating] = useState<string | null>(null);
  const { role } = props;

  return (
    <>
      <ContactPicker {...props} search={search} resolve={resolve} onCreate={canCreate ? setCreating : undefined} />
      {canCreate && (
        <QuickContactDialog
          open={creating !== null}
          onOpenChange={(open) => !open && setCreating(null)}
          initialName={creating ?? ''}
          role={role}
          onCreated={(contact) => {
            setCreating(null);
            // o seletor é de seleção única ou múltipla; o contato novo entra no valor
            if (props.multiple) props.onChange([...props.value.filter((v): v is ContactOption => typeof v !== 'string'), toOption(contact)]);
            else props.onChange(toOption(contact));
          }}
        />
      )}
    </>
  );
}

/** Sem `contatos.ver`: o nome do contato gravado (a API devolve só id e nome), sem busca. */
function ReadOnlyContactField(props: ContactFieldProps) {
  const entries: ReadonlyArray<ContactOption | string> = props.multiple ? props.value : props.value === null ? [] : [props.value];
  const ids = entries.filter((entry): entry is string => typeof entry === 'string');
  const hydrated = useTenantQuery(['contacts', 'names', ...ids], (slug) => resolveContactOptions(slug)(ids), {});
  const names = entries.map((entry) =>
    typeof entry === 'string' ? (hydrated.data?.find((option) => option.id === entry)?.name ?? (hydrated.isPending ? 'Carregando…' : '—')) : entry.name,
  );
  return (
    <Input
      readOnly
      id={props.id}
      aria-label={props['aria-label']}
      aria-labelledby={props['aria-labelledby']}
      aria-describedby={props['aria-describedby']}
      className={props.className}
      value={names.join(', ')}
    />
  );
}
