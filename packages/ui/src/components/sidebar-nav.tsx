import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { focusRing } from '../lib/styles.js';
import { Icon, type IconName } from './icon.js';
import { Wordmark } from './wordmark.js';

// Navegação lateral do CRM, um cartão branco flutuante (`SidebarNav.jsx` do
// export). Item ativo é a pílula verde profunda com texto branco. Na faixa do
// trilho (760–1180px), `collapsed` deixa só os ícones, em 76px; no mobile, a
// tela troca a navegação por uma barra de abas.
//
// A marca vem pelo `Wordmark`, só tipográfico. No trilho não cabe a assinatura:
// fica a sigla "GV" em Jost — letras, não o monograma, que não é aproximado.

export type SidebarNavLink = {
  id: string;
  label: ReactNode;
  icon: IconName;
  /** Contador à direita. */
  badge?: number | string;
};

/** Rótulo cinza de grupo; no trilho, vira um filete. */
export type SidebarNavSection = { section: string };

export type SidebarNavItem = SidebarNavLink | SidebarNavSection;

export type SidebarNavProps = Omit<ComponentProps<'nav'>, 'onSelect'> & {
  items: SidebarNavItem[];
  /** Id do item ativo. */
  active?: string;
  onSelect?: (id: string) => void;
  /** Pé do cartão: avatar, nome e cargo. */
  footer?: ReactNode;
  /** Trilho só de ícones, 76px. */
  collapsed?: boolean;
};

export function SidebarNav({
  className,
  items,
  active,
  onSelect,
  footer,
  collapsed = false,
  'aria-label': ariaLabel = 'Navegação principal',
  ...props
}: SidebarNavProps) {
  return (
    <nav
      data-slot="sidebar-nav"
      data-collapsed={collapsed || undefined}
      aria-label={ariaLabel}
      className={cn(
        'flex min-h-0 shrink-0 flex-col overflow-hidden rounded-card bg-surface-card shadow-sm',
        collapsed ? 'w-sidebar-width-collapsed' : 'w-sidebar-width',
        className,
      )}
      {...props}
    >
      <div className={cn('flex', collapsed ? 'justify-center pt-6 pb-5' : 'px-7 pt-7 pb-6')}>
        {collapsed ? (
          <span
            aria-label="Grand Vista"
            role="img"
            className="grid size-10 place-items-center rounded-nav bg-brand-primary font-display text-body font-medium leading-none tracking-wide text-brand-accent-soft"
          >
            GV
          </span>
        ) : (
          <Wordmark size="body" />
        )}
      </div>
      <ul className={cn('flex flex-1 flex-col gap-1 overflow-y-auto pt-2', collapsed ? 'px-4 pb-4' : 'px-5 pb-5')}>
        {items.map((item) =>
          'section' in item ? (
            collapsed ? (
              <li key={item.section} aria-hidden className="mx-4 my-4 h-px bg-border-subtle" />
            ) : (
              <li key={item.section} className="px-5 pt-6 pb-3 text-micro text-text-faint">
                {item.section}
              </li>
            )
          ) : (
            <li key={item.id}>
              <SidebarNavButton
                item={item}
                active={active === item.id}
                collapsed={collapsed}
                onSelect={onSelect}
              />
            </li>
          ),
        )}
      </ul>
      {footer && (
        <div
          className={cn(
            // 14px de respiro do export, somado dos tokens
            'flex items-center gap-4 border-t border-border-subtle p-[calc(var(--space-5)+var(--space-1))]',
            collapsed && 'justify-center',
          )}
        >
          {footer}
        </div>
      )}
    </nav>
  );
}

type SidebarNavButtonProps = {
  item: SidebarNavLink;
  active: boolean;
  collapsed: boolean;
  onSelect?: (id: string) => void;
};

function SidebarNavButton({ item, active, collapsed, onSelect }: SidebarNavButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(item.id)}
      aria-current={active ? 'page' : undefined}
      title={collapsed && typeof item.label === 'string' ? item.label : undefined}
      className={cn(
        'flex h-control-height w-full cursor-pointer items-center gap-5 rounded-nav text-left text-body leading-none transition-control',
        collapsed ? 'justify-center' : 'px-5',
        active
          ? 'bg-surface-inverse text-text-on-inverse shadow-nav-active'
          : 'text-text-muted hover:bg-surface-sunken hover:text-text-body',
        focusRing,
      )}
    >
      <Icon name={item.icon} size="lg" />
      {/* no trilho, o rótulo sai da tela mas segue nomeando o botão */}
      <span className={cn(collapsed ? 'sr-only' : 'flex-1 truncate')}>{item.label}</span>
      {!collapsed && item.badge != null && (
        <span className={cn('gv-num text-micro', active ? 'text-text-on-inverse/60' : 'text-text-faint')}>
          {item.badge}
        </span>
      )}
    </button>
  );
}
