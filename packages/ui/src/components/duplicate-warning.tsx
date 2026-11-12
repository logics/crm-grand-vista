import type { ComponentType, ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { textLink, warningBanner } from '../lib/styles.js';
import { Button } from './button.js';
import { Icon } from './icon.js';

// Aviso de cadastro duplicado: lista quem coincide, com o motivo e o link para
// o cadastro, e oferece "Salvar mesmo assim". É aviso, não bloqueio. Serve a
// contatos e a fazendas; o componente não conhece o roteador, quem usa passa o
// elemento de link.

export type DuplicateWarningItem = {
  id: string;
  /** Como o registro aparece na lista: o nome do contato, o da fazenda. */
  label: ReactNode;
  /** Por que coincide, já em texto para a tela ("Mesmo WhatsApp"). */
  reasons: readonly string[];
  /** Destino do cadastro existente. */
  href: string;
};

/** Elemento de link que o chamador fornece (`Link` do roteador, ou `a`). Recebe o destino em `href`. */
export type DuplicateWarningLink = ComponentType<{
  href: string;
  target?: string;
  rel?: string;
  className?: string;
  children?: ReactNode;
}>;

export type DuplicateWarningProps = {
  /** Frase do aviso, já no singular ou no plural conforme os itens. */
  title: ReactNode;
  /** Rótulo acessível do alerta. */
  label: string;
  items: readonly DuplicateWarningItem[];
  /** Elemento de link dos itens. */
  linkComponent: DuplicateWarningLink;
  /** Confirma o cadastro apesar do aviso. */
  onSaveAnyway: () => void;
  /** Envia o botão por este formulário, quando ele fica fora dele (`form` do botão). */
  form?: string;
  disabled?: boolean;
  className?: string;
};

export function DuplicateWarning({
  title,
  label,
  items,
  linkComponent: LinkElement,
  onSaveAnyway,
  form,
  disabled,
  className,
}: DuplicateWarningProps) {
  if (items.length === 0) return null;
  return (
    <div data-slot="duplicate-warning" role="alert" aria-label={label} className={cn(warningBanner, className)}>
      <div className="flex items-start gap-4">
        <Icon name="alert-circle" size="md" />
        <p>{title}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-baseline gap-x-3">
            <LinkElement href={item.href} target="_blank" rel="noreferrer" className={textLink}>
              {item.label}
            </LinkElement>
            <span>{item.reasons.join(', ')}</span>
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
