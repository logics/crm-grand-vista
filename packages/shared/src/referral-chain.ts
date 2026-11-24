// Montagem e validação da cadeia de indicação (`referral_links`): "o Pedro veio
// pelo João, que pegou com o Sebastião". Independente da comissão. Funções
// puras, usadas pelo `ReferralChainEditor` no front e, quando as rotas de
// Contatos e Fazendas nascerem, na validação da API — a mesma regra nos dois
// lados. A posição nunca é escolhida: sai da ordem (1 = quem trouxe direto).

import { z } from 'zod';

/** Indicador: corretor interno (usuário) ou externo (contato). */
export const REFERRER_KINDS = ['user', 'contact'] as const;
export type ReferrerKind = (typeof REFERRER_KINDS)[number];

/** Rótulo curto do tipo de indicador na tela: corretor interno ou externo, no glossário. */
export const REFERRER_KIND_LABELS = { user: 'Interno', contact: 'Externo' } as const satisfies Record<ReferrerKind, string>;

export type Referrer = { kind: ReferrerKind; id: string; name: string };

/** Quem foi indicado: um contato ou uma fazenda. */
export type ReferralSubject = { kind: 'contact' | 'farm'; id: string; name: string };

/** Um elo da cadeia, como a API o devolverá. */
export type ReferralLink = { referrer: Referrer; position: number; notes: string | null };

/**
 * Problema de uma cadeia. `duplicate`: o indicador já apareceu antes, em
 * `firstPosition`. `cycle`: o próprio sujeito aparece como indicador e a cadeia
 * volta a ele. Ciclo entre cadeias diferentes (o João indicou o Pedro e, na
 * cadeia do João, o Pedro indicou o João) não é verificado: cada cadeia é
 * validada sozinha.
 */
export type ReferralChainIssue =
  | { code: 'duplicate'; position: number; firstPosition: number; referrer: Referrer }
  | { code: 'cycle'; position: number; referrer: Referrer };

/** Identidade do indicador na cadeia: usuário e contato de mesmo id são pessoas diferentes. */
export function referrerKey(referrer: Pick<Referrer, 'kind' | 'id'>): string {
  return `${referrer.kind}:${referrer.id}`;
}

const isSubject = (subject: ReferralSubject, referrer: Referrer) =>
  subject.kind === 'contact' && referrer.kind === 'contact' && subject.id === referrer.id;

const renumber = (links: ReferralLink[]) => links.map((link, index) => ({ ...link, position: index + 1 }));

/** Ordena pela posição (empate fica na ordem de chegada) e renumera de 1 em diante. */
export function assembleReferralChain(links: readonly ReferralLink[]): ReferralLink[] {
  return renumber([...links].sort((a, b) => a.position - b.position));
}

/** Problemas da cadeia, na ordem das posições; vazia é cadeia válida. */
export function validateReferralChain(subject: ReferralSubject, links: readonly ReferralLink[]): ReferralChainIssue[] {
  const issues: ReferralChainIssue[] = [];
  const seen = new Map<string, number>();
  for (const { referrer, position } of assembleReferralChain(links)) {
    if (isSubject(subject, referrer)) {
      issues.push({ code: 'cycle', position, referrer });
      continue;
    }
    const key = referrerKey(referrer);
    const firstPosition = seen.get(key);
    if (firstPosition === undefined) seen.set(key, position);
    else issues.push({ code: 'duplicate', position, firstPosition, referrer });
  }
  return issues;
}

/** Mensagem do problema, para a tela e para a resposta da API. */
export function describeReferralChainIssue(issue: ReferralChainIssue): string {
  switch (issue.code) {
    case 'duplicate':
      return `${issue.referrer.name} já está na cadeia, na posição ${issue.firstPosition}.`;
    case 'cycle':
      return `${issue.referrer.name} é quem foi indicado e não pode entrar na própria cadeia.`;
  }
}

/** Se o indicador pode entrar ao fim da cadeia: não é o sujeito e ainda não está nela. */
export function isEligibleReferrer(subject: ReferralSubject, links: readonly ReferralLink[], referrer: Referrer): boolean {
  const key = referrerKey(referrer);
  return !isSubject(subject, referrer) && links.every((link) => referrerKey(link.referrer) !== key);
}

/** Acrescenta o indicador ao fim da cadeia: o indicador de quem já está nela. */
export function appendReferralLink(links: readonly ReferralLink[], referrer: Referrer): ReferralLink[] {
  return assembleReferralChain([...links, { referrer, position: Number.POSITIVE_INFINITY, notes: null }]);
}

/** Tira o elo da posição e renumera os que vêm depois. */
export function removeReferralLink(links: readonly ReferralLink[], position: number): ReferralLink[] {
  return renumber(assembleReferralChain(links).filter((link) => link.position !== position));
}

/**
 * Põe os elos na nova ordem, dada pelas posições atuais (`[2, 1]` troca os dois
 * primeiros); os que ela não cita seguem ao fim, na ordem atual.
 */
export function reorderReferralChain(links: readonly ReferralLink[], positions: readonly number[]): ReferralLink[] {
  const rank = (link: ReferralLink) => {
    const index = positions.indexOf(link.position);
    return index === -1 ? positions.length + link.position : index;
  };
  return renumber(assembleReferralChain(links).sort((a, b) => rank(a) - rank(b)));
}

/** Tamanho máximo da cadeia: o `CHECK` de posição (1..10) do banco. */
export const MAX_REFERRAL_CHAIN_LENGTH = 10;
export const REFERRAL_NOTES_MAX_LENGTH = 500;

export const REFERRAL_CHAIN_TOO_LONG_MESSAGE = `A cadeia de indicação aceita até ${MAX_REFERRAL_CHAIN_LENGTH} indicadores.`;
export const REFERRAL_NOTES_TOO_LONG_MESSAGE = `A nota aceita até ${REFERRAL_NOTES_MAX_LENGTH} caracteres.`;
export const REFERRAL_USER_NOT_IN_TEAM_MESSAGE = 'Usuário não faz parte da equipe.';
export const REFERRAL_CHAIN_CONCURRENT_SAVE_MESSAGE =
  'A cadeia de indicação foi alterada por outra pessoa ao mesmo tempo. Recarregue e tente de novo.';
export const REFERRAL_CONTACT_UNKNOWN_MESSAGE = 'Contato não encontrado nesta empresa.';

const referrerInputSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('user'), id: z.uuid() }),
  z.object({ kind: z.literal('contact'), id: z.uuid() }),
]);

/**
 * Cadeia como o `POST`/`PATCH` a recebe: a ordem da lista é a posição (1 = quem
 * trouxe direto), que nunca é enviada — chave desconhecida é descartada. Sem
 * `.default()`: ausente tem de continuar ausente (não toca a cadeia), e `[]`
 * apaga. Nota vazia vira `null`.
 */
export const referralChainInputSchema = z
  .array(
    z.object({
      referrer: referrerInputSchema,
      notes: z
        .string()
        .trim()
        .max(REFERRAL_NOTES_MAX_LENGTH, REFERRAL_NOTES_TOO_LONG_MESSAGE)
        .nullable()
        .optional()
        .transform((value) => value || null),
    }),
  )
  .max(MAX_REFERRAL_CHAIN_LENGTH, REFERRAL_CHAIN_TOO_LONG_MESSAGE);
export type ReferralChainInput = z.output<typeof referralChainInputSchema>;

/** Elo como o `GET` o devolve: o nome vem hidratado e o usuário carrega `linked` (ainda tem vínculo com a empresa). */
export const referralChainOutputSchema = z.array(
  z.object({
    id: z.uuid(),
    position: z.number().int(),
    referrer: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('user'), id: z.uuid(), name: z.string(), linked: z.boolean() }),
      z.object({ kind: z.literal('contact'), id: z.uuid(), name: z.string() }),
    ]),
    notes: z.string().nullable(),
  }),
);
export type ReferralChainOutput = z.infer<typeof referralChainOutputSchema>;

/** Lista do editor → corpo da API: na ordem das posições, só `{ referrer: { kind, id }, notes }`. */
export function referralChainInputOf(links: readonly ReferralLink[]): ReferralChainInput {
  return assembleReferralChain(links).map(({ referrer, notes }) => ({
    referrer: { kind: referrer.kind, id: referrer.id },
    notes,
  }));
}
