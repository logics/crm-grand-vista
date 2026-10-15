import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { focusRing } from '../lib/styles.js';
import { Icon } from './icon.js';

// Onde uma oportunidade está nas 10 etapas do funil (`StageStepper.jsx` do
// export). Concluída = barra verde com visto; atual = barra dourada; seguintes
// = cinza. Em coluna estreita (painel lateral, cartão), `compact`: a versão com
// rótulos pede uns 960px.

type StageState = 'done' | 'current' | 'upcoming';

const stageState = (index: number, current: number): StageState =>
  index < current ? 'done' : index === current ? 'current' : 'upcoming';

const stageBar = {
  done: 'bg-brand-primary-2',
  current: 'bg-brand-accent',
  upcoming: 'bg-border-subtle',
} as const satisfies Record<StageState, string>;

const stageLabel = {
  done: 'font-regular text-text-muted',
  current: 'font-medium text-text-heading',
  upcoming: 'font-regular text-text-faint',
} as const satisfies Record<StageState, string>;

export type StageStepperProps = ComponentProps<'div'> & {
  /** Rótulos das etapas, em ordem. */
  stages: ReactNode[];
  /** Índice da etapa atual, a partir de 0; as anteriores aparecem concluídas. */
  current?: number;
  /** Torna cada etapa um botão que entrega o índice. */
  onSelect?: (index: number) => void;
  /** Só as barras, com a etapa atual e "etapa N de M" embaixo. */
  compact?: boolean;
};

export function StageStepper({
  className,
  stages,
  current = 0,
  onSelect,
  compact = false,
  ...props
}: StageStepperProps) {
  return (
    <div
      data-slot="stage-stepper"
      className={cn(compact ? 'flex flex-col gap-4' : 'overflow-x-auto', className)}
      {...props}
    >
      <ol className="flex gap-1">
        {stages.map((stage, index) => {
          const state = stageState(index, current);
          const bar = <span aria-hidden className={cn('block h-2 w-full rounded-pill', stageBar[state])} />;
          return (
            <li
              key={index}
              data-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
              className={cn('min-w-0 flex-1', !compact && 'min-w-13')}
            >
              <StageSlot
                onSelect={onSelect && (() => onSelect(index))}
                // compacto, a etapa só tem a barra: o rótulo vira o nome do botão e a dica
                label={compact ? stage : undefined}
                className={compact ? 'py-1' : 'flex flex-col gap-3'}
              >
                {bar}
                {!compact && (
                  <span className={cn('inline-flex items-center gap-2 text-micro leading-snug', stageLabel[state])}>
                    {state === 'done' && <Icon name="check" size="xs" />}
                    {stage}
                  </span>
                )}
              </StageSlot>
            </li>
          );
        })}
      </ol>
      {compact && (
        <div className="flex items-baseline justify-between gap-5">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-text-heading">
            <Icon name="chevron-right" size="sm" className="text-brand-accent" />
            {stages[current]}
          </span>
          <span className="gv-num whitespace-nowrap text-micro text-text-faint">
            etapa {current + 1} de {stages.length}
          </span>
        </div>
      )}
    </div>
  );
}

type StageSlotProps = {
  onSelect?: () => void;
  label?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** A etapa: botão quando há `onSelect`, só leitura quando não há. */
function StageSlot({ onSelect, label, className, children }: StageSlotProps) {
  const name = typeof label === 'string' ? label : undefined;
  if (!onSelect) {
    return (
      <span title={name} className={cn('block', className)}>
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={name}
      title={name}
      className={cn('block w-full cursor-pointer rounded-xs text-left', focusRing, className)}
    >
      {children}
    </button>
  );
}
