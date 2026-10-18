import type { Session } from '@crm/shared';

/**
 * Para onde o usuário vai depois de entrar: a empresa padrão do vínculo, ou a
 * primeira da lista se nenhuma for padrão. Sem vínculo algum, não há destino.
 */
export function landingPath(session: Session): string | null {
  const tenant = session.tenants.find((item) => item.isDefault) ?? session.tenants[0];
  return tenant ? `/e/${encodeURIComponent(tenant.slug)}` : null;
}
