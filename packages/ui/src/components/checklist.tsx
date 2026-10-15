import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { Badge, type BadgeProps } from './badge.js';
import { Icon, type IconName } from './icon.js';
import { ProgressBar } from './progress-bar.js';

// Checklists de due diligence (jurídico, ambiental, fundiário, fiscal,
// documental) em dois níveis: `ChecklistItem` é a linha (`ChecklistItem.jsx`
// do export) e `ChecklistPanel` o painel que agrupa as linhas, com a contagem e
// a barra de conclusão — o painel não tem `.jsx` no export; segue o bloco de
// due diligence da gaveta da fazenda do kit `crm-v2`.

const checklistState = {
  ok: { icon: 'check', name: 'Concluído', box: 'bg-status-success-bg text-status-success-fg', badge: 'success' },
  pending: { icon: 'clock', name: 'Pendente', box: 'bg-status-warning-bg text-status-warning-fg', badge: 'warning' },
  blocked: {
    icon: 'alert-triangle',
    name: 'Impedimento',
    box: 'bg-status-danger-bg text-status-danger-fg',
    badge: 'danger',
  },
  empty: { icon: 'minus', name: 'Não iniciado', box: 'bg-surface-sunken text-text-faint', badge: 'warning' },
} as const satisfies Record<string, { icon: IconName; name: string; box: string; badge: BadgeProps['tone'] }>;

export type ChecklistItemProps = ComponentProps<'li'> & {
  label: ReactNode;
  /** Segunda linha: responsável, data, referência do documento. */
  meta?: ReactNode;
  /** ok concluído · pending aguardando · blocked impedimento · empty não iniciado */
  state?: keyof typeof checklistState;
  /** Texto vira um `Badge` no tom do estado; um nó vai como está. */
  badge?: ReactNode;
  /** Fim da linha, em geral um `IconButton`. */
  action?: ReactNode;
};

/** Linha de checklist; vai dentro de um `ChecklistPanel` (ou de outra lista). */
export function ChecklistItem({
  className,
  label,
  meta,
  state = 'empty',
  badge,
  action,
  ...props
}: ChecklistItemProps) {
  const stateConfig = checklistState[state];
  return (
    <li
      data-slot="checklist-item"
      data-state={state}
      className={cn('flex items-center gap-5 border-b border-border-subtle py-5 last:border-b-0', className)}
      {...props}
    >
      <span className={cn('grid size-8 shrink-0 place-items-center rounded-sm', stateConfig.box)}>
        <Icon name={stateConfig.icon} size="sm" title={stateConfig.name} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-snug text-text-body">{label}</span>
        {meta && <span className="block text-xs leading-snug text-text-faint">{meta}</span>}
      </span>
      {typeof badge === 'string' ? <Badge tone={stateConfig.badge}>{badge}</Badge> : badge}
      {action}
    </li>
  );
}

export type ChecklistPanelProps = Omit<ComponentProps<'section'>, 'title'> & {
  /** Nome do checklist: "Due diligence", "Jurídico". */
  title: ReactNode;
  /** Itens concluídos; com `total`, mostra "N de M" e a barra de conclusão. */
  done?: number;
  total?: number;
  /** À direita do título, como um botão de adicionar item. */
  action?: ReactNode;
  /** `ChecklistItem`s. */
  children?: ReactNode;
};

export function ChecklistPanel({
  className,
  title,
  done = 0,
  total,
  action,
  children,
  ...props
}: ChecklistPanelProps) {
  const counted = typeof total === 'number' && total > 0;
  const progress = `${done} de ${total}`;
  return (
    <section data-slot="checklist-panel" className={cn('flex flex-col gap-4', className)} {...props}>
      <header className="flex items-center justify-between gap-5">
        <h4 className="text-sm font-semibold text-text-heading">
          {title}
          {counted && (
            <span className="font-regular text-text-faint">
              {' · '}
              <span className="gv-num">{progress}</span>
            </span>
          )}
        </h4>
        {action}
      </header>
      {counted && (
        <ProgressBar
          value={(done / total) * 100}
          tone="gold"
          height="sm"
          aria-label={typeof title === 'string' ? title : 'Conclusão'}
        />
      )}
      <ul className="flex flex-col">{children}</ul>
    </section>
  );
}
