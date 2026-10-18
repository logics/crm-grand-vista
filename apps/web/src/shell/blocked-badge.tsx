import { Badge } from '@crm/ui';

/** Marca da empresa bloqueada, no seletor e na lista de empresas do usuário. */
export function BlockedBadge() {
  return (
    <Badge size="sm" tone="danger">
      Bloqueada
    </Badge>
  );
}
