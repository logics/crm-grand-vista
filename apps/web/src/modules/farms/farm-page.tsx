import { Badge, Button } from '@crm/ui';
import { useParams, useNavigate } from 'react-router';
import { RecordSections } from '../../record-sections/record-sections.js';
import { LoadFailedState, LoadingState } from '../../shell/page-state.js';
import { PageHeader } from '../../shell/page-header.js';
import { useCan } from '../../shell/tenant-access.js';
import { tenantPath } from '../../shell/tenant-path.js';
import { useTenantQuery, useTenantSlug } from '../../shell/tenant-query.js';
import { farmSections } from './farm-sections.js';
import { fetchFarm } from './farms-api.js';

/** Ficha da fazenda: cabeçalho e as seções registradas. */
export function FarmPage() {
  const slug = useTenantSlug();
  const id = useParams().id ?? '';
  const navigate = useNavigate();
  const canEdit = useCan('fazendas.editar');
  const farm = useTenantQuery(['farms', id], (tenant) => fetchFarm(tenant, id));

  if (farm.isPending) return <LoadingState />;
  if (!farm.data) return <LoadFailedState inline title="Não foi possível carregar a fazenda" onRetry={() => void farm.refetch()} />;
  const record = farm.data;

  return (
    <div className="flex flex-col gap-gap-shell">
      <PageHeader
        title={record.name}
        action={
          canEdit && (
            <Button icon="pencil" onClick={() => navigate(tenantPath(slug, `farms/${id}/edit`))}>
              Editar
            </Button>
          )
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{record.commercialStatus.name}</Badge>
      </div>
      <RecordSections registry={farmSections} record={record} />
    </div>
  );
}
