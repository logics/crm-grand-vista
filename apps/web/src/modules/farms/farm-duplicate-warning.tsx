import { FARM_DUPLICATE_REASON_LABELS, type FarmDuplicate } from '@crm/shared';
import { DuplicateWarning, type DuplicateWarningLink } from '@crm/ui';
import { Link } from 'react-router';
import { tenantPath } from '../../shell/tenant-path.js';
import { useTenantSlug } from '../../shell/tenant-query.js';

/** Entrega o `href` do Design System ao roteador, que navega por `to`. */
const RouterLink: DuplicateWarningLink = ({ href, ...props }) => <Link to={href} {...props} />;

interface FarmDuplicateWarningProps {
  matches: readonly FarmDuplicate[];
  onSaveAnyway: () => void;
  form?: string;
  disabled?: boolean;
}

/** `DuplicateWarning` do Design System com os textos e os links de fazendas. */
export function FarmDuplicateWarning({ matches, ...rest }: FarmDuplicateWarningProps) {
  const slug = useTenantSlug();
  return (
    <DuplicateWarning
      {...rest}
      title={
        matches.length === 1
          ? 'Já existe uma fazenda com este nome neste município. Confira antes de salvar.'
          : 'Já existem fazendas com este nome neste município. Confira antes de salvar.'
      }
      label="Possível fazenda duplicada"
      linkComponent={RouterLink}
      items={matches.map((match) => ({
        id: match.id,
        label: match.name,
        reasons: match.reasons.map((reason) => FARM_DUPLICATE_REASON_LABELS[reason]),
        href: tenantPath(slug, `farms/${match.id}`),
      }))}
    />
  );
}
