import { CONTACT_ROLE_LABELS, DUPLICATE_REASON_LABELS, type ContactDuplicate } from '@crm/shared';
import { Button, Icon } from '@crm/ui';
import { tenantPath } from '../../shell/tenant-path.js';
import { TextLink } from '../../shell/text-link.js';
import { useTenantSlug } from '../../shell/tenant-query.js';

interface DuplicateWarningProps {
  matches: readonly ContactDuplicate[];
  /** Confirma o cadastro apesar do aviso. É aviso, não bloqueio. */
  onSaveAnyway: () => void;
  /** Envia o botão por este formulário, quando ele fica fora dele (`form` do botão). */
  form?: string;
  disabled?: boolean;
}

/**
 * Aviso de contato duplicado: lista quem coincide, com o motivo e o link para o
 * cadastro, e oferece "Salvar mesmo assim". Serve ao formulário completo e ao
 * diálogo de cadastro rápido; quem o usa decide o que "salvar" faz.
 */
export function DuplicateWarning({ matches, onSaveAnyway, form, disabled }: DuplicateWarningProps) {
  const slug = useTenantSlug();
  if (matches.length === 0) return null;
  return (
    <div
      role="alert"
      aria-label="Possível contato duplicado"
      className="flex flex-col gap-4 rounded-input bg-status-warning-bg px-6 py-5 text-sm text-status-warning-fg"
    >
      <div className="flex items-start gap-4">
        <Icon name="alert-circle" size="md" />
        <p>
          {matches.length === 1
            ? 'Já existe um contato parecido com este. Confira antes de salvar.'
            : 'Já existem contatos parecidos com este. Confira antes de salvar.'}
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {matches.map((match) => (
          <li key={match.id} className="flex flex-wrap items-baseline gap-x-3">
            <TextLink to={tenantPath(slug, `contacts/${match.id}`)} target="_blank">
              {match.name}
            </TextLink>
            <span>{match.reasons.map((reason) => DUPLICATE_REASON_LABELS[reason]).join(', ')}</span>
            <span className="opacity-80">{match.roles.map((role) => CONTACT_ROLE_LABELS[role]).join(', ')}</span>
          </li>
        ))}
      </ul>
      <div>
        <Button type={form ? 'submit' : 'button'} form={form} variant="secondary" disabled={disabled} onClick={onSaveAnyway}>
          Salvar mesmo assim
        </Button>
      </div>
    </div>
  );
}
