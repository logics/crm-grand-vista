import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { initials } from '../lib/initials.js';
import { roundPercent } from '../lib/percent.js';
import { pressable } from '../lib/pressable.js';
import { focusRing, liftOnHover } from '../lib/styles.js';
import { Icon } from './icon.js';
import { ProgressBar } from './progress-bar.js';

// Cartão de oportunidade dentro de uma coluna do funil (o cartão de negociação
// de `components/data/` do export, renomeado para o termo do glossário).
// Próxima atividade atrasada fica em vermelho — é como a negociação estagnada
// aparece no quadro.

export type OpportunityCardProps = ComponentProps<'article'> & {
  /** Comprador ou investidor: o título do cartão. */
  client: ReactNode;
  /** Fazenda candidata, ou "3 fazendas" quando são várias. */
  farm?: ReactNode;
  /** Valor potencial, já formatado em pt-BR. */
  value?: ReactNode;
  /** Probabilidade de fechamento, de 0 a 100. */
  probability?: number;
  /** Corretor responsável: nome (vira iniciais) ou um nó pronto. */
  owner?: ReactNode;
  /** Próxima atividade, como "Visita técnica · 28/07". */
  nextAction?: ReactNode;
  /** Próxima atividade atrasada: negociação estagnada. */
  overdue?: boolean;
};

export function OpportunityCard({
  className,
  client,
  farm,
  value,
  probability,
  owner,
  nextAction,
  overdue = false,
  onClick,
  onKeyDown,
  ...props
}: OpportunityCardProps) {
  const hasProbability = typeof probability === 'number';
  return (
    <article
      data-slot="opportunity-card"
      className={cn(
        // 10px de vão e 14px de respiro do export, somados dos tokens
        'flex flex-col gap-[calc(var(--space-4)+var(--space-1))] p-[calc(var(--space-5)+var(--space-1))]',
        'rounded-md bg-surface-card text-text-body shadow-sm',
        onClick && [liftOnHover, 'hover:shadow-md', focusRing],
        className,
      )}
      {...pressable({ onClick, onKeyDown })}
      {...props}
    >
      <div>
        <div className="text-sm font-semibold leading-snug text-text-heading">{client}</div>
        {farm && (
          <div className="mt-1 flex items-center gap-2 text-xs text-text-faint">
            <Icon name="tractor" size="sm" />
            {farm}
          </div>
        )}
      </div>
      {(value || hasProbability) && (
        <div className="flex items-baseline justify-between gap-4">
          {value && <span className="gv-num text-h3 font-semibold tracking-heading">{value}</span>}
          {hasProbability && (
            <span className="gv-num text-xs text-text-muted">{roundPercent(probability)}%</span>
          )}
        </div>
      )}
      {hasProbability && <ProgressBar value={probability} tone="gold" height="sm" aria-label="Probabilidade" />}
      {(nextAction || owner) && (
        <div
          className={cn(
            'flex items-center gap-4 border-t border-border-subtle pt-[calc(var(--space-4)+var(--space-1))] text-xs',
            overdue ? 'text-status-danger-fg' : 'text-text-muted',
          )}
        >
          {nextAction && (
            <>
              <Icon name={overdue ? 'alert-circle' : 'calendar-clock'} size="sm" />
              <span className="min-w-0 flex-1 truncate">{nextAction}</span>
            </>
          )}
          {owner && <OwnerAvatar owner={owner} />}
        </div>
      )}
    </article>
  );
}

/** Iniciais do corretor responsável num círculo verde, com o nome na dica. */
function OwnerAvatar({ owner }: { owner: ReactNode }) {
  if (typeof owner !== 'string') return <span className="ml-auto">{owner}</span>;
  return (
    <span
      title={owner}
      // 26px do export, somado dos tokens
      className="ml-auto grid size-[calc(var(--space-8)+var(--space-1))] shrink-0 place-items-center rounded-pill bg-brand-primary-soft text-label font-semibold text-brand-primary"
    >
      {initials(owner)}
    </span>
  );
}
