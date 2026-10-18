import type { Session } from '@crm/shared';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@crm/ui';
import { useLocation, useNavigate } from 'react-router';
import { BlockedBadge } from './blocked-badge.js';
import { switchTenantPath, tenantSwitchState } from './tenant-path.js';

/**
 * O único lugar de troca de empresa (ADR 0002): nenhum filtro de módulo tem
 * seletor de empresa. Lista só as empresas vinculadas — o super admin, numa
 * empresa sem vínculo, vê o slug dela no gatilho e as dele na lista. Com um
 * vínculo só, não há o que trocar, e o seletor não aparece.
 */
export function TenantSwitcher({ session, slug }: { session: Session; slug: string }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (session.tenants.length < 2) return null;
  const linked = session.tenants.some((tenant) => tenant.slug === slug);

  return (
    <Select
      value={slug}
      onValueChange={(target) => void navigate(switchTenantPath(pathname, target), { state: tenantSwitchState })}
    >
      <SelectTrigger size="sm" aria-label="Empresa" className="w-auto">
        {/* Sem item para a empresa ativa, o Radix deixaria o gatilho vazio. */}
        <SelectValue>{linked ? undefined : slug}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {session.tenants.map((tenant) => (
          <SelectItem key={tenant.slug} value={tenant.slug}>
            <span className="flex items-center gap-4">
              {tenant.name}
              {tenant.blocked && <BlockedBadge />}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
