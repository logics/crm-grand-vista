import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { roundPercent } from '../lib/percent.js';

// Mostrador da compatibilidade entre fazenda e comprador (o mostrador de
// matching de `components/data/` do export, renomeado para o termo do
// glossário). É o mesmo componente na lista de matching, na ficha da fazenda e
// na do comprador. As faixas são fixas: 80 ou mais é alta, de 55 a 79 média,
// abaixo disso baixa.

export type CompatibilityLevel = 'high' | 'medium' | 'low';

/** Faixa de um percentual de compatibilidade, já arredondado. */
export function compatibilityLevel(value: number): CompatibilityLevel {
  const percent = roundPercent(value);
  if (percent >= 80) return 'high';
  if (percent >= 55) return 'medium';
  return 'low';
}

const levels = {
  high: { label: 'Alta compatibilidade', text: 'text-compatibility-high', stroke: 'stroke-compatibility-high' },
  medium: { label: 'Compatibilidade média', text: 'text-compatibility-medium', stroke: 'stroke-compatibility-medium' },
  low: { label: 'Compatibilidade baixa', text: 'text-compatibility-low', stroke: 'stroke-compatibility-low' },
} as const satisfies Record<CompatibilityLevel, unknown>;

/** Diâmetro do anel e corpo do número: sm 34 · md 44 · lg 60 (o 17 do export vira 16). */
const gaugeSize = {
  sm: { ring: 'size-[calc(var(--space-9)+var(--space-1))]', number: 'text-micro' },
  md: { ring: 'size-hit-target', number: 'text-sm' },
  lg: { ring: 'size-[calc(var(--space-11)+var(--space-2))]', number: 'text-lg' },
} as const;

/** Raio que dá ao anel um perímetro de 100: o traço desenhado é o próprio percentual. */
const ringRadius = 100 / (2 * Math.PI);

export type CompatibilityGaugeProps = ComponentProps<'div'> & {
  /** De 0 a 100; fora disso, fica no limite. */
  value: number;
  size?: keyof typeof gaugeSize;
  /** Sem o texto ao lado, para caber numa célula de tabela. */
  showLabel?: boolean;
  /** Linha sob a faixa: os critérios que pesaram, que as regras de matching da empresa definem. */
  description?: ReactNode;
};

export function CompatibilityGauge({
  className,
  value,
  size = 'md',
  showLabel = true,
  description = 'Matching por região, área e ticket',
  'aria-label': ariaLabel = 'Compatibilidade',
  ...props
}: CompatibilityGaugeProps) {
  const percent = roundPercent(value);
  const level = levels[compatibilityLevel(percent)];
  const { ring, number } = gaugeSize[size];
  return (
    <div
      data-slot="compatibility-gauge"
      role="meter"
      aria-label={ariaLabel}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${percent}% · ${level.label}`}
      className={cn('inline-flex items-center gap-5', className)}
      {...props}
    >
      <span aria-hidden className={cn('relative grid shrink-0 place-items-center', ring)}>
        <svg viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90">
          <circle cx="18" cy="18" r={ringRadius} fill="none" strokeWidth="3" className="stroke-border-subtle" />
          <circle
            cx="18"
            cy="18"
            r={ringRadius}
            fill="none"
            strokeWidth="3"
            strokeDasharray={`${percent} 100`}
            className={level.stroke}
          />
        </svg>
        <span className={cn('gv-num font-medium leading-none', number, level.text)}>{percent}</span>
      </span>
      {showLabel && (
        <span aria-hidden className="flex flex-col">
          <span className="text-sm font-medium leading-snug text-text-body">{level.label}</span>
          {description && <span className="text-xs leading-snug text-text-faint">{description}</span>}
        </span>
      )}
    </div>
  );
}
