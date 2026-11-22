import { FIELD_REGISTRY, LEVEL_LABELS, QUALIFICATION_LEVEL_LABELS, formatFieldValue, type Contact } from '@crm/shared';
import { Button, EmptyState, SpecList } from '@crm/ui';
import { useNavigate } from 'react-router';
import { useCan } from '../../shell/tenant-access.js';
import { tenantPath } from '../../shell/tenant-path.js';
import { useTenantSlug } from '../../shell/tenant-query.js';
import { useDisplayContext } from '../settings/display-context.js';
import { useRegionLabels } from './region-labels.js';
import { useVocabularyName, useVocabularyNames } from './vocabulary-name.js';

const fields = FIELD_REGISTRY.buyer_profiles.fields;

/**
 * Seção "Perfil de compra" da ficha, só para comprador. Patrimônio e capacidade
 * de investimento só aparecem com `contatos.ver_dados_financeiros` (sem ela nem
 * o rótulo, e o servidor nem manda os valores). Sem perfil, estado vazio com o
 * atalho para o formulário.
 */
export function BuyerProfileSection({ record }: { record: Contact }) {
  const slug = useTenantSlug();
  const navigate = useNavigate();
  const canEdit = useCan('contatos.editar');
  const canSeeFinancial = useCan('contatos.ver_dados_financeiros');
  const context = useDisplayContext();
  const profile = record.buyerProfile;
  const purchaseProfile = useVocabularyName('purchase-profiles', profile?.purchaseProfileId ?? null);
  const regions = useRegionLabels(profile?.regions ?? []);
  const crops = useVocabularyNames('crops', profile?.cropIds ?? []);
  const paymentMethods = useVocabularyNames('payment-methods', profile?.paymentMethodIds ?? []);

  if (!profile) {
    return (
      <EmptyState
        compact
        title="Sem perfil de compra"
        description="O que este comprador procura e como costuma pagar ainda não foi preenchido."
        action={
          canEdit ? (
            <Button onClick={() => navigate(tenantPath(slug, `contacts/${record.id}/edit`))}>Preencher perfil de compra</Button>
          ) : undefined
        }
      />
    );
  }

  const money = (field: 'avg_ticket' | 'max_ticket', value: string | null) => formatFieldValue(fields[field], value, context);
  const financial = (field: 'estimated_net_worth' | 'investment_capacity', value: string | null | undefined) =>
    formatFieldValue(fields[field], value ?? null, context);
  const area = (field: 'min_area_ha' | 'max_area_ha', value: string | null) => formatFieldValue(fields[field], value, context);

  return (
    <SpecList
      items={[
        { label: fields.purchase_profile_id.label, value: purchaseProfile },
        {
          label: fields.qualification_level.label,
          value: profile.qualificationLevel && QUALIFICATION_LEVEL_LABELS[profile.qualificationLevel],
        },
        { label: fields.urgency.label, value: profile.urgency && LEVEL_LABELS[profile.urgency] },
        { label: fields.avg_ticket.label, value: money('avg_ticket', profile.avgTicket) },
        { label: fields.max_ticket.label, value: money('max_ticket', profile.maxTicket) },
        { label: fields.min_area_ha.label, value: area('min_area_ha', profile.minAreaHa) },
        { label: fields.max_area_ha.label, value: area('max_area_ha', profile.maxAreaHa) },
        ...(canSeeFinancial
          ? [
              { label: fields.estimated_net_worth.label, value: financial('estimated_net_worth', profile.estimatedNetWorth) },
              { label: fields.investment_capacity.label, value: financial('investment_capacity', profile.investmentCapacity) },
            ]
          : []),
        { label: 'Regiões de interesse', value: regions.join(', ') },
        { label: 'Culturas de interesse', value: crops.join(', ') },
        { label: 'Formas de pagamento', value: paymentMethods.join(', ') },
      ]}
    />
  );
}
