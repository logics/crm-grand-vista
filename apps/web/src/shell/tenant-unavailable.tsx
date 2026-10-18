import { TENANT_BLOCKED_MESSAGE, TENANT_NOT_FOUND_MESSAGE, type Session } from '@crm/shared';
import { LogoutButton } from '../modules/auth/logout-button.js';
import { BlockedBadge } from './blocked-badge.js';
import { PageState } from './page-state.js';
import type { TenantAccess } from './tenant-access.js';
import { tenantRootPath } from './tenant-path.js';
import { TextLink } from './text-link.js';

const REASONS = {
  not_found: { icon: 'search-x', title: TENANT_NOT_FOUND_MESSAGE },
  blocked: { icon: 'alert-circle', title: TENANT_BLOCKED_MESSAGE },
} as const;

/**
 * A empresa da URL não abre: a mensagem única de "sem acesso ou inexistente"
 * — que não distingue os dois — ou a de bloqueada, para quem tem vínculo. Em
 * seguida, as outras empresas do usuário, que ele tem direito de ver.
 */
export function TenantUnavailable({
  session,
  slug,
  reason,
}: {
  session: Session;
  slug: string;
  reason: Exclude<TenantAccess, 'open'>;
}) {
  const others = session.tenants.filter((tenant) => tenant.slug !== slug);

  return (
    <PageState
      {...REASONS[reason]}
      description={others.length > 0 ? 'Escolha uma das suas empresas para continuar.' : undefined}
      action={
        <div className="flex flex-col items-center gap-7">
          {others.length > 0 && (
            <nav aria-label="Suas empresas">
              <ul className="flex flex-col items-center gap-4">
                {others.map((tenant) => (
                  <li key={tenant.slug} className="flex items-center gap-4">
                    <TextLink to={tenantRootPath(tenant.slug)}>{tenant.name}</TextLink>
                    {tenant.blocked && <BlockedBadge />}
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <LogoutButton />
        </div>
      }
    />
  );
}
