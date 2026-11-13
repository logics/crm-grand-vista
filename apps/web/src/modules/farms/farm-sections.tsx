import {
  ALQUEIRE_LABELS,
  FIELD_REGISTRY,
  PRICE_DERIVATIVE_LABELS,
  formatDecimal,
  formatMoney,
  municipalityLabel,
  type Farm,
} from '@crm/shared';
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

const BAGS_FORMAT = { minScale: 0, maxScale: 2 };
const formatBags = (value: string) => `${formatDecimal(value, BAGS_FORMAT)} sacas`;

/** Preço da fazenda como foi informado, mais os derivados; sem preço, "Preço não informado". */
function pricingItems(record: Farm) {
  const { priceDerivatives: derived } = record;
  if (record.pricingMode === 'brl' && record.askingPrice) {
    return [
      { label: fields.asking_price.label, value: formatMoney(record.askingPrice) },
      { label: PRICE_DERIVATIVE_LABELS.pricePerHectare, value: derived.pricePerHectare ? formatMoney(derived.pricePerHectare) : null },
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
      { label: PRICE_DERIVATIVE_LABELS.bagsPerHectare, value: derived.bagsPerHectare ? formatBags(derived.bagsPerHectare) : null },
    ];
  }
  return [{ label: fields.pricing_mode.label, value: PRICE_DERIVATIVE_LABELS.noPrice }];
}

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
        { label: fields.total_area_ha.label, value: formatArea(record.totalAreaHa) },
        { label: fields.usable_area_ha.label, value: record.usableAreaHa ? formatArea(record.usableAreaHa) : null },
        ...pricingItems(record),
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
