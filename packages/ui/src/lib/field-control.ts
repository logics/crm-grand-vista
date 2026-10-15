import { type AriaAttributes, createContext, useContext } from 'react';

// O `Field` liga rótulo, dica e erro ao controle que envolve, onde quer que ele
// esteja na árvore — inclusive dentro de um `Select` ou de um `Popover`, aonde
// uma prop injetada no filho direto não chegaria. Cada controle de formulário
// (`Input`, `SelectTrigger`, `Checkbox`, `Switch`) lê este contexto.

/** Atributos que o `Field` passa ao controle. */
export type FieldControlProps = Pick<AriaAttributes, 'aria-describedby' | 'aria-invalid' | 'aria-required'> & {
  id?: string;
};

export const FieldControlContext = createContext<FieldControlProps>({});

/**
 * Junta os atributos do `Field` às props do controle. O que o controle declara
 * vence; `aria-describedby` soma os dois.
 */
export function useFieldControl<P extends FieldControlProps>(props: P): P {
  const field = useContext(FieldControlContext);
  const describedBy = [field['aria-describedby'], props['aria-describedby']].filter(Boolean).join(' ');
  return {
    ...props,
    id: props.id ?? field.id,
    'aria-invalid': props['aria-invalid'] ?? field['aria-invalid'],
    'aria-required': props['aria-required'] ?? field['aria-required'],
    'aria-describedby': describedBy || undefined,
  };
}
