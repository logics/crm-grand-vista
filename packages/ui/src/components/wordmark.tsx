import type { ComponentProps } from 'react';
import { cn } from '../lib/cn.js';

// Assinatura tipográfica da Grand Vista (`Wordmark.jsx` do export): o nome em
// Jost com o espaçamento largo da marca e o descritor "Fazendas" entre filetes
// dourados. Não existe logotipo vetorial — só a placa em raster
// (`packages/ui/assets/`), que vai apenas em tamanho grande sobre fundo simples.
// O monograma não é aproximado, redesenhado nem gerado aqui: onde iria o
// logotipo, vai este componente, só com texto.
//
// As cores são as da assinatura (`--brand-wordmark-*`): verde e dourados sobre
// fundo claro; areia e dourado claro sobre verde ou foto.

const wordmarkTone = {
  dark: { name: 'text-brand-wordmark-name', rule: 'bg-brand-wordmark-rule', descriptor: 'text-brand-wordmark-descriptor' },
  light: {
    name: 'text-brand-wordmark-name-on-inverse',
    rule: 'bg-brand-wordmark-rule-on-inverse',
    descriptor: 'text-brand-wordmark-descriptor-on-inverse',
  },
} as const;

/** Corpo do nome, da escala tipográfica. Mínimo de 14 (`body`). */
const wordmarkSize = {
  body: 'text-body',
  lg: 'text-lg',
  h3: 'text-h3',
  h2: 'text-h2',
  h1: 'text-h1',
  display: 'text-display',
} as const;

export type WordmarkProps = ComponentProps<'span'> & {
  /** Corpo do nome; o descritor acompanha a 42%. */
  size?: keyof typeof wordmarkSize;
  /** dark sobre superfície clara · light sobre verde ou foto */
  tone?: keyof typeof wordmarkTone;
  /** Mostra a linha "Fazendas" entre filetes. */
  descriptor?: boolean;
};

export function Wordmark({ className, size = 'h2', tone = 'dark', descriptor = true, ...props }: WordmarkProps) {
  const toneClasses = wordmarkTone[tone];
  return (
    <span
      data-slot="wordmark"
      className={cn('inline-flex flex-col items-center gap-2', wordmarkSize[size], toneClasses.name, className)}
      {...props}
    >
      <span className="gv-wordmark font-light leading-none">Grand Vista</span>
      {descriptor && (
        <span className="flex w-full items-center gap-4">
          <span aria-hidden className={cn('h-px flex-1', toneClasses.rule)} />
          {/* 42% do nome, nunca abaixo de 8px (`--space-4`) */}
          <span
            className={cn(
              'font-display text-[length:max(var(--space-4),0.42em)] uppercase tracking-eyebrow',
              toneClasses.descriptor,
            )}
          >
            Fazendas
          </span>
          <span aria-hidden className={cn('h-px flex-1', toneClasses.rule)} />
        </span>
      )}
    </span>
  );
}
