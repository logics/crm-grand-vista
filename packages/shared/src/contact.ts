// Contato: pessoa física ou jurídica, com papéis acumuláveis — o parceiro que
// indica um comprador hoje pode ser o comprador de amanhã, no mesmo cadastro.
import { z } from 'zod';
import { listPageSchema, listQuerySchema } from './listing.js';
import { formatTaxId, isValidCnpj, isValidCpf, normalizeTaxId, taxIdKind } from './tax-id.js';

export const PERSON_TYPES = ['pf', 'pj'] as const;
export type PersonType = (typeof PERSON_TYPES)[number];

export const PERSON_TYPE_LABELS: Record<PersonType, string> = { pf: 'PF', pj: 'PJ' };

export const CONTACT_ROLES = ['buyer', 'owner', 'external_broker'] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  buyer: 'Comprador',
  owner: 'Proprietário',
  external_broker: 'Corretor externo',
};

/** Contato como a busca o devolve: o que basta para reconhecê-lo num seletor. */
export const contactOptionSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  personType: z.enum(PERSON_TYPES),
  /** CPF ou CNPJ, só os dígitos ou formatado; muitos contatos ainda não o têm. */
  taxId: z.string().nullable(),
  roles: z.array(z.enum(CONTACT_ROLES)),
});

export type ContactOption = z.infer<typeof contactOptionSchema>;

/**
 * Documento para listagem: o CPF mascarado como no Portal da Transparência
 * (`***.456.789-**`), o CNPJ por inteiro, que é dado público. Decide pelo valor
 * normalizado, não pelo tipo de pessoa: 11 dígitos é CPF, 14 posições (numéricas
 * ou alfanuméricas) é CNPJ — contar só os dígitos mascararia como CPF um CNPJ
 * alfanumérico com exatamente 11 deles. O que não é CPF nem CNPJ volta como
 * veio; ausente, `null`.
 */
export function abbreviateTaxId(taxId: string | null): string | null {
  if (!taxId) return null;
  const normalized = normalizeTaxId(taxId);
  switch (taxIdKind(normalized)) {
    case 'cpf':
      return `***.${normalized.slice(3, 6)}.${normalized.slice(6, 9)}-**`;
    case 'cnpj':
      return formatTaxId(normalized);
    default:
      return taxId;
  }
}

/** Rótulo do conjunto de papéis (não é coluna de `contacts`, então não está no registro de campos). */
export const CONTACT_ROLES_LABEL = 'Papéis';

/** Em PJ o nome é o nome fantasia. */
export const contactNameLabel = (personType: PersonType): string => (personType === 'pj' ? 'Nome fantasia' : 'Nome');

/** Razão social só existe em pessoa jurídica. */
export const hasLegalName = (personType: PersonType): boolean => personType === 'pj';

export const CONTACT_NAME_MAX_LENGTH = 200;
export const CONTACT_RELATIONSHIP_ORIGIN_MAX_LENGTH = 500;
export const CONTACT_STRATEGIC_NOTES_MAX_LENGTH = 10_000;

export const CONTACT_ROLE_REQUIRED_MESSAGE = 'Informe ao menos um papel.';
export const CONTACT_NOT_FOUND_MESSAGE = 'Contato não encontrado.';
export const CONTACT_CLASSIFICATION_REQUIRES_BUYER_MESSAGE =
  'A classificação do cliente só vale para quem tem o papel de comprador.';
export const CONTACT_CLASSIFICATION_UNKNOWN_MESSAGE = 'Classificação do cliente inválida.';
export const CONTACT_LEAD_SOURCE_UNKNOWN_MESSAGE = 'Origem do lead inválida.';

/** A classificação do cliente é dado exclusivo do papel comprador. */
export const hasClassification = (roles: readonly ContactRole[]): boolean => roles.includes('buyer');
export const TAX_ID_CPF_MESSAGE = 'Informe um CPF válido.';
export const TAX_ID_CNPJ_MESSAGE = 'Informe um CNPJ válido.';
export const TAX_ID_TAKEN_MESSAGE = 'Já existe um contato com este documento.';

/** Recusa do documento para o tipo de pessoa (PF exige CPF, PJ exige CNPJ), ou `null` se serve. Ausente serve: o documento é opcional. */
export function taxIdIssue(personType: PersonType, taxId: string | null | undefined): string | null {
  if (!taxId) return null;
  if (personType === 'pf') return isValidCpf(taxId) ? null : TAX_ID_CPF_MESSAGE;
  return isValidCnpj(taxId) ? null : TAX_ID_CNPJ_MESSAGE;
}

/** Texto opcional: espaços nas pontas saem, e o vazio vira ausência (`null`). */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} aceita até ${max} caracteres.`)
    .transform((value) => value || null)
    .nullable();

const contactNameSchema = z
  .string()
  .trim()
  .min(1, 'Informe o nome.')
  .max(CONTACT_NAME_MAX_LENGTH, `O nome aceita até ${CONTACT_NAME_MAX_LENGTH} caracteres.`);

const contactRolesSchema = z
  .array(z.enum(CONTACT_ROLES, { error: 'Papel inválido.' }))
  .min(1, CONTACT_ROLE_REQUIRED_MESSAGE)
  .transform((roles) => CONTACT_ROLES.filter((role) => roles.includes(role)));

const contactEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) => value || null)
  .pipe(z.email('Informe um e-mail válido.').nullable())
  .nullable();

/** Documento digitado: sai normalizado (sem pontuação, maiúsculas); vazio vira ausência. */
const contactTaxIdSchema = z
  .string()
  .transform(normalizeTaxId)
  .transform((value) => value || null)
  .nullable();

const contactEditableShape = {
  personType: z.enum(PERSON_TYPES, { error: 'Informe o tipo de pessoa.' }),
  name: contactNameSchema,
  legalName: optionalText(CONTACT_NAME_MAX_LENGTH, 'A razão social'),
  taxId: contactTaxIdSchema,
  email: contactEmailSchema,
  relationshipOrigin: optionalText(CONTACT_RELATIONSHIP_ORIGIN_MAX_LENGTH, 'A origem do relacionamento'),
  strategicNotes: optionalText(CONTACT_STRATEGIC_NOTES_MAX_LENGTH, 'As observações estratégicas'),
  roles: contactRolesSchema,
  classificationId: z.uuid({ error: 'Classificação do cliente inválida.' }).nullable(),
  leadSourceId: z.uuid({ error: 'Origem do lead inválida.' }).nullable(),
};

/** O documento tem de servir ao tipo de pessoa informado junto; o erro cai no campo. */
const checkTaxId = (
  value: { personType?: PersonType | undefined; taxId?: string | null | undefined },
  ctx: z.RefinementCtx,
) => {
  const message = value.personType ? taxIdIssue(value.personType, value.taxId) : null;
  if (message) ctx.addIssue({ code: 'custom', path: ['taxId'], message });
};

/** Mínimo para salvar: nome, tipo de pessoa e ao menos um papel. */
export const createContactSchema = z
  .object({
    ...contactEditableShape,
    legalName: contactEditableShape.legalName.optional(),
    taxId: contactEditableShape.taxId.optional(),
    email: contactEditableShape.email.optional(),
    relationshipOrigin: contactEditableShape.relationshipOrigin.optional(),
    strategicNotes: contactEditableShape.strategicNotes.optional(),
    classificationId: contactEditableShape.classificationId.optional(),
    leadSourceId: contactEditableShape.leadSourceId.optional(),
  })
  .superRefine(checkTaxId)
  .refine((contact) => !contact.classificationId || hasClassification(contact.roles), {
    path: ['classificationId'],
    error: CONTACT_CLASSIFICATION_REQUIRES_BUYER_MESSAGE,
  });
export type CreateContactInput = z.output<typeof createContactSchema>;

/**
 * `roles`, se presente, substitui o conjunto de papéis. Documento sem tipo de
 * pessoa no mesmo corpo só pode ser conferido contra o do cadastro (serviço).
 */
export const updateContactSchema = z.object(contactEditableShape).partial().superRefine(checkTaxId);
export type UpdateContactInput = z.output<typeof updateContactSchema>;

export const contactSchema = z.object({
  id: z.uuid(),
  personType: z.enum(PERSON_TYPES),
  name: z.string(),
  legalName: z.string().nullable(),
  /** Documento normalizado (sem pontuação); a tela o formata. */
  taxId: z.string().nullable(),
  email: z.string().nullable(),
  relationshipOrigin: z.string().nullable(),
  strategicNotes: z.string().nullable(),
  classificationId: z.uuid().nullable(),
  leadSourceId: z.uuid().nullable(),
  roles: z.array(z.enum(CONTACT_ROLES)),
  createdAt: z.string(),
});
export type Contact = z.infer<typeof contactSchema>;

export const CONTACT_SORT_FIELDS = ['name', 'createdAt'] as const;

export const contactListQuerySchema = listQuerySchema({ sortable: CONTACT_SORT_FIELDS });
export type ContactListQuery = z.output<typeof contactListQuerySchema>;

export const contactPageSchema = listPageSchema(contactSchema);
