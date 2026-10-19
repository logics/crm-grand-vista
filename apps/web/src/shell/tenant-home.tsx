import { Card } from '@crm/ui';
import { useAuthenticatedSession } from '../modules/auth/require-session.js';
import { activeTenantName } from './active-tenant.js';
import { useTenantSlug } from './tenant-query.js';

// Início da empresa, `/e/<tenant>/`. Por ora, quem está e onde; o dashboard
// toma este lugar na Fase 4.
export function TenantHome() {
  const session = useAuthenticatedSession();
  const tenantName = activeTenantName(session, useTenantSlug());

  return (
    <Card eyebrow="Início" title={`Olá, ${session.user.name}`}>
      <p className="text-body text-text-muted">
        Você está em <strong className="font-semibold text-text-heading">{tenantName}</strong>. Os módulos do CRM
        entram na navegação à medida que forem liberados.
      </p>
    </Card>
  );
}
