import { DOCUMENT_STATUS_LABELS, FIELD_REGISTRY, LEVEL_LABELS, formatDecimal, municipalityLabel, type Farm, type Level } from '@crm/shared';
import { SpecList } from '@crm/ui';
import type { ReactNode } from 'react';
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

const level = (value: Level | null) => (value ? LEVEL_LABELS[value] : null);
const km = (value: string | null) => (value === null ? null : `${formatDecimal(value, { minScale: 0, maxScale: 2 })} km`);
const names = (items: Farm['aptitudes']) => (items.length > 0 ? items.map((item) => item.name).join(', ') : null);

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-5">
      <h3 className="text-sm font-semibold text-text-body">{title}</h3>
      {children}
    </section>
  );
}

// Os mesmos blocos do formulário, na mesma ordem. Bloco novo (proprietários,
// precificação) entra por inserção na lista de `DataSection`.
function IdentificationBlock({ record }: { record: Farm }) {
  return (
    <Block title="Identificação">
      <SpecList
        items={[
          { label: fields.name.label, value: record.name },
          { label: fields.municipality_ibge_code.label, value: municipalityLabel(record.municipality) },
          { label: fields.trading_post_id.label, value: record.tradingPost?.name ?? null },
          { label: fields.responsible_user_id.label, value: record.responsible.name },
        ]}
      />
    </Block>
  );
}

function AreasBlock({ record }: { record: Farm }) {
  const formatArea = useAreaFormatter();
  return (
    <Block title="Áreas">
      <SpecList
        items={[
          { label: fields.total_area_ha.label, value: formatArea(record.totalAreaHa) },
          { label: fields.usable_area_ha.label, value: record.usableAreaHa ? formatArea(record.usableAreaHa) : null },
        ]}
      />
    </Block>
  );
}

function CommercialBlock({ record }: { record: Farm }) {
  return (
    <Block title="Comercial">
      <SpecList
        items={[
          { label: fields.commercial_status_id.label, value: record.commercialStatus.name },
          { label: fields.sales_potential.label, value: level(record.salesPotential) },
          { label: fields.priority.label, value: level(record.priority) },
        ]}
      />
    </Block>
  );
}

function TechnicalBlock({ record }: { record: Farm }) {
  const coordinates = record.latitude !== null && record.longitude !== null ? `${record.latitude}, ${record.longitude}` : null;
  return (
    <Block title="Técnico">
      <SpecList
        items={[
          { label: 'Aptidões', value: names(record.aptitudes) },
          { label: 'Culturas', value: names(record.crops) },
          { label: fields.water_availability.label, value: level(record.waterAvailability) },
          { label: fields.irrigation_potential.label, value: level(record.irrigationPotential) },
          { label: fields.productive_potential.label, value: level(record.productivePotential) },
          { label: fields.distance_to_highway_km.label, value: km(record.distanceToHighwayKm) },
          { label: fields.distance_to_warehouse_km.label, value: km(record.distanceToWarehouseKm) },
          { label: fields.document_status.label, value: record.documentStatus ? DOCUMENT_STATUS_LABELS[record.documentStatus] : null },
          { label: 'Coordenadas', value: coordinates, mono: true },
        ]}
      />
      <SpecList
        columns={1}
        items={[
          { label: fields.document_notes.label, value: record.documentNotes },
          { label: fields.soil.label, value: record.soil },
          { label: fields.topography.label, value: record.topography },
          { label: fields.water.label, value: record.water },
          { label: fields.historical_productivity.label, value: record.historicalProductivity },
          { label: fields.infrastructure.label, value: record.infrastructure },
          { label: fields.technical_summary.label, value: record.technicalSummary },
          { label: fields.differentials.label, value: record.differentials },
        ]}
      />
    </Block>
  );
}

function DataSection({ record }: { record: Farm }) {
  return (
    <div className="flex flex-col gap-gap-shell">
      <IdentificationBlock record={record} />
      <AreasBlock record={record} />
      <CommercialBlock record={record} />
      <TechnicalBlock record={record} />
    </div>
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
