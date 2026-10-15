import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn.js';

// Superfície flutuante sem borda, unidade básica de toda tela (`Card.jsx` do
// export): branca, raio de 20, sombra muito suave sobre a pedra, cabeçalho sem
// filete. `hero` (gradiente verde) é um por tela. No mobile, raio e respiro
// encolhem para os tokens `*-mobile`.

const cardTone = {
  default: { surface: 'bg-surface-card text-text-body shadow-sm', hover: 'hover:shadow-md', sub: 'text-text-faint' },
  hero: { surface: 'bg-gradient-hero text-text-on-inverse shadow-hero', hover: '', sub: 'text-text-on-inverse/72' },
  inverse: { surface: 'bg-surface-inverse text-text-on-inverse', hover: '', sub: 'text-text-on-inverse/66' },
  sunken: { surface: 'bg-surface-muted text-text-body', hover: '', sub: 'text-text-faint' },
} as const;

const cardPadding = {
  default: { header: 'px-gutter-card max-mobile:px-gutter-card-mobile', body: 'p-gutter-card max-mobile:p-gutter-card-mobile' },
  /** Sem respiro: para mídia que vai de borda a borda. */
  none: { header: '', body: '' },
} as const;

export type CardProps = Omit<ComponentProps<'section'>, 'title'> & {
  /** Título em 16 semibold; sem ele, a superfície fica nua. */
  title?: ReactNode;
  /** Linha cinza sob o título. */
  subtitle?: ReactNode;
  /** Sobretítulo mono em caixa-alta, acima do título. */
  eyebrow?: ReactNode;
  /** Ação à direita do cabeçalho (Button, IconButton, Tabs). */
  action?: ReactNode;
  /** Respiro do cabeçalho e do corpo: `--gutter-card` (`-mobile` no mobile) ou nenhum. */
  padding?: keyof typeof cardPadding;
  /** default branco · hero gradiente verde (um por tela) · inverse verde profundo · sunken pedra, sem sombra */
  tone?: keyof typeof cardTone;
  /** Destaque ou prioridade: anel dourado fino por dentro. */
  accent?: boolean;
  /** Eleva ao passar o mouse — só em cartão que leva a algum lugar. */
  interactive?: boolean;
};

export function Card({
  className,
  children,
  title,
  subtitle,
  eyebrow,
  action,
  padding = 'default',
  tone = 'default',
  accent = false,
  interactive = false,
  ...props
}: CardProps) {
  const toneClasses = cardTone[tone];
  const paddingClasses = cardPadding[padding];
  return (
    <section
      data-slot="card"
      data-tone={tone}
      className={cn(
        'min-w-0 overflow-hidden rounded-card max-mobile:rounded-card-mobile',
        toneClasses.surface,
        // 1px no lugar do 1,5px do export: sem meio pixel (que o lint de aderência barra)
        accent && 'inset-ring inset-ring-brand-accent/55',
        interactive && [
          'cursor-pointer transition-[box-shadow,translate] duration-normal ease-standard hover:-translate-y-px',
          toneClasses.hover,
        ],
        className,
      )}
      {...props}
    >
      {(title || subtitle || eyebrow || action) && (
        <header className={cn('flex flex-wrap items-center justify-between gap-5 pt-6', paddingClasses.header)}>
          <div className="min-w-0">
            {eyebrow && <div className={cn('gv-eyebrow mb-2', toneClasses.sub)}>{eyebrow}</div>}
            {title && <h3 className="text-lg font-semibold tracking-tight text-current">{title}</h3>}
            {subtitle && <p className={cn('mt-1 text-xs', toneClasses.sub)}>{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={paddingClasses.body}>{children}</div>
    </section>
  );
}
