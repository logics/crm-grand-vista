import { type ComponentProps, type ReactNode, useId } from 'react';
import { cn } from '../lib/cn.js';
import { clampPercent } from '../lib/percent.js';

// Trilho fino em pílula (`ProgressBar.jsx` do export): conclusão da due
// diligence, meta de vendas, ocupação do funil.

const progressTone = {
  brand: 'bg-brand-primary',
  gold: 'bg-brand-accent',
  success: 'bg-status-success-fg',
  danger: 'bg-status-danger-fg',
} as const;

/** Espessura do trilho: sm 4 · md 6 (padrão do export) · lg 8. */
const progressHeight = {
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
} as const;

export type ProgressBarProps = ComponentProps<'div'> & {
  /** De 0 a 100; fora disso, fica no limite. */
  value: number;
  /** Rótulo à esquerda; também nomeia a barra para o leitor de tela. */
  label?: ReactNode;
  /** Leitura à direita, como "7 de 12"; em texto, é o que o leitor de tela anuncia. */
  valueLabel?: ReactNode;
  tone?: keyof typeof progressTone;
  height?: keyof typeof progressHeight;
};

export function ProgressBar({
  className,
  value,
  label,
  valueLabel,
  tone = 'brand',
  height = 'md',
  'aria-label': ariaLabel,
  ...props
}: ProgressBarProps) {
  const labelId = useId();
  const percent = clampPercent(value);
  return (
    <div data-slot="progress-bar" className={cn('flex flex-col gap-3', className)} {...props}>
      {(label || valueLabel) && (
        <div className="flex justify-between gap-5 text-xs">
          {label && (
            <span id={labelId} className="text-text-muted">
              {label}
            </span>
          )}
          {valueLabel && <span className="gv-num text-text-body">{valueLabel}</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={typeof valueLabel === 'string' ? valueLabel : undefined}
        aria-label={ariaLabel}
        aria-labelledby={label && !ariaLabel ? labelId : undefined}
        className={cn('overflow-hidden rounded-pill bg-border-subtle', progressHeight[height])}
      >
        <div
          className={cn(
            'h-full rounded-pill transition-[width] duration-slow ease-out motion-reduce:transition-none',
            progressTone[tone],
          )}
          // a largura é o dado, não um valor de estilo: não há token que a substitua
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
