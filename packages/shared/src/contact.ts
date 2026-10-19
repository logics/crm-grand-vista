// Contato: pessoa física ou jurídica, com papéis acumuláveis — o parceiro que
// indica um comprador hoje pode ser o comprador de amanhã, no mesmo cadastro.
import { z } from 'zod';

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
