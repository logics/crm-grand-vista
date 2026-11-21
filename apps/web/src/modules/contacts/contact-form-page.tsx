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
  buyerRegionKeyOf,
  createContactSchema,
  isMunicipality,
  type ContactDuplicate,
  type ContactRole,
  formatPhone,
  type PersonType,
} from '@crm/shared';
import {
  AreaInput,
  Checkbox,
  ConfirmDialog,
  EntityForm,
  type EntityFormField,
  type EntityFormSection,
  Input,
  LevelSelect,
  MoneyInput,
  MunicipalityPicker,
  PhoneInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TaxIdInput,
  Textarea,
} from '@crm/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { useUnsavedChangesGuard } from '../../lib/use-unsaved-changes-guard.js';
import { useDisplayContext } from '../settings/display-context.js';
import { QualificationSelect } from './buyer-profile-fields.js';
import { resolveMunicipalities, searchMunicipalities } from '../municipalities/municipality-source.js';
import { VocabularyField } from '../settings/vocabulary-field.js';
import { LoadFailedState, LoadingState } from '../../shell/page-state.js';
import { PageHeader } from '../../shell/page-header.js';
import { tenantPath } from '../../shell/tenant-path.js';
import { TextLink } from '../../shell/text-link.js';
import { tenantQueryKey, useTenantQuery, useTenantSlug } from '../../shell/tenant-query.js';
import { TaxIdTakenError, createContact, fetchContact, fetchDuplicates, updateContact } from './contacts-api.js';
import { ContactDuplicateWarning } from './contact-duplicate-warning.js';

const FORM_ID = 'contact-form';

/** O contato mais a opção só do formulário: sem coluna, ela não existe na API. */
const contactFormSchema = createContactSchema.safeExtend({ sameNumber: z.boolean() });
type FormValues = z.input<typeof contactFormSchema>;
/**
 * Sem o papel comprador a seção não existe: o que sobrou nos campos dela não vai
 * à API (sai `null`, que apaga o perfil, se havia) nem barra o salvamento.
 */
const contactFormSchemaWithoutProfile = contactFormSchema.safeExtend({
  buyerProfile: z
    .any()
    .optional()
    .transform(() => null),
}) as unknown as typeof contactFormSchema;

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
  const [pendingRemoval, setPendingRemoval] = useState<{ apply: () => void; text: string } | null>(null);
  // O campo de classificação só existe com o papel comprador: guarda o valor e o
  // `onChange` dele enquanto está na tela, para a retirada do papel poder apagá-lo.
  const classification = useRef<{ value: string | null | undefined; clear: () => void }>({
    value: contact?.classificationId,
    clear: () => undefined,
  });
  // O mesmo para os campos do perfil de compra, um por nome.
  const profileFields = useRef<Record<string, { value: unknown; clear: () => void }>>({});
  const track = (name: string, value: unknown, onChange: (value: null) => void) => {
    profileFields.current[name] = { value, clear: () => onChange(null) };
  };
  const hasProfileValue = () =>
    Object.values(profileFields.current).some(
      ({ value }) => value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0),
    );
  const { areaUnit, alqueireType } = useDisplayContext();
  const areaProps = { unit: areaUnit === 'ha' ? 'hectare' : 'alqueire', alqueireType } as const;
  // Vem marcada em contato novo e, na edição, quando os dois números são iguais.
  const initialSameNumber = contact ? (contact.phone ?? null) === (contact.whatsapp ?? null) : true;
  const [sameNumber, setSameNumber] = useState(initialSameNumber);
  // Dono do documento que a API recusou por duplicado: o campo oferece abrir o cadastro dele.
  const [duplicate, setDuplicate] = useState<TaxIdTakenError['existing'] | null>(null);
  // Contatos parecidos achados antes de salvar; "salvar mesmo assim" pula a consulta uma vez.
  const [matches, setMatches] = useState<ContactDuplicate[]>([]);
  const skipDuplicateCheck = useRef(false);
  const [dirty, setDirty] = useState(false);
  const guard = useUnsavedChangesGuard(dirty);
  const back = tenantPath(slug, contact ? `contacts/${contact.id}` : 'contacts');

  const save = async ({ sameNumber: copy, ...parsed }: z.output<typeof contactFormSchema>) => {
    const withWhatsapp = copy ? { ...parsed, whatsapp: parsed.phone ?? null } : parsed;
    // `buyerProfile: null` apaga o perfil: só vai quando o contato era comprador e deixou de ser.
    const { buyerProfile, ...rest } = withWhatsapp;
    const values = buyerProfile === null && !contact?.roles.includes('buyer') ? rest : withWhatsapp;
    setDuplicate(null);
    const confirmed = skipDuplicateCheck.current;
    skipDuplicateCheck.current = false;
    if (!confirmed) {
      // O aviso é conselho: se a consulta falha, o cadastro segue.
      const found = await fetchDuplicates(slug, {
        ...(parsed.name ? { name: parsed.name } : {}),
        ...(values.phone ? { phone: values.phone } : {}),
        ...(values.whatsapp ? { whatsapp: values.whatsapp } : {}),
        ...(parsed.email ? { email: parsed.email } : {}),
        ...(contact ? { excludeId: contact.id } : {}),
      }).catch((): ContactDuplicate[] => []);
      setMatches(found);
      if (found.length > 0) return;
    }
    setMatches([]);
    let saved;
    try {
      saved = contact ? await updateContact(slug, contact.id, values) : await createContact(slug, values);
    } catch (error) {
      if (error instanceof TaxIdTakenError) setDuplicate(error.existing);
      throw error;
    }
    await queryClient.invalidateQueries({ queryKey: tenantQueryKey(slug, 'contacts') });
    guard.release();
    navigate(tenantPath(slug, `contacts/${saved.id}`));
  };

  // Perfil de compra e WhatsApp saem do schema quando o campo não está na tela.
  const base = hasClassification(roles) ? contactFormSchema : contactFormSchemaWithoutProfile;
  const schema = sameNumber ? (base.safeExtend({ whatsapp: z.any() }) as unknown as typeof contactFormSchema) : base;

  // Razão social só existe em pessoa jurídica.
  const legalNameFields: EntityFormField<FormValues>[] = hasLegalName(personType)
    ? [
        {
          name: 'legalName',
          label: FIELD_REGISTRY.contacts.fields.legal_name.label,
          render: (field) => <Input {...field} value={field.value ?? ''} />,
        },
      ]
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

  const profile = FIELD_REGISTRY.buyer_profiles.fields;
  const searchRegion = useMemo(() => searchMunicipalities(slug, { allowUf: true }), [slug]);
  const resolveRegion = useMemo(() => resolveMunicipalities(slug), [slug]);
  const profileSection = hasClassification(roles)
    ? [
        {
          title: 'Perfil de compra',
          fields: [
            {
              name: 'buyerProfile.purchaseProfileId',
              label: profile.purchase_profile_id.label,
              render: (field) => {
                track(field.name, field.value, field.onChange as (value: null) => void);
                return (
                  <VocabularyField
                    vocabulary="purchase-profiles"
                    aria-label={profile.purchase_profile_id.label}
                    value={field.value ?? null}
                    onChange={(entry) => field.onChange(entry?.id ?? null)}
                    onBlur={field.onBlur}
                  />
                );
              },
            },
            {
              name: 'buyerProfile.qualificationLevel',
              label: profile.qualification_level.label,
              render: (field) => {
                track(field.name, field.value, field.onChange as (value: null) => void);
                return <QualificationSelect value={field.value ?? null} onChange={field.onChange} onBlur={field.onBlur} />;
              },
            },
            {
              name: 'buyerProfile.urgency',
              label: profile.urgency.label,
              render: (field) => {
                track(field.name, field.value, field.onChange as (value: null) => void);
                return (
                  <LevelSelect
                    aria-label={profile.urgency.label}
                    value={field.value ?? null}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                );
              },
            },
            {
              name: 'buyerProfile.avgTicket',
              label: profile.avg_ticket.label,
              render: (field) => {
                track(field.name, field.value, field.onChange as (value: null) => void);
                return <MoneyInput {...field} value={field.value ?? null} onChange={(value) => field.onChange(value)} />;
              },
            },
            {
              name: 'buyerProfile.maxTicket',
              label: profile.max_ticket.label,
              render: (field) => {
                track(field.name, field.value, field.onChange as (value: null) => void);
                return <MoneyInput {...field} value={field.value ?? null} onChange={(value) => field.onChange(value)} />;
              },
            },
            {
              name: 'buyerProfile.minAreaHa',
              label: profile.min_area_ha.label,
              render: (field) => {
                track(field.name, field.value, field.onChange as (value: null) => void);
                return (
                  <AreaInput {...field} {...areaProps} value={field.value ?? null} onChange={(value) => field.onChange(value)} />
                );
              },
            },
            {
              name: 'buyerProfile.maxAreaHa',
              label: profile.max_area_ha.label,
              render: (field) => {
                track(field.name, field.value, field.onChange as (value: null) => void);
                return (
                  <AreaInput {...field} {...areaProps} value={field.value ?? null} onChange={(value) => field.onChange(value)} />
                );
              },
            },
            {
              name: 'buyerProfile.regions',
              label: 'Regiões de interesse',
              colSpan: 2,
              render: (field) => {
                track(field.name, field.value, field.onChange as (value: null) => void);
                return (
                  <MunicipalityPicker
                    multiple
                    allowUf
                    aria-label="Regiões de interesse"
                    search={searchRegion}
                    resolve={resolveRegion}
                    value={(field.value ?? []).map(buyerRegionKeyOf)}
                    onChange={(selected) =>
                      field.onChange(
                        selected.map((region) => (isMunicipality(region) ? { ibgeCode: region.ibgeCode } : { uf: region.uf })),
                      )
                    }
                    onBlur={field.onBlur}
                  />
                );
              },
            },
            {
              name: 'buyerProfile.cropIds',
              label: 'Culturas de interesse',
              colSpan: 2,
              render: (field) => {
                track(field.name, field.value, field.onChange as (value: null) => void);
                return (
                  <VocabularyField
                    multiple
                    vocabulary="crops"
                    aria-label="Culturas de interesse"
                    value={field.value ?? []}
                    onChange={(entries) => field.onChange(entries.map((entry) => entry.id))}
                    onBlur={field.onBlur}
                  />
                );
              },
            },
            {
              name: 'buyerProfile.paymentMethodIds',
              label: 'Formas de pagamento',
              colSpan: 2,
              render: (field) => {
                track(field.name, field.value, field.onChange as (value: null) => void);
                return (
                  <VocabularyField
                    multiple
                    vocabulary="payment-methods"
                    aria-label="Formas de pagamento"
                    value={field.value ?? []}
                    onChange={(entries) => field.onChange(entries.map((entry) => entry.id))}
                    onBlur={field.onBlur}
                  />
                );
              },
            },
          ],
        } satisfies EntityFormSection<FormValues>,
      ]
    : [];

  return (
    <div className="flex flex-col gap-gap-shell">
      <PageHeader title={contact ? 'Editar contato' : 'Novo contato'} />
      <ContactDuplicateWarning
        matches={matches}
        form={FORM_ID}
        onSaveAnyway={() => {
          skipDuplicateCheck.current = true;
        }}
      />
      <EntityForm
        id={FORM_ID}
        schema={schema}
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
          ...(contact?.buyerProfile ? { buyerProfile: contact.buyerProfile } : {}),
        }}
        onDirtyChange={setDirty}
        onCancel={() => {
          // O EntityForm já confirmou o descarte: o guarda não pergunta de novo.
          guard.release();
          navigate(back);
        }}
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
                              if (!hasClassification(next)) {
                                classification.current.clear();
                                for (const tracked of Object.values(profileFields.current)) tracked.clear();
                                profileFields.current = {};
                              }
                            };
                            // Retirar o comprador apaga a classificação e o perfil de compra: pergunta antes, se houver o que apagar.
                            const hasClassificationValue = !!classification.current.value;
                            const hasProfile = hasProfileValue();
                            if (role === 'buyer' && !checked && (hasClassificationValue || hasProfile)) {
                              setPendingRemoval({
                                apply,
                                text: hasProfile
                                  ? 'A classificação e o perfil de compra deste contato serão apagados ao salvar.'
                                  : 'A classificação do cliente será apagada ao salvar.',
                              });
                            } else apply();
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
              {
                name: 'email',
                label: FIELD_REGISTRY.contacts.fields.email.label,
                render: (field) => <Input type="email" {...field} value={field.value ?? ''} />,
              },
              {
                name: 'relationshipOrigin',
                label: FIELD_REGISTRY.contacts.fields.relationship_origin.label,
                render: (field) => <Input {...field} value={field.value ?? ''} />,
              },
              {
                name: 'strategicNotes',
                label: FIELD_REGISTRY.contacts.fields.strategic_notes.label,
                colSpan: 2,
                render: (field) => <Textarea {...field} value={field.value ?? ''} />,
              },
            ],
          },
          ...profileSection,
        ]}
      />
      {guard.dialog}
      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null);
        }}
        title={`Retirar o papel ${CONTACT_ROLE_LABELS.buyer}?`}
        description={`${pendingRemoval?.text ?? ''} O histórico de alterações guarda o valor anterior.`}
        confirmLabel="Retirar papel"
        onConfirm={() => pendingRemoval?.apply()}
      />
    </div>
  );
}
