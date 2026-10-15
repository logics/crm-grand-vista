import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { pressable } from '../lib/pressable.js';
import { accentRing, focusRing, liftOnHover } from '../lib/styles.js';
import { Badge, type BadgeProps } from './badge.js';
import { Icon, type IconName } from './icon.js';

// Cartão de fazenda para listagens e resultados de matching (`FarmCard.jsx` do
// export): foto embutida, nome, município, preço e até quatro destaques
// técnicos. Foto nunca é inventada: sem `image`, fica o espaço reservado.

/** Destaque técnico: glifo e valor ("Irrigável", "Soja + milho"). */
export type FarmSpec = { icon: IconName; value: ReactNode };

export type FarmCardProps = ComponentProps<'article'> & {
  name: ReactNode;
  /** "Município, UF · Região". */
  location?: ReactNode;
  /** Preço já formatado, como "R$ 62.000". */
  price?: ReactNode;
  /** Qualificador do preço. */
  priceUnit?: ReactNode;
  /** Área total e útil, como "1.480 ha · 1.120 úteis"; vai antes dos destaques. */
  area?: ReactNode;
  /** Até quatro destaques técnicos. */
  specs?: FarmSpec[];
  /** Status comercial, num selo sobre a foto. */
  status?: ReactNode;
  statusTone?: BadgeProps['tone'];
  /** Endereço da foto. */
  image?: string;
  /** Captação em destaque: anel dourado por dentro e selo "Destaque". */
  featured?: boolean;
};

export function FarmCard({
  className,
  name,
  location,
  price,
  priceUnit = 'por hectare',
  area,
  specs = [],
  status,
  statusTone = 'success',
  image,
  featured = false,
  onClick,
  onKeyDown,
  ...props
}: FarmCardProps) {
  const highlights: FarmSpec[] = area ? [{ icon: 'ruler', value: area }, ...specs] : specs;
  return (
    <article
      data-slot="farm-card"
      className={cn(
        'flex flex-col overflow-hidden rounded-card bg-surface-card p-4 text-text-body shadow-sm',
        featured && accentRing,
        onClick && [liftOnHover, 'hover:shadow-md', focusRing],
        className,
      )}
      {...pressable({ onClick, onKeyDown })}
      {...props}
    >
      {/* 168px do export (--space-13 + --space-12) */}
      <div className="relative grid h-[calc(var(--space-13)+var(--space-12))] place-items-center overflow-hidden rounded-media bg-surface-muted">
        {image ? (
          <img src={image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="gv-eyebrow">Foto da propriedade</span>
        )}
        {status && (
          <Badge tone={statusTone} dot className="absolute top-5 left-5 bg-surface-card shadow-xs">
            {status}
          </Badge>
        )}
        {featured && (
          <Badge tone="gold" className="absolute top-5 right-5">
            Destaque
          </Badge>
        )}
      </div>
      {/* 12px 10px 8px do export: o 10 sai da soma dos tokens */}
      <div className="flex flex-col gap-4 px-[calc(var(--space-4)+var(--space-1))] pt-5 pb-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-text-heading">{name}</h3>
          {location && (
            <span className="mt-1 inline-flex items-center gap-2 text-xs text-text-faint">
              <Icon name="map-pin" size="sm" />
              {location}
            </span>
          )}
        </div>
        {price && (
          <div className="flex items-baseline gap-3 pt-2">
            <span className="gv-num text-h3 font-semibold tracking-heading text-text-heading">{price}</span>
            <span className="text-xs text-text-faint">{priceUnit}</span>
          </div>
        )}
        {highlights.length > 0 && (
          <ul className="flex flex-wrap gap-5 border-t border-border-subtle pt-4">
            {highlights.map((spec, index) => (
              <li key={index} className="inline-flex items-center gap-2 text-xs text-text-muted">
                <Icon name={spec.icon} size="sm" className="text-text-faint" />
                {spec.value}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
