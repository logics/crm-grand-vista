import {
  CONTACT_ROLES,
  CONTACT_ROLES_LABEL,
  FIELD_REGISTRY,
  contactNameLabel,
  hasLegalName,
  CONTACT_ROLE_LABELS,
  PERSON_TYPES,
  PERSON_TYPE_LABELS,
  createContactSchema,
  type PersonType,
} from '@crm/shared';
import { Checkbox, EntityForm, type EntityFormField, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@crm/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { z } from 'zod';
import { LoadFailedState, LoadingState } from '../../shell/page-state.js';
import { PageHeader } from '../../shell/page-header.js';
import { tenantPath } from '../../shell/tenant-path.js';
import { tenantQueryKey, useTenantQuery, useTenantSlug } from '../../shell/tenant-query.js';
import { createContact, fetchContact, updateContact } from './contacts-api.js';

type FormValues = z.input<typeof createContactSchema>;

/** Formulário de criação (`/contacts/new`) e edição (`/contacts/:id/edit`). */
export function ContactFormPage() {
  const id = useParams().id;
  const contact = useTenantQuery(['contacts', id ?? 'new'], async (slug) => (id ? fetchContact(slug, id) : null));

  if (contact.isPending) return <LoadingState />;
  if (contact.data === undefined) {
    return <LoadFailedState inline title="Não foi possível carregar o contato" onRetry={() => void contact.refetch()} />;
  }
  return <ContactForm contact={contact.data} />;
}

function ContactForm({ contact }: { contact: Awaited<ReturnType<typeof fetchContact>> | null }) {
  const slug = useTenantSlug();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [personType, setPersonType] = useState<PersonType>(contact?.personType ?? 'pf');
  const back = tenantPath(slug, contact ? `contacts/${contact.id}` : 'contacts');

  const save = async (values: ReturnType<typeof createContactSchema.parse>) => {
    const saved = contact ? await updateContact(slug, contact.id, values) : await createContact(slug, values);
    await queryClient.invalidateQueries({ queryKey: tenantQueryKey(slug, 'contacts') });
    navigate(tenantPath(slug, `contacts/${saved.id}`));
  };

  // Razão social só existe em pessoa jurídica.
  const legalNameFields: EntityFormField<FormValues>[] =
    hasLegalName(personType)
      ? [{ name: 'legalName', label: FIELD_REGISTRY.contacts.fields.legal_name.label, render: (field) => <Input {...field} value={field.value ?? ''} /> }]
      : [];

  return (
    <div className="flex flex-col gap-gap-shell">
      <PageHeader title={contact ? 'Editar contato' : 'Novo contato'} />
      <EntityForm
        schema={createContactSchema}
        defaultValues={{
          personType: contact?.personType ?? 'pf',
          name: contact?.name ?? '',
          legalName: contact?.legalName ?? '',
          roles: contact?.roles ?? [],
          email: contact?.email ?? '',
          relationshipOrigin: contact?.relationshipOrigin ?? '',
          strategicNotes: contact?.strategicNotes ?? '',
        }}
        onCancel={() => navigate(back)}
        onSubmit={save}
        submitLabel={contact ? 'Salvar alterações' : 'Cadastrar contato'}
        sections={[
          {
            title: 'Dados',
            fields: [
              {
                name: 'personType',
                label: FIELD_REGISTRY.contacts.fields.person_type.label,
                render: (field) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      setPersonType(value as PersonType);
                      field.onChange(value);
                    }}
                  >
                    <SelectTrigger aria-label="Tipo de pessoa">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERSON_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {PERSON_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ),
              },
              {
                name: 'name',
                label: contactNameLabel(personType),
                render: (field) => <Input {...field} value={field.value ?? ''} />,
              },
              ...legalNameFields,
              {
                name: 'roles',
                label: CONTACT_ROLES_LABEL,
                colSpan: 2,
                render: (field) => (
                  <div role="group" aria-label={CONTACT_ROLES_LABEL} className="flex flex-wrap gap-6">
                    {CONTACT_ROLES.map((role) => (
                      <label key={role} className="flex items-center gap-2 text-sm text-text-body">
                        <Checkbox
                          checked={field.value.includes(role)}
                          onCheckedChange={(checked) =>
                            field.onChange(checked ? [...field.value, role] : field.value.filter((item) => item !== role))
                          }
                        />
                        {CONTACT_ROLE_LABELS[role]}
                      </label>
                    ))}
                  </div>
                ),
              },
              { name: 'email', label: FIELD_REGISTRY.contacts.fields.email.label, render: (field) => <Input type="email" {...field} value={field.value ?? ''} /> },
              {
                name: 'relationshipOrigin',
                label: FIELD_REGISTRY.contacts.fields.relationship_origin.label,
                render: (field) => <Input {...field} value={field.value ?? ''} />,
              },
              {
                name: 'strategicNotes',
                label: FIELD_REGISTRY.contacts.fields.strategic_notes.label,
                colSpan: 2,
                render: (field) => <Input {...field} value={field.value ?? ''} />,
              },
            ],
          },
        ]}
      />
    </div>
  );
}
