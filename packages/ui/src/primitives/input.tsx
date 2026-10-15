import type { ComponentProps, ReactNode } from 'react';
import { Icon, type IconName } from '../components/icon.js';
import { cn } from '../lib/cn.js';
import { useFieldControl } from '../lib/field-control.js';
import { type FieldSize, fieldFrameSurface, fieldSize } from '../lib/styles.js';

// Campo de texto de uma linha (o `input` do shadcn), com o que o export
// (`Input.jsx`) põe em volta: ícone, prefixo ("R$") e sufixo ("ha", "sacas").
// A superfície fica na moldura em volta do `<input>` (`fieldFrameSurface`).
// Inválido é `aria-invalid`, como nos outros controles — o `Field` o marca
// sozinho. Unidade vai no `suffix`, nunca no rótulo.

export type InputProps = Omit<ComponentProps<'input'>, 'size' | 'prefix'> & {
  /** Glifo à esquerda, dentro do campo. */
  icon?: IconName;
  /** Texto fixo antes do valor, como "R$". */
  prefix?: ReactNode;
  /** Texto fixo depois do valor, como "ha" ou "sacas". */
  suffix?: ReactNode;
  /** sm 32 · md 40 · lg 48 (lg nos formulários do mobile). */
  size?: FieldSize;
  /** Totalmente arredondado: busca em barras de ferramentas e no topo. */
  pill?: boolean;
};

/** As props vão para o `<input>`; `className` vai para a moldura, que é quem ocupa o layout. */
export function Input({ className, icon, prefix, suffix, size = 'md', pill = false, ...props }: InputProps) {
  const control = useFieldControl(props);
  return (
    <div
      data-slot="input"
      className={cn(
        fieldFrameSurface,
        fieldSize[size],
        'flex items-center gap-4',
        pill ? 'rounded-pill px-6' : 'rounded-input px-5',
        className,
      )}
    >
      {icon && <Icon name={icon} size="sm" className="text-text-faint" />}
      {prefix && <span className="text-sm text-text-faint">{prefix}</span>}
      <input
        data-slot="input-control"
        className={cn(
          // sem o anel global de `:focus-visible` (`base.css`): quem acende é a moldura
          'h-full min-w-0 flex-1 bg-transparent text-text-body outline-none focus-visible:shadow-none',
          'placeholder:text-text-faint disabled:cursor-not-allowed',
        )}
        {...control}
      />
      {suffix && <span className="whitespace-nowrap text-xs text-text-faint">{suffix}</span>}
    </div>
  );
}
