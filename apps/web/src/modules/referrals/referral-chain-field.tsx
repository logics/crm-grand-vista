import type { ReferralChainOutput, ReferralLink, ReferralSubject } from '@crm/shared';
import { ReferralChainEditor, type ReferralChainEditorProps } from '@crm/ui';
import { useMemo } from 'react';
import { useCan } from '../../shell/tenant-access.js';
import { useTenantSlug } from '../../shell/tenant-query.js';
import { searchContactOptions } from '../contacts/contacts-api.js';
import { searchTeamUsers } from '../users/user-field.js';

// Cadeia de indicação ligada à empresa ativa: o `ReferralChainEditor` de
// `@crm/ui` com a busca de equipe (corretor interno) e a busca de contatos
// (corretor externo, os que já têm o papel primeiro). O editor não fala com a
// API; este campo é o que o formulário do contato e, depois, o da fazenda usam.

export type ReferralChainFieldProps = Omit<ReferralChainEditorProps, 'searchUsers' | 'searchContacts'>;

/** Elos como a API os devolve → lista do editor. `linked` não entra: a marca "Sem acesso" é de outra entrega. */
export function toReferralLinks(chain: ReferralChainOutput): ReferralLink[] {
  return chain.map(({ referrer, position, notes }) => ({
    referrer: { kind: referrer.kind, id: referrer.id, name: referrer.name },
    position,
    notes,
  }));
}

export function ReferralChainField(props: ReferralChainFieldProps) {
  const slug = useTenantSlug();
  // Sem `contatos.ver` a busca de contato não existe: só entra corretor interno.
  const canSearchContacts = useCan('contatos.ver');
  const searchUsers = useMemo(() => searchTeamUsers(slug), [slug]);
  const searchContacts = useMemo(() => {
    const search = searchContactOptions(slug);
    return (term: string, options: Parameters<typeof search>[1]) => search(term, { ...options, role: 'external_broker' });
  }, [slug]);
  return (
    <ReferralChainEditor {...props} searchUsers={searchUsers} searchContacts={canSearchContacts ? searchContacts : undefined} />
  );
}

export type { ReferralSubject };
