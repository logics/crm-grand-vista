import { DUPLICATE_REASON_LABELS, type ContactDuplicate } from '@crm/shared';
import { DuplicateWarning, type DuplicateWarningLink } from '@crm/ui';
import { Link } from 'react-router';
import { tenantPath } from '../../shell/tenant-path.js';
import { useTenantSlug } from '../../shell/tenant-query.js';

/** Entrega o `href` do Design System ao roteador, que navega por `to`. */
const RouterLink: DuplicateWarningLink = ({ href, ...props }) => <Link to={href} {...props} />;

interface ContactDuplicateWarningProps {
  matches: readonly ContactDuplicate[];
  onSaveAnyway: () => void;
  form?: string;
  disabled?: boolean;
}

/** `DuplicateWarning` do Design System com os textos e os links de contatos. */
export function ContactDuplicateWarning({ matches, ...rest }: ContactDuplicateWarningProps) {
  const slug = useTenantSlug();
  return (
    <DuplicateWarning
      {...rest}
      title={
        matches.length === 1
          ? 'Já existe um contato parecido com este. Confira antes de salvar.'
          : 'Já existem contatos parecidos com este. Confira antes de salvar.'
      }
      label="Possível contato duplicado"
      linkComponent={RouterLink}
      items={matches.map((match) => ({
        id: match.id,
        label: match.name,
        reasons: match.reasons.map((reason) => DUPLICATE_REASON_LABELS[reason]),
        href: tenantPath(slug, `contacts/${match.id}`),
      }))}
    />
  );
}
