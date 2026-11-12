import { FIELD_REGISTRY, municipalityLabel, type Farm } from '@crm/shared';
import { SpecList } from '@crm/ui';
import { RecordHistory } from '../../history/record-history.js';
import { createRecordSectionRegistry } from '../../record-sections/record-sections.js';
import { useTenantSlug } from '../../shell/tenant-query.js';
import { useAreaFormatter } from '../settings/display-context.js';
import { fetchFarmHistory } from './farms-api.js';

// Seções da ficha da fazenda, sobre o mesmo mecanismo da ficha do contato. Cada
// spec que pendura algo na ficha (mapa, galerias, documentos, cadeia de
// indicação) registra a sua aqui, com `farmSections.register`, sem editar a página.

export const farmSections = createRecordSectionRegistry<Farm>();

const fields = FIELD_REGISTRY.farms.fields;

/** "Maria (principal), João": o principal marcado. */
const ownersText = (owners: Farm['owners']) =>
  owners.length === 0 ? null : owners.map((owner) => (owner.isPrimary ? `${owner.name} (principal)` : owner.name)).join(', ');

function DataSection({ record }: { record: Farm }) {
  const formatArea = useAreaFormatter();
  return (
    <SpecList
      items={[
        { label: fields.name.label, value: record.name },
        { label: fields.municipality_ibge_code.label, value: municipalityLabel(record.municipality) },
        { label: fields.trading_post_id.label, value: record.tradingPost?.name ?? null },
        { label: fields.responsible_user_id.label, value: record.responsible.name },
        { label: fields.commercial_status_id.label, value: record.commercialStatus.name },
        { label: 'Proprietários', value: ownersText(record.owners) },
        { label: fields.total_area_ha.label, value: formatArea(record.totalAreaHa) },
        { label: fields.usable_area_ha.label, value: record.usableAreaHa ? formatArea(record.usableAreaHa) : null },
      ]}
    />
  );
}

function HistorySection({ record }: { record: Farm }) {
  const slug = useTenantSlug();
  return (
    <RecordHistory
      queryKey={['farms', record.id]}
      fetchPage={(_slug, cursor) => fetchFarmHistory(slug, record.id, cursor)}
    />
  );
}

farmSections.register({ key: 'data', title: 'Dados', order: 10, component: DataSection });
farmSections.register({ key: 'record-history', title: 'Histórico de alterações', order: 1000, component: HistorySection });
