// Declarações do módulo `referrals`, que não tem rota própria: a cadeia viaja
// aninhada no contato. Quem importa este arquivo (o `contacts/routes.ts`) é
// quem carrega a declaração de uso do papel — sem o import, retirar o papel
// Corretor externo em uso deixaria de ser 409.
import { declareRoleUsage } from '../contacts/role-usage.js';
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

export { ReferralChainRejection } from './service.js';
