import {
  CONTACT_ROLES,
  CONTACT_ROLES_LABEL,
  FIELD_REGISTRY,
  contactNameLabel,
  hasClassification,
  hasLegalName,
  CONTACT_ROLE_LABELS,
  PERSON_TYPES,
  PERSON_TYPE_LABELS,
  createContactSchema,
  type ContactRole,
  formatPhone,
  type PersonType,
} from '@crm/shared';
import { Checkbox, ConfirmDialog, EntityForm, type EntityFormField, Input, PhoneInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, TaxIdInput } from '@crm/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { VocabularyField } from '../settings/vocabulary-field.js';
import { LoadFailedState, LoadingState } from '../../shell/page-state.js';
import { PageHeader } from '../../shell/page-header.js';
import { tenantPath } from '../../shell/tenant-path.js';
import { TextLink } from '../../shell/text-link.js';
import { tenantQueryKey, useTenantQuery, useTenantSlug } from '../../shell/tenant-query.js';
import { TaxIdTakenError, createContact, fetchContact, updateContact } from './contacts-api.js';

/** O contato mais a opção só do formulário: sem coluna, ela não existe na API. */
const contactFormSchema = createContactSchema.safeExtend({ sameNumber: z.boolean() });
type FormValues = z.input<typeof contactFormSchema>;
/** Sem o campo na tela, o que sobrou digitado nele não pode barrar o salvamento. */
const contactFormSchemaWithoutWhatsapp = contactFormSchema.safeExtend({ whatsapp: z.any() }) as unknown as typeof contactFormSchema;

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
  const [roles, setRoles] = useState<ContactRole[]>(contact?.roles ?? []);
  // Retirada do papel comprador à espera de confirmação (há classificação a apagar).
  const [pendingRemoval, setPendingRemoval] = useState<(() => void) | null>(null);
  // O campo de classificação só existe com o papel comprador: guarda o valor e o
  // `onChange` dele enquanto está na tela, para a retirada do papel poder apagá-lo.
  const classification = useRef<{ value: string | null | undefined; clear: () => void }>({
    value: contact?.classificationId,
    clear: () => undefined,
  });
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

  // Classificação é dado do comprador.
  const classificationFields: EntityFormField<FormValues>[] = hasClassification(roles)
    ? [
        {
          name: 'classificationId',
          label: FIELD_REGISTRY.contacts.fields.classification_id.label,
          render: (field) => {
            classification.current = { value: field.value, clear: () => field.onChange(null) };
            return (
              <VocabularyField
                vocabulary="contact-classifications"
                aria-label={FIELD_REGISTRY.contacts.fields.classification_id.label}
                value={field.value ?? null}
                onChange={(entry) => field.onChange(entry?.id ?? null)}
                onBlur={field.onBlur}
              />
            );
          },
        },
      ]
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
          classificationId: contact?.classificationId ?? null,
          leadSourceId: contact?.leadSourceId ?? null,
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
                          aria-label={CONTACT_ROLE_LABELS[role]}
                          checked={field.value.includes(role)}
                          onCheckedChange={(checked) => {
                            const next = checked ? [...field.value, role] : field.value.filter((item) => item !== role);
                            const apply = () => {
                              field.onChange(next);
                              setRoles(next);
                              if (!hasClassification(next)) classification.current.clear();
                            };
                            // Retirar o comprador apaga a classificação: pergunta antes, se houver o que apagar.
                            if (role === 'buyer' && !checked && classification.current.value) setPendingRemoval(() => apply);
                            else apply();
                          }}
                        />
                        {CONTACT_ROLE_LABELS[role]}
                      </label>
                    ))}
                  </div>
                ),
              },
              ...classificationFields,
              {
                name: 'leadSourceId',
                label: FIELD_REGISTRY.contacts.fields.lead_source_id.label,
                render: (field) => (
                  <VocabularyField
                    vocabulary="lead-sources"
                    aria-label={FIELD_REGISTRY.contacts.fields.lead_source_id.label}
                    value={field.value ?? null}
                    onChange={(entry) => field.onChange(entry?.id ?? null)}
                    onBlur={field.onBlur}
                  />
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
      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null);
        }}
        title={`Retirar o papel ${CONTACT_ROLE_LABELS.buyer}?`}
        description="A classificação do cliente será apagada ao salvar. O histórico de alterações guarda o valor anterior."
        confirmLabel="Retirar papel"
        onConfirm={() => pendingRemoval?.()}
      />
    </div>
  );
}
