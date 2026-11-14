import { municipalityLabel, type Contact, type ContactFarm } from '@crm/shared';
import { Badge } from '@crm/ui';
import { Link } from 'react-router';
import { contactSections } from '../contacts/contact-sections.js';
import { tenantPath } from '../../shell/tenant-path.js';
import { useTenantQuery, useTenantSlug } from '../../shell/tenant-query.js';
import { fetchFarmsByOwner } from './farms-api.js';

// Seção "Fazendas" da ficha do contato: as fazendas de que ele é proprietário,
// em qualquer status, com o principal marcado. Só para o papel proprietário e
// para quem tem `fazendas.ver`; a API recorta pelo escopo de dados (lista e contagem).

function FarmsSection({ record }: { record: Contact }) {
  const slug = useTenantSlug();
  const farms = useTenantQuery(['farms', 'by-owner', record.id], (tenant) => fetchFarmsByOwner(tenant, record.id, 1));

  if (farms.isPending) return <p className="text-sm text-text-muted">Carregando…</p>;
  if (!farms.data) return <p className="text-sm text-text-muted">Não foi possível carregar as fazendas.</p>;
  const { items, total } = farms.data;
  if (total === 0) return <p className="text-sm text-text-muted">Nenhuma fazenda.</p>;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-muted">{total === 1 ? '1 fazenda' : `${total} fazendas`}</p>
      <ul className="flex flex-col gap-3">
        {items.map((farm: ContactFarm) => (
          <li key={farm.id} className="flex flex-wrap items-center gap-3">
            <Link className="font-medium text-text-link" to={tenantPath(slug, `farms/${farm.id}`)}>
              {farm.name}
            </Link>
            <span className="text-sm text-text-muted">{municipalityLabel(farm.municipality)}</span>
            {farm.isPrimary && <Badge size="sm" tone="info">Principal</Badge>}
            <Badge size="sm">{farm.commercialStatus.name}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

contactSections.register({
  key: 'farms',
  title: 'Fazendas',
  order: 20,
  roles: ['owner'],
  permission: 'fazendas.ver',
  component: FarmsSection,
});
