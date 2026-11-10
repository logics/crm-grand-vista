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
  formatPhone,
  type PersonType,
} from '@crm/shared';
import { Checkbox, EntityForm, type EntityFormField, Input, PhoneInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, TaxIdInput } from '@crm/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { LoadFailedState, LoadingState } from '../../shell/page-state.js';
import { PageHeader } from '../../shell/page-header.js';
import { tenantPath } from '../../shell/tenant-path.js';
import { TextLink } from '../../shell/text-link.js';
import { tenantQueryKey, useTenantQuery, useTenantSlug } from '../../shell/tenant-query.js';
import { TaxIdTakenError, createContact, fetchContact, updateContact } from './contacts-api.js';

/** O contato mais a opção só do formulário: sem coluna, ela não existe na API. */
const contactFormSchema = createContactSchema.extend({ sameNumber: z.boolean() });
type FormValues = z.input<typeof contactFormSchema>;
/** Sem o campo na tela, o que sobrou digitado nele não pode barrar o salvamento. */
const contactFormSchemaWithoutWhatsapp = contactFormSchema.omit({ whatsapp: true }) as unknown as typeof contactFormSchema;

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
  // Vem marcada em contato novo e, na edição, quando os dois números são iguais.
  const initialSameNumber = contact ? (contact.phone ?? null) === (contact.whatsapp ?? null) : true;
  const [sameNumber, setSameNumber] = useState(initialSameNumber);
  // Dono do documento que a API recusou por duplicado: o campo oferece abrir o cadastro dele.
  const [duplicate, setDuplicate] = useState<TaxIdTakenError['existing'] | null>(null);
  const back = tenantPath(slug, contact ? `contacts/${contact.id}` : 'contacts');

  const save = async ({ sameNumber: copy, ...parsed }: z.output<typeof contactFormSchema>) => {
    const values = copy ? { ...parsed, whatsapp: parsed.phone ?? null } : parsed;
    setDuplicate(null);
    let saved;
    try {
      saved = contact ? await updateContact(slug, contact.id, values) : await createContact(slug, values);
    } catch (error) {
      if (error instanceof TaxIdTakenError) setDuplicate(error.existing);
      throw error;
    }
    await queryClient.invalidateQueries({ queryKey: tenantQueryKey(slug, 'contacts') });
    navigate(tenantPath(slug, `contacts/${saved.id}`));
  };

  // Razão social só existe em pessoa jurídica.
  const legalNameFields: EntityFormField<FormValues>[] =
    hasLegalName(personType)
      ? [{ name: 'legalName', label: FIELD_REGISTRY.contacts.fields.legal_name.label, render: (field) => <Input {...field} value={field.value ?? ''} /> }]
      : [];

  // Com a opção marcada o WhatsApp é o telefone, e o campo não aparece.
  const whatsappFields: EntityFormField<FormValues>[] = sameNumber
    ? []
    : [
        {
          name: 'whatsapp',
          label: FIELD_REGISTRY.contacts.fields.whatsapp.label,
          render: (field) => <PhoneInput {...field} value={field.value ?? ''} />,
        },
      ];

  return (
    <div className="flex flex-col gap-gap-shell">
      <PageHeader title={contact ? 'Editar contato' : 'Novo contato'} />
      <EntityForm
        schema={sameNumber ? contactFormSchemaWithoutWhatsapp : contactFormSchema}
        defaultValues={{
          personType: contact?.personType ?? 'pf',
          name: contact?.name ?? '',
          legalName: contact?.legalName ?? '',
          taxId: contact?.taxId ?? '',
          roles: contact?.roles ?? [],
          email: contact?.email ?? '',
          phone: contact?.phone ? formatPhone(contact.phone) : '',
          whatsapp: contact?.whatsapp ? formatPhone(contact.whatsapp) : '',
          sameNumber: initialSameNumber,
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
                name: 'taxId',
                label: FIELD_REGISTRY.contacts.fields.tax_id.label,
                render: (field) => (
                  <div className="flex flex-col gap-2">
                    <TaxIdInput
                      {...field}
                      personType={personType}
                      value={field.value ?? null}
                      onChange={(value) => {
                        setDuplicate(null);
                        field.onChange(value ?? '');
                      }}
                    />
                    {duplicate && (
                      <TextLink to={tenantPath(slug, `contacts/${duplicate.id}`)} target="_blank">
                        Abrir o cadastro de {duplicate.name}
                      </TextLink>
                    )}
                  </div>
                ),
              },
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
              {
                name: 'phone',
                label: FIELD_REGISTRY.contacts.fields.phone.label,
                render: (field) => <PhoneInput {...field} value={field.value ?? ''} />,
              },
              {
                name: 'sameNumber',
                label: 'WhatsApp é o mesmo número',
                render: (field) => (
                  <Checkbox
                    ref={field.ref}
                    onBlur={field.onBlur}
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      setSameNumber(checked === true);
                      field.onChange(checked === true);
                    }}
                  />
                ),
              },
              ...whatsappFields,
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
