import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn.js';

// Cabeçalho branco de 64px sobre toda vista do CRM (`TopBar.jsx` do export):
// trilha e título à esquerda, busca no centro-direita, ações à direita.

export type TopBarProps = Omit<ComponentProps<'header'>, 'title'> & {
  /** Título da página, o `h1` da vista. */
  title?: ReactNode;
  /** Linha de contexto cinza acima do título, como "Comercial · Fazendas". */
  breadcrumb?: ReactNode;
  /** Espaço para um `Input` ou `SearchBar`. */
  search?: ReactNode;
  /** À direita: `Button`s, `IconButton`s, o usuário. */
  actions?: ReactNode;
};

export function TopBar({ className, title, breadcrumb, search, actions, ...props }: TopBarProps) {
  const heading = title || breadcrumb;
  return (
    <header
      data-slot="top-bar"
      className={cn(
        'flex h-topbar-height shrink-0 items-center gap-6 rounded-card bg-surface-card pr-5 pl-7 shadow-sm',
        className,
      )}
      {...props}
    >
      {heading && (
        <div className="flex min-w-0 flex-col gap-1">
          {breadcrumb && <span className="whitespace-nowrap text-xs text-text-faint">{breadcrumb}</span>}
          {title && (
            <h1 className="truncate text-lg font-semibold leading-snug tracking-tight text-text-heading">{title}</h1>
          )}
        </div>
      )}
      {search && (
        // 340px de base do export (8,5 × --space-10)
        <div className={cn('min-w-0 shrink grow-0 basis-[calc(8.5*var(--space-10))]', heading && 'ml-auto')}>
          {search}
        </div>
      )}
      <div className="ml-auto flex items-center gap-4">{actions}</div>
    </header>
  );
}
