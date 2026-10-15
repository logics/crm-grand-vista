import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// O tailwind-merge resolve conflitos pelas escalas do tema padrão do Tailwind,
// que aqui não existe. Sem estes nomes, `text-h1` passaria por cor (e apagaria
// `text-text-body`) e `font-regular` por família. Espelham `../theme.css`; o
// teste do `cn` falha se um token do tema ficar de fora.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['hero', 'display', 'h1', 'h2', 'h3', 'lg', 'body', 'sm', 'xs', 'micro', 'label'],
      'font-weight': ['light', 'regular', 'medium', 'semibold', 'bold'],
      leading: ['tight', 'snug', 'normal', 'relaxed'],
      tracking: ['brand', 'eyebrow', 'wide', 'normal', 'tight', 'heading', 'display'],
      spacing: [
        'gap-shell',
        'gap-shell-mobile',
        'gutter-card',
        'gutter-card-mobile',
        'gutter-section',
        'gutter-page',
        'row-height',
        'row-height-dense',
        'control-height',
        'control-height-sm',
        'control-height-lg',
        'hit-target',
        'sidebar-width',
        'sidebar-width-collapsed',
        'topbar-height',
        'tabbar-height',
        'content-max',
      ],
      radius: ['none', 'sheet', 'pill', 'card', 'card-mobile', 'control', 'input', 'nav', 'media'],
      shadow: ['hairline', 'overlay', 'primary', 'hero', 'nav-active', 'inset-top', 'ring-focus', 'ring-danger'],
      ease: ['standard', 'out', 'in'],
      breakpoint: ['rail', 'mobile'],
      container: ['rail', 'mobile'],
    },
    classGroups: {
      duration: [{ duration: ['instant', 'fast', 'normal', 'slow'] }],
    },
  },
});

/** Junta classes condicionais e resolve conflitos do Tailwind: a última vence. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
