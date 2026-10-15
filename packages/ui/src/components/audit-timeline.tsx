import type { ComponentProps, Key, ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { orEmDash } from '../lib/em-dash.js';
import { Icon, type IconName } from './icon.js';

// Histórico de alterações (a linha do tempo de `components/data/` do export,
// renomeada: é a vista da auditoria). Uma entrada por alteração salva — as
// linhas de `audit_log` de um mesmo `change_id` —, mais nova primeiro, na ordem
// recebida. Cada campo alterado mostra o valor anterior e o novo; o rótulo e a
// formatação chegam prontos, dos metadados de campo. O `kind` do export
// (visita, ligação, reunião…) era tipo de atividade da agenda, não de
// alteração: aqui o glifo é escolhido por entrada.

/** Um campo alterado: rótulo legível e os valores já formatados. */
export type AuditTimelineChange = {
  field: ReactNode;
  /** Valor anterior; vazio vira travessão. */
  from?: ReactNode;
  /** Valor novo; vazio vira travessão. */
  to?: ReactNode;
};

export type AuditTimelineItem = {
  /** Chave da entrada, como o `change_id`; sem ela, vale a posição. */
  id?: Key;
  /** O que aconteceu: "Preço pedido alterado", "Fazenda cadastrada". */
  title: ReactNode;
  /** Instante curto em pt-BR, como "24/07 · 14h30". */
  date?: ReactNode;
  /** Quem salvou. */
  author?: ReactNode;
  /** Observação em texto livre. */
  detail?: ReactNode;
  changes?: AuditTimelineChange[];
  /** Glifo do marcador; lápis por padrão. */
  icon?: IconName;
};

export type AuditTimelineProps = ComponentProps<'ol'> & {
  items: AuditTimelineItem[];
};

export function AuditTimeline({ className, items, ...props }: AuditTimelineProps) {
  return (
    <ol data-slot="audit-timeline" className={cn('flex flex-col', className)} {...props}>
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <li key={item.id ?? index} className="flex gap-5">
            <div aria-hidden className="flex shrink-0 flex-col items-center">
              {/* 26px do export, somado dos tokens */}
              <span className="grid size-[calc(var(--space-8)+var(--space-1))] place-items-center rounded-pill bg-brand-primary-soft text-brand-primary inset-ring inset-ring-brand-primary-tint">
                <Icon name={item.icon ?? 'pencil'} size="xs" />
              </span>
              {!last && <span className="w-px flex-1 bg-border-default" />}
            </div>
            <div className={cn('min-w-0', !last && 'pb-7')}>
              <div className="flex flex-wrap items-baseline gap-x-5">
                <span className="text-sm font-medium leading-snug text-text-body">{item.title}</span>
                {item.date && <span className="gv-num text-micro text-text-faint">{item.date}</span>}
              </div>
              {item.detail && <p className="mt-1 text-xs leading-normal text-text-muted">{item.detail}</p>}
              {item.changes && item.changes.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1 text-xs leading-normal">
                  {item.changes.map((change, changeIndex) => (
                    <li key={changeIndex} className="flex flex-wrap items-center gap-x-3">
                      <span className="text-text-muted">{change.field}</span>
                      <del className="gv-num text-text-faint">{orEmDash(change.from)}</del>
                      <Icon name="arrow-right" size="xs" className="text-text-faint" />
                      <ins className="gv-num font-medium text-text-body no-underline">{orEmDash(change.to)}</ins>
                    </li>
                  ))}
                </ul>
              )}
              {item.author && <span className="text-micro text-text-faint">{item.author}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
