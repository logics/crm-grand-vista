import type { FarmDetail } from '@crm/shared';
import { Button, EmptyState, ReferralChainEditor } from '@crm/ui';
import { useNavigate } from 'react-router';
import { useCan } from '../../shell/tenant-access.js';
import { tenantPath } from '../../shell/tenant-path.js';
import { useTenantSlug } from '../../shell/tenant-query.js';
import { toReferralLinks } from './referral-chain-field.js';

/**
 * Seção "Cadeia de indicação" da ficha da fazenda: o editor em somente leitura
 * (sem `onChange`: sem alça, remover nem seletor). Sem cadeia, estado vazio com o
 * atalho para o formulário, só para quem pode editar.
 */
export function FarmReferralSection({ record }: { record: FarmDetail }) {
  const slug = useTenantSlug();
  const navigate = useNavigate();
  const canEdit = useCan('fazendas.editar');

  if (record.referralChain.length === 0) {
    return (
      <EmptyState
        compact
        title="Sem cadeia de indicação"
        description="Quem trouxe esta fazenda ainda não foi registrado."
        action={
          canEdit ? (
            <Button onClick={() => navigate(tenantPath(slug, `farms/${record.id}/edit#indicacao`))}>
              Registrar indicação
            </Button>
          ) : undefined
        }
      />
    );
  }
  return (
    <ReferralChainEditor
      subject={{ kind: 'farm', id: record.id, name: record.name }}
      value={toReferralLinks(record.referralChain)}
    />
  );
}
