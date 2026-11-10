// Contato: pessoa física ou jurídica, com papéis acumuláveis — o parceiro que
// indica um comprador hoje pode ser o comprador de amanhã, no mesmo cadastro.
import { z } from 'zod';
import { listPageSchema, listQuerySchema } from './listing.js';

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
 * (`***.456.789-**`), o CNPJ por inteiro, que é dado público. Decide pelos
 * dígitos, não pelo tipo de pessoa, para que um CPF num cadastro PJ não saia
 * inteiro. O que não é CPF nem CNPJ volta como veio; ausente, `null`.
 */
export function abbreviateTaxId(taxId: string | null): string | null {
  if (!taxId) return null;
  const digits = taxId.replace(/\D/g, '');
  if (digits.length === 11) return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  if (digits.length === 14)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  return taxId;
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

const contactEditableShape = {
  personType: z.enum(PERSON_TYPES, { error: 'Informe o tipo de pessoa.' }),
  name: contactNameSchema,
  legalName: optionalText(CONTACT_NAME_MAX_LENGTH, 'A razão social'),
  email: contactEmailSchema,
  relationshipOrigin: optionalText(CONTACT_RELATIONSHIP_ORIGIN_MAX_LENGTH, 'A origem do relacionamento'),
  strategicNotes: optionalText(CONTACT_STRATEGIC_NOTES_MAX_LENGTH, 'As observações estratégicas'),
  roles: contactRolesSchema,
  classificationId: z.uuid({ error: 'Classificação do cliente inválida.' }).nullable(),
  leadSourceId: z.uuid({ error: 'Origem do lead inválida.' }).nullable(),
};

/** Mínimo para salvar: nome, tipo de pessoa e ao menos um papel. */
export const createContactSchema = z
  .object({
  ...contactEditableShape,
  legalName: contactEditableShape.legalName.optional(),
  email: contactEditableShape.email.optional(),
  relationshipOrigin: contactEditableShape.relationshipOrigin.optional(),
  strategicNotes: contactEditableShape.strategicNotes.optional(),
  classificationId: contactEditableShape.classificationId.optional(),
  leadSourceId: contactEditableShape.leadSourceId.optional(),
  })
  .refine((contact) => !contact.classificationId || hasClassification(contact.roles), {
    path: ['classificationId'],
    error: CONTACT_CLASSIFICATION_REQUIRES_BUYER_MESSAGE,
  });
export type CreateContactInput = z.output<typeof createContactSchema>;

/** `roles`, se presente, substitui o conjunto de papéis. */
export const updateContactSchema = z.object(contactEditableShape).partial();
export type UpdateContactInput = z.output<typeof updateContactSchema>;

export const contactSchema = z.object({
  id: z.uuid(),
  personType: z.enum(PERSON_TYPES),
  name: z.string(),
  legalName: z.string().nullable(),
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
