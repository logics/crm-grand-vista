import { FIELD_REGISTRY, farmListQuerySchema, municipalityLabel, type Farm } from '@crm/shared';
import { Badge, Button, Card } from '@crm/ui';
import { useNavigate } from 'react-router';
import { ListPage } from '../../listing/list-page.js';
import { PageHeader } from '../../shell/page-header.js';
import { useCan } from '../../shell/tenant-access.js';
import { tenantPath } from '../../shell/tenant-path.js';
import { useTenantSlug } from '../../shell/tenant-query.js';
import { useAreaFormatter } from '../settings/display-context.js';
import { fetchFarms } from './farms-api.js';

const fields = FIELD_REGISTRY.farms.fields;

/** Lista de fazendas: nome, município — UF, área total, status e corretor responsável. */
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
          { key: 'status', label: fields.commercial_status_id.label, render: (farm) => <Badge size="sm">{farm.commercialStatus.name}</Badge> },
          { key: 'responsible', label: fields.responsible_user_id.label, render: (farm) => farm.responsible.name },
        ]}
        renderCard={(farm) => (
          <Card title={farm.name} subtitle={municipalityLabel(farm.municipality)} interactive onClick={() => open(farm)}>
            <p className="text-sm text-text-body">{formatArea(farm.totalAreaHa)}</p>
          </Card>
        )}
        empty={{
          icon: 'tractor',
          title: 'Nenhuma fazenda cadastrada',
          description: 'As fazendas captadas aparecem aqui.',
        }}
      />
    </div>
  );
}
