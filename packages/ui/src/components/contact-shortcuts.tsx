import { mailtoUrl, telUrl, whatsappUrl } from '@crm/shared';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn.js';
import { controlTone, focusRing } from '../lib/styles.js';
import { Icon, type IconName } from './icon.js';

// Atalhos de contato: WhatsApp (`wa.me`, em nova aba — no computador cai no
// WhatsApp Desktop ou no Web), ligar (`tel:`) e e-mail (`mailto:`). Servem à
// linha da lista, ao cartão do mobile e ao cabeçalho da ficha. Só aparece o
// atalho do que o contato tem. O clique não sobe: a linha ou o cartão que
// contém os atalhos também é clicável, e o atalho não deve abrir a ficha.

export interface ContactShortcutsProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** Nome do contato, para o nome acessível de cada atalho. */
  name: string;
  /** Telefone e WhatsApp no formato gravado (`+5564999990000`). */
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
}

const shortcutClass = cn(
  'inline-flex size-control-height-sm shrink-0 items-center justify-center rounded-pill transition-control',
  controlTone.ghost,
  'hover:bg-surface-sunken hover:text-text-body',
  focusRing,
);

function Shortcut({ icon, label, ...props }: Omit<ComponentProps<'a'>, 'children'> & { icon: IconName; label: string }) {
  return (
    <a
      className={shortcutClass}
      aria-label={label}
      title={label}
      {...props}
      onClick={(event) => {
        event.stopPropagation();
        props.onClick?.(event);
      }}
    >
      <Icon name={icon} size="sm" />
    </a>
  );
}

export function ContactShortcuts({ name, phone, whatsapp, email, className, ...props }: ContactShortcutsProps) {
  if (!phone && !whatsapp && !email) return null;
  return (
    <span data-slot="contact-shortcuts" className={cn('inline-flex items-center gap-1', className)} {...props}>
      {whatsapp && (
        <Shortcut
          icon="message-circle"
          label={`WhatsApp de ${name}`}
          href={whatsappUrl(whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
        />
      )}
      {phone && <Shortcut icon="phone" label={`Ligar para ${name}`} href={telUrl(phone)} />}
      {email && <Shortcut icon="mail" label={`Enviar e-mail para ${name}`} href={mailtoUrl(email)} />}
    </span>
  );
}
