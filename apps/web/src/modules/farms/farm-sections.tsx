import {
  ALQUEIRE_LABELS,
  DOCUMENT_STATUS_LABELS,
  FIELD_REGISTRY,
  LEVEL_LABELS,
  PRICE_DERIVATIVE_LABELS,
  formatDecimal,
  formatMoney,
  municipalityLabel,
  type Farm,
  type Level,
} from '@crm/shared';
import { SpecList } from '@crm/ui';
import type { ReactNode } from 'react';
import { createRecordSectionRegistry } from '../../record-sections/record-sections.js';
import { useAreaFormatter } from '../settings/display-context.js';

// Seções da ficha da fazenda, sobre o mesmo mecanismo da ficha do contato. Cada
// spec que pendura algo na ficha (mapa, galerias, documentos, cadeia de
// indicação) registra a sua aqui, com `farmSections.register`, sem editar a página.

export const farmSections = createRecordSectionRegistry<Farm>();

const fields = FIELD_REGISTRY.farms.fields;

const BAGS_FORMAT = { minScale: 0, maxScale: 2 };
const formatBags = (value: string) => `${formatDecimal(value, BAGS_FORMAT)} sacas`;

/** Preço da fazenda como foi informado, mais os derivados; sem preço, "Preço não informado". */
function pricingItems(record: Farm) {
  const { priceDerivatives: derived } = record;
  if (record.pricingMode === 'brl' && record.askingPrice) {
    return [
      { label: fields.asking_price.label, value: formatMoney(record.askingPrice) },
      {
        label: PRICE_DERIVATIVE_LABELS.pricePerHectare,
        value: derived.pricePerHectare ? formatMoney(derived.pricePerHectare) : null,
      },
      {
        label: PRICE_DERIVATIVE_LABELS.pricePerUsableHectare,
        value: derived.pricePerUsableHectare ? formatMoney(derived.pricePerUsableHectare) : null,
      },
    ];
  }
  if (record.pricingMode === 'bags' && record.valuationBags && record.valuationBagsUnit) {
    const unit =
      record.valuationBagsUnit === 'per_alqueire' && record.valuationBagsAlqueireType
        ? `por ${ALQUEIRE_LABELS[record.valuationBagsAlqueireType].replace('alq. ', 'alqueire ')}`
        : record.valuationBagsUnit === 'per_alqueire'
          ? 'por alqueire'
          : 'por hectare';
    return [
      { label: fields.valuation_bags.label, value: `${formatBags(record.valuationBags)} ${unit}` },
      { label: fields.valuation_crop_id.label, value: record.valuationCrop?.name ?? null },
      {
        label: PRICE_DERIVATIVE_LABELS.bagsPerHectare,
        value: derived.bagsPerHectare ? formatBags(derived.bagsPerHectare) : null,
      },
    ];
  }
  return [{ label: fields.pricing_mode.label, value: PRICE_DERIVATIVE_LABELS.noPrice }];
}

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

/** O principal e, à parte, os demais; o título do bloco já diz "Proprietários". */
function ownerItems(owners: Farm['owners']) {
  const primary = owners.find((owner) => owner.isPrimary);
  const others = owners.filter((owner) => !owner.isPrimary).map((owner) => owner.name);
  return [
    { label: 'Principal', value: primary?.name ?? null },
    ...(others.length > 0 ? [{ label: others.length > 1 ? 'Demais' : 'Outro', value: others.join(', ') }] : []),
  ];
}

function OwnersBlock({ record }: { record: Farm }) {
  return (
    <Block title="Proprietários">
      <SpecList items={ownerItems(record.owners)} />
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
  const notes = (
    [
      ['document_notes', record.documentNotes],
      ['soil', record.soil],
      ['topography', record.topography],
      ['water', record.water],
      ['historical_productivity', record.historicalProductivity],
      ['infrastructure', record.infrastructure],
      ['technical_summary', record.technicalSummary],
      ['differentials', record.differentials],
    ] as const
  )
    .filter(([, value]) => value)
    .map(([key, value]) => ({ label: fields[key].label, value }));
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
          {
            label: fields.document_status.label,
            value: record.documentStatus ? DOCUMENT_STATUS_LABELS[record.documentStatus] : null,
          },
          { label: 'Coordenadas', value: coordinates, mono: true },
        ]}
      />
      {/* textos longos: só os preenchidos — oito travessões em coluna única são ruído */}
      {notes.length > 0 && <SpecList columns={1} items={notes} />}
    </Block>
  );
}

function PricingBlock({ record }: { record: Farm }) {
  return (
    <Block title="Precificação">
      <SpecList items={pricingItems(record)} />
    </Block>
  );
}

function DataSection({ record }: { record: Farm }) {
  return (
    <div className="flex flex-col gap-gap-shell">
      <IdentificationBlock record={record} />
      <OwnersBlock record={record} />
      <AreasBlock record={record} />
      <PricingBlock record={record} />
      <CommercialBlock record={record} />
      <TechnicalBlock record={record} />
    </div>
  );
}

farmSections.register({ key: 'data', title: 'Dados', order: 10, component: DataSection });
