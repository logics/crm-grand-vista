import type { ComponentProps, FormEvent, ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { Input, type InputProps } from '../primitives/input.js';
import { Button } from './button.js';

// Linha de busca e matching interno (`SearchBar.jsx` do export): um campo de
// texto, N filtros, um botão de enviar. Fica no próprio cartão branco, para que
// os campos cor de pedra se destaquem da tela; `bare` tira o cartão quando a
// barra já está dentro de um `Card`.

export type SearchBarProps = Omit<ComponentProps<'form'>, 'onSubmit'> & {
  /** Também é o nome acessível do campo, salvo `aria-label` em `inputProps`. */
  placeholder?: string;
  /** Selects e tags entre o campo e o botão. */
  filters?: ReactNode;
  buttonLabel?: string;
  /** Sem o cartão branco em volta. */
  bare?: boolean;
  /** Recebe o termo digitado; a página nunca recarrega. */
  onSubmit?: (query: string, event: FormEvent<HTMLFormElement>) => void;
  /** Props do campo de busca: `name`, valor controlado, `aria-label`. */
  inputProps?: InputProps;
};

export function SearchBar({
  className,
  placeholder = 'Buscar…',
  filters,
  buttonLabel = 'Buscar',
  bare = false,
  onSubmit,
  inputProps,
  ...props
}: SearchBarProps) {
  const name = inputProps?.name ?? 'q';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get(name);
    onSubmit?.(typeof query === 'string' ? query : '', event);
  }

  return (
    <form
      data-slot="search-bar"
      role="search"
      onSubmit={handleSubmit}
      className={cn(
        'flex flex-wrap items-center gap-4',
        // 10px de respiro do export: fora da escala, somado dos tokens
        !bare && 'rounded-card bg-surface-card p-[calc(var(--space-4)+var(--space-1))] shadow-sm',
        className,
      )}
      {...props}
    >
      <Input
        pill
        icon="search"
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        {...inputProps}
        name={name}
        // 220px de base do export (5,5 × --space-10): cresce e quebra a linha antes de espremer
        className={cn('grow basis-[calc(5.5*var(--space-10))]', inputProps?.className)}
      />
      {filters}
      <Button type="submit" icon="sliders-horizontal">
        {buttonLabel}
      </Button>
    </form>
  );
}
