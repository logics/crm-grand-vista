// Declarações do módulo `referrals`, que não tem rota própria: a cadeia viaja
// aninhada no contato e na fazenda. Quem importa este arquivo (o
// `contacts/routes.ts` e o `farms/routes.ts`) carrega a declaração de uso do
// papel — o módulo é avaliado uma vez, e sem o import, retirar o papel
// Corretor externo em uso deixaria de ser 409. Também traduz as recusas da
// cadeia (regra e banco) para a resposta HTTP.
import { REFERRAL_CHAIN_TOO_LONG_MESSAGE, REFERRAL_NOTES_TOO_LONG_MESSAGE } from '@crm/shared';
import type { Context } from 'hono';
import { databaseError, SQLSTATE } from '../../database-error.js';
import type { TenantEnv } from '../../tenant-context.js';
import { ReferralChainRejection } from './service.js';
import { declareRoleUsage } from '../../contact-roles/usage.js';
import type { HistoryChildDeclaration } from '../../history/assemble.js';

declareRoleUsage('external_broker', {
  table: 'referral_links',
  column: 'referrer_contact_id',
  label: { singular: 'cadeia de indicação', plural: 'cadeias de indicação', gender: 'f' },
  inUsePhrase: 'é indicador em cadeia de indicação',
});

/** O elo como filho do histórico do contato: "Indicador adicionado: João (posição 1)". */
export const contactReferralHistoryChild: HistoryChildDeclaration<'referral_links'> = {
  entity: 'referral_links',
  parentColumn: 'subject_contact_id',
  nameColumn: ['referrer_contact_id', 'referrer_user_id'],
  qualifier: { column: 'position', kinds: ['created'], format: (value) => `posição ${value}` },
};

/** O elo como filho do histórico da fazenda: o mesmo, preso à coluna do sujeito fazenda. */
export const farmReferralHistoryChild: HistoryChildDeclaration<'referral_links'> = {
  ...contactReferralHistoryChild,
  parentColumn: 'subject_farm_id',
};

const REFERRAL_LINKS_TABLE = 'referral_links';

const CHECK_MESSAGES: Record<string, string> = {
  referral_links_position_check: REFERRAL_CHAIN_TOO_LONG_MESSAGE,
  referral_links_notes_check: REFERRAL_NOTES_TOO_LONG_MESSAGE,
  referral_links_not_self_check: 'O contato não pode estar na própria cadeia de indicação.',
};
const CHECK_FALLBACK_MESSAGE = 'A cadeia de indicação não respeita as regras do cadastro.';
const UNIQUE_MESSAGE =
  'A cadeia de indicação tem indicador ou posição repetidos, ou foi alterada por outra pessoa ao mesmo tempo. Recarregue e tente de novo.';

const chainInvalid = (message: string, position?: number) =>
  ({
    error: {
      code: 'validation_error',
      message,
      field: 'referralChain',
      ...(position === undefined ? {} : { position }),
    },
  }) as const;

/**
 * A recusa da cadeia: a regra do serviço ou o CHECK/UNIQUE de `referral_links`
 * (inclusive a posição adiada, que estoura no `COMMIT`) viram 400 no campo.
 * Outro erro, e outras tabelas, nada.
 */
export function referralRefusal(c: Context<TenantEnv>, error: unknown) {
  if (error instanceof ReferralChainRejection) return c.json(chainInvalid(error.message, error.position), 400);
  const { code, table, constraint } = databaseError(error);
  if (table !== REFERRAL_LINKS_TABLE) return null;
  if (code === SQLSTATE.checkViolation)
    return c.json(chainInvalid(CHECK_MESSAGES[constraint ?? ''] ?? CHECK_FALLBACK_MESSAGE), 400);
  if (code === SQLSTATE.uniqueViolation) return c.json(chainInvalid(UNIQUE_MESSAGE), 400);
  return null;
}
