import { FIELD_REGISTRY, LEVEL_LABELS, farmListQuerySchema, farmPriceSummary, municipalityLabel, type Farm } from '@crm/shared';
import { Badge, Button, FarmCard } from '@crm/ui';
import { useNavigate } from 'react-router';
import { ListPage } from '../../listing/list-page.js';
import { PageHeader } from '../../shell/page-header.js';
import { useCan } from '../../shell/tenant-access.js';
import { tenantPath } from '../../shell/tenant-path.js';
import { useTenantSlug } from '../../shell/tenant-query.js';
import { useAreaFormatter } from '../settings/display-context.js';
import { FarmFilters } from './farm-filters.js';
import { fetchFarms } from './farms-api.js';

const fields = FIELD_REGISTRY.farms.fields;
const ownerFlag = FIELD_REGISTRY.farm_owners.fields.is_primary;

/** Proprietário principal com "+N" quando há mais; vazio sem proprietário. */
export function primaryOwnerLabel(owners: Farm['owners']): string {
  const primary = owners.find((owner) => owner.isPrimary);
  if (!primary) return '—';
  return owners.length > 1 ? `${primary.name} +${owners.length - 1}` : primary.name;
}

/** Lista de fazendas: nome, município — UF, área total, preço, status, potencial, prioridade e corretor responsável. */
export function FarmsPage() {
  const slug = useTenantSlug();
  const navigate = useNavigate();
  const canCreate = useCan('fazendas.criar');
  const formatArea = useAreaFormatter();
  const open = (farm: Farm) => navigate(tenantPath(slug, `farms/${farm.id}`));

  return (
    <div className="flex flex-col gap-gap-shell">
      <PageHeader
        title="Fazendas"
        action={
          canCreate && (
            <Button icon="plus" onClick={() => navigate(tenantPath(slug, 'farms/new'))}>
              Nova fazenda
            </Button>
          )
        }
      />
      <ListPage
        schema={farmListQuerySchema}
        queryKey={['farms']}
        fetchPage={fetchFarms}
        onRowClick={open}
        searchPlaceholder="Buscar fazenda"
        columns={[
          { key: 'name', label: fields.name.label, strong: true, sortable: true, render: (farm) => farm.name },
          { key: 'municipality', label: fields.municipality_ibge_code.label, render: (farm) => municipalityLabel(farm.municipality) },
          { key: 'totalAreaHa', label: fields.total_area_ha.label, sortable: true, render: (farm) => formatArea(farm.totalAreaHa) },
          { key: 'askingPrice', label: fields.asking_price.label, sortable: true, render: (farm) => farmPriceSummary(farm) },
          { key: 'owner', label: ownerFlag.label, render: (farm) => primaryOwnerLabel(farm.owners) },
          { key: 'status', label: fields.commercial_status_id.label, render: (farm) => <Badge size="sm">{farm.commercialStatus.name}</Badge> },
          { key: 'salesPotential', label: fields.sales_potential.label, render: (farm) => (farm.salesPotential ? LEVEL_LABELS[farm.salesPotential] : '—') },
          { key: 'priority', label: fields.priority.label, render: (farm) => (farm.priority ? LEVEL_LABELS[farm.priority] : '—') },
          { key: 'responsible', label: fields.responsible_user_id.label, render: (farm) => farm.responsible.name },
        ]}
        renderCard={(farm) => (
          <FarmCard
            name={farm.name}
            location={municipalityLabel(farm.municipality)}
            price={farmPriceSummary(farm)}
            priceUnit={null}
            area={formatArea(farm.totalAreaHa)}
            status={farm.commercialStatus.name}
            statusTone="neutral"
            onClick={() => open(farm)}
          />
        )}
        empty={{
          icon: 'tractor',
          title: 'Nenhuma fazenda cadastrada',
          description: 'As fazendas captadas aparecem aqui.',
        }}
      >
        {(list) => <FarmFilters {...list} />}
      </ListPage>
    </div>
  );
}
