import type { ContactDetail } from '@crm/shared';
import { Button, EmptyState, ReferralChainEditor } from '@crm/ui';
import { useNavigate } from 'react-router';
import { useCan } from '../../shell/tenant-access.js';
import { tenantPath } from '../../shell/tenant-path.js';
import { useTenantSlug } from '../../shell/tenant-query.js';
import { toReferralLinks } from './referral-chain-field.js';

/**
 * Seção "Cadeia de indicação" da ficha do contato: o editor em somente leitura
 * (sem `onChange`: sem alça, remover nem seletor). Sem cadeia, estado vazio com o
 * atalho para o formulário, só para quem pode editar.
 */
export function ContactReferralSection({ record }: { record: ContactDetail }) {
  const slug = useTenantSlug();
  const navigate = useNavigate();
  const canEdit = useCan('contatos.editar');

  if (record.referralChain.length === 0) {
    return (
      <EmptyState
        compact
        title="Sem cadeia de indicação"
        description="Quem trouxe este contato ainda não foi registrado."
        action={
          canEdit ? (
            <Button onClick={() => navigate(tenantPath(slug, `contacts/${record.id}/edit#indicacao`))}>
              Registrar indicação
            </Button>
          ) : undefined
        }
      />
    );
  }
  return (
    <ReferralChainEditor
      subject={{ kind: 'contact', id: record.id, name: record.name }}
      value={toReferralLinks(record.referralChain)}
    />
  );
}
