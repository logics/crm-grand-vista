import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { Badge } from './badge.js';
import { Icon, type IconName } from './icon.js';

// Indicador do dashboard (`StatCard.jsx` do export): rótulo cinza, valor em
// 30 semibold com algarismos tabulares, pílula de variação. `hero` em no máximo
// um cartão por linha. Valores chegam já formatados em pt-BR.

const statTone = {
  default: {
    surface: 'bg-surface-card shadow-sm',
    fg: 'text-text-heading',
    sub: 'text-text-muted',
    faint: 'text-text-faint',
    chip: 'bg-surface-sunken text-text-muted',
  },
  hero: {
    surface: 'bg-gradient-hero shadow-hero',
    fg: 'text-text-on-inverse',
    sub: 'text-text-on-inverse/72',
    faint: 'text-text-on-inverse/60',
    chip: 'bg-text-on-inverse/14 text-text-on-inverse',
  },
  dark: {
    surface: 'bg-surface-inverse shadow-hero',
    fg: 'text-text-on-inverse',
    sub: 'text-text-on-inverse/72',
    faint: 'text-text-on-inverse/60',
    chip: 'bg-text-on-inverse/12 text-text-on-inverse',
  },
  // o export dá ao dourado uma sombra dourada que não tem token; fica sem sombra, como o `Button`
  gold: {
    surface: 'bg-gradient-gold',
    fg: 'text-brand-on-accent',
    sub: 'text-brand-on-accent/72',
    faint: 'text-brand-on-accent/60',
    chip: 'bg-brand-on-accent/10 text-brand-on-accent',
  },
} as const;

const deltaIcon = {
  success: 'arrow-up-right',
  danger: 'arrow-down-right',
  neutral: 'arrow-right',
} as const satisfies Record<string, IconName>;

export type StatCardProps = ComponentProps<'div'> & {
  /** Rótulo em sentence case, como "Valor em negociação". */
  label: ReactNode;
  /** Valor já formatado em pt-BR ("R$ 48,2 mi"). */
  value: ReactNode;
  /** Unidade depois do valor: "fazendas", "dias". */
  unit?: ReactNode;
  /** Texto da pílula de variação, como "+12% no mês". */
  delta?: ReactNode;
  deltaTone?: keyof typeof deltaIcon;
  /** Glifo no círculo do canto. */
  icon?: IconName;
  /** Quebra do valor em linhas de rótulo e valor. */
  rows?: { label: ReactNode; value: ReactNode }[];
  footnote?: ReactNode;
  /** default branco · hero gradiente verde · dark verde profundo · gold gradiente dourado */
  tone?: keyof typeof statTone;
};

export function StatCard({
  className,
  label,
  value,
  unit,
  delta,
  deltaTone = 'success',
  icon,
  rows,
  footnote,
  tone = 'default',
  ...props
}: StatCardProps) {
  const toneClasses = statTone[tone];
  const filled = tone !== 'default';
  return (
    <div
      data-slot="stat-card"
      data-tone={tone}
      className={cn(
        // 14px de vão e 18px de respiro vertical do export, somados dos tokens
        'flex min-w-0 flex-col gap-[calc(var(--space-5)+var(--space-1))] rounded-card',
        'px-gutter-card py-[calc(var(--space-6)+var(--space-1))]',
        toneClasses.surface,
        toneClasses.fg,
        className,
      )}
      {...props}
    >
      <div className={cn('flex items-center justify-between gap-5 text-sm', toneClasses.sub)}>
        <span>{label}</span>
        {icon && (
          <span className={cn('grid size-9 place-items-center rounded-pill', toneClasses.chip)}>
            <Icon name={icon} size="md" />
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-[calc(var(--space-4)+var(--space-1))]">
        <span className="inline-flex items-baseline gap-3 whitespace-nowrap">
          <span className="gv-num text-h1 font-semibold leading-none tracking-display">{value}</span>
          {unit && <span className={cn('text-sm', toneClasses.sub)}>{unit}</span>}
        </span>
        {delta && (
          <Badge size="sm" tone={deltaTone} icon={deltaIcon[deltaTone]} className={cn(filled && toneClasses.chip)}>
            {delta}
          </Badge>
        )}
      </div>
      {rows && rows.length > 0 && (
        <dl className={cn('grid grid-cols-[1fr_auto] gap-x-5 gap-y-2 text-xs', toneClasses.faint)}>
          {rows.map((row, index) => (
            <div key={index} className="contents">
              <dt>{row.label}</dt>
              <dd className={cn('gv-num text-right font-medium', toneClasses.fg)}>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {footnote && <span className={cn('text-xs', toneClasses.faint)}>{footnote}</span>}
    </div>
  );
}
