import { Children, type ComponentProps, type ReactNode, useId } from 'react';
import { cn } from '../lib/cn.js';
import { focusRing } from '../lib/styles.js';

// Funil comercial em dois níveis: `PipelineColumn` é uma etapa
// (`PipelineColumn.jsx` do export) e `KanbanBoard` o quadro que as põe lado a
// lado, rolando na horizontal — o quadro não tem `.jsx` no export; segue o
// `.a2-board` do kit `crm-v2`. No mobile o kit troca o quadro por um seletor de
// etapa com uma lista só; essa troca é da tela do funil, não daqui.

/** Cor de cada uma das 10 etapas do funil (`--stage-N`), pelo índice. */
const stageDot = {
  1: 'bg-stage-1',
  2: 'bg-stage-2',
  3: 'bg-stage-3',
  4: 'bg-stage-4',
  5: 'bg-stage-5',
  6: 'bg-stage-6',
  7: 'bg-stage-7',
  8: 'bg-stage-8',
  9: 'bg-stage-9',
  10: 'bg-stage-10',
} as const;

export type StageIndex = keyof typeof stageDot;

export type PipelineColumnProps = ComponentProps<'section'> & {
  /** Nome da etapa, como "Due diligence". */
  stage: ReactNode;
  /** De 1 a 10: escolhe a cor da etapa. */
  index?: StageIndex;
  /** Quantas oportunidades há na etapa. */
  count?: number;
  /** Valor somado da etapa, já formatado ("R$ 42,1 mi"). */
  total?: ReactNode;
  /** `OpportunityCard`s; sem nenhum, a coluna diz que está vazia. */
  children?: ReactNode;
};

export function PipelineColumn({
  className,
  stage,
  index = 1,
  count,
  total,
  children,
  ...props
}: PipelineColumnProps) {
  const headingId = useId();
  return (
    <section
      data-slot="pipeline-column"
      aria-labelledby={headingId}
      className={cn(
        // 296px do export (9 × --space-9 + --space-4)
        'flex w-[calc(9*var(--space-9)+var(--space-4))] min-w-0 shrink-0 flex-col gap-4 rounded-lg bg-surface-muted p-4',
        className,
      )}
      {...props}
    >
      <header className="flex items-center gap-4 px-4 pt-4 pb-3 text-sm font-semibold leading-tight text-text-heading">
        <span aria-hidden className={cn('size-4 shrink-0 rounded-pill', stageDot[index])} />
        <h3 id={headingId} className="min-w-0 truncate">
          {stage}
        </h3>
        {typeof count === 'number' && (
          <span className="gv-num rounded-pill bg-surface-card px-3 py-px text-micro font-medium text-text-faint">
            {count}
          </span>
        )}
        {total && (
          <span className="gv-num ml-auto whitespace-nowrap text-xs font-medium text-text-muted">{total}</span>
        )}
      </header>
      <div className="flex min-h-13 flex-col gap-4">
        {Children.count(children) > 0 ? (
          children
        ) : (
          <p className="px-4 py-7 text-center text-xs text-text-faint">Nenhuma oportunidade</p>
        )}
      </div>
    </section>
  );
}

export type KanbanBoardProps = ComponentProps<'div'> & {
  /** `PipelineColumn`s, uma por etapa. */
  children?: ReactNode;
};

/** Quadro do funil: as colunas lado a lado, rolando na horizontal (e pelo teclado). */
export function KanbanBoard({
  className,
  children,
  'aria-label': ariaLabel = 'Funil comercial',
  ...props
}: KanbanBoardProps) {
  return (
    <div
      data-slot="kanban-board"
      role="region"
      aria-label={ariaLabel}
      // região rolável precisa de foco para rolar pelo teclado
      tabIndex={0}
      className={cn('flex items-start gap-gap-shell overflow-x-auto px-1 pt-1 pb-5', focusRing, className)}
      {...props}
    >
      {children}
    </div>
  );
}
