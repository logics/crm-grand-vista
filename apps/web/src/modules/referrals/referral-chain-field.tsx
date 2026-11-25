import type { ReferralChainOutput, ReferralLink, ReferralSubject, Referrer } from '@crm/shared';
import { ReferralChainEditor, type ReferralChainEditorProps } from '@crm/ui';
import { useMemo, useRef, useState } from 'react';
import { useCan } from '../../shell/tenant-access.js';
import { useTenantSlug } from '../../shell/tenant-query.js';
import { searchContactOptions } from '../contacts/contacts-api.js';
import { QuickContactDialog } from '../contacts/quick-contact-dialog.js';
import { searchTeamUsers } from '../users/user-field.js';

// Cadeia de indicação ligada à empresa ativa: o `ReferralChainEditor` de
// `@crm/ui` com a busca de equipe (corretor interno) e a busca de contatos
// (corretor externo, os que já têm o papel primeiro). O editor não fala com a
// API; este campo é o que o formulário do contato e, depois, o da fazenda usam.
// Com `contatos.criar`, o seletor de contato oferece "Cadastrar contato" (diálogo
// de cadastro rápido, com Corretor externo marcado) e o contato criado entra no
// fim da cadeia, pelo `add` do editor (limite, elegibilidade, anúncio e foco).
// `linked` (usuário que saiu da empresa) segue até o editor, que
// mostra "Sem acesso".

export type ReferralChainFieldProps = Omit<ReferralChainEditorProps, 'searchUsers' | 'searchContacts' | 'onCreateContact'>;

/** Elos como a API os devolve → lista do editor; `linked` só existe no usuário. */
export function toReferralLinks(chain: ReferralChainOutput): ReferralLink[] {
  return chain.map(({ referrer, position, notes }) => ({
    referrer:
      referrer.kind === 'user'
        ? { kind: 'user', id: referrer.id, name: referrer.name, linked: referrer.linked }
        : { kind: 'contact', id: referrer.id, name: referrer.name },
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
  const canCreate = useCan('contatos.criar') && canSearchContacts;
  const [creating, setCreating] = useState<string | null>(null);
  // o editor espera o contato criado (ou `null`): a promessa só se resolve com o diálogo já fechado
  const pending = useRef<{ resolve: (referrer: Referrer | null) => void; created: Referrer | null } | null>(null);

  const create = (term: string) =>
    new Promise<Referrer | null>((resolve) => {
      pending.current = { resolve, created: null };
      setCreating(term);
    });

  return (
    <>
      <ReferralChainEditor
        {...props}
        searchUsers={searchUsers}
        searchContacts={canSearchContacts ? searchContacts : undefined}
        onCreateContact={canCreate ? create : undefined}
      />
      {canCreate && (
        <QuickContactDialog
          open={creating !== null}
          onOpenChange={(open) => !open && setCreating(null)}
          initialName={creating ?? ''}
          role="external_broker"
          onCreated={(contact) => {
            if (pending.current) pending.current.created = { kind: 'contact', id: contact.id, name: contact.name };
            setCreating(null);
          }}
          onCloseAutoFocus={(event) => {
            // o foco volta pelo editor, que sabe para onde: o seletor ou o remover do 10º elo
            event.preventDefault();
            const settled = pending.current;
            pending.current = null;
            settled?.resolve(settled.created);
          }}
        />
      )}
    </>
  );
}

export type { ReferralSubject };
