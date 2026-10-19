import type { Session } from '@crm/shared';

/**
 * O nome da empresa ativa. O super admin, numa empresa sem vínculo, não a tem
 * na sessão: fica o slug.
 */
export function activeTenantName(session: Session, slug: string): string {
  return session.tenants.find((tenant) => tenant.slug === slug)?.name ?? slug;
}
