import type { Session } from '@crm/shared';
import { tenantRootPath } from '../../shell/tenant-path.js';

/**
 * Para onde o usuário vai depois de entrar: a empresa padrão do vínculo, ou a
 * primeira da lista se nenhuma for padrão — pulando as bloqueadas enquanto
 * houver outra. Com todas bloqueadas, vai à padrão mesmo, cuja tela diz o
 * porquê. Sem vínculo algum, não há destino.
 */
export function landingPath(session: Session): string | null {
  const preferred = (tenants: Session['tenants']) => tenants.find((item) => item.isDefault) ?? tenants[0];
  const tenant = preferred(session.tenants.filter((item) => !item.blocked)) ?? preferred(session.tenants);
  return tenant ? tenantRootPath(tenant.slug) : null;
}
