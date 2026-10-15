import { Label as LabelPrimitive } from 'radix-ui';
import { type ComponentProps, type ReactNode, useId } from 'react';
import { cn } from '../lib/cn.js';
import { FieldControlContext, type FieldControlProps } from '../lib/field-control.js';

// Rótulo, dica e erro em volta de um controle de formulário (`Field.jsx` do
// export). O cadastro de fazendas tem uns trinta campos: todo controle vai
// dentro de um `Field`. O rótulo nomeia o controle, a dica ou o erro o
// descreve, e o erro o marca como inválido — pelo contexto de
// `lib/field-control`, que alcança o controle mesmo aninhado (o gatilho dentro
// de um `Select`). Na horizontal, o rótulo vai ao lado: é como `Checkbox` e
// `Switch` ganham rótulo e descrição.

export type FieldProps = Omit<ComponentProps<'div'>, 'children'> & {
  label?: ReactNode;
  /** Texto de apoio sob o controle. */
  hint?: ReactNode;
  /** Mensagem de erro: substitui a dica, fica vermelha e marca o controle como inválido. */
  error?: ReactNode;
  /** Asterisco no rótulo e `aria-required` no controle. */
  required?: boolean;
  /** Id de um controle que já tem o seu; sem ele, o `Field` gera um e o entrega ao controle. */
  htmlFor?: string;
  /** vertical: rótulo acima · horizontal: rótulo ao lado, para caixa de seleção e interruptor */
  orientation?: 'vertical' | 'horizontal';
  children: ReactNode;
};

export function Field({
  className,
  label,
  hint,
  error,
  required = false,
  htmlFor,
  orientation = 'vertical',
  children,
  ...props
}: FieldProps) {
  const baseId = useId();
  const controlId = htmlFor ?? `${baseId}control`;
  const messageId = `${baseId}message`;
  const message = error || hint;
  const control: FieldControlProps = {
    id: controlId,
    'aria-describedby': message ? messageId : undefined,
    'aria-invalid': error ? true : undefined,
    'aria-required': required || undefined,
  };
  const horizontal = orientation === 'horizontal';

  const labelElement = label && (
    <LabelPrimitive.Root
      htmlFor={controlId}
      className={cn(
        'text-sm leading-snug text-text-body',
        horizontal ? 'cursor-[inherit] font-regular' : 'font-medium',
      )}
    >
      {label}
      {required && (
        <span aria-hidden className="ml-1 text-status-danger-fg">
          *
        </span>
      )}
    </LabelPrimitive.Root>
  );
  const messageElement = message && (
    <span
      id={messageId}
      className={cn('text-xs leading-normal', error ? 'text-status-danger-fg' : 'text-text-faint')}
    >
      {message}
    </span>
  );

  return (
    <FieldControlContext value={control}>
      {horizontal ? (
        <div
          data-slot="field"
          data-orientation={orientation}
          className={cn('flex gap-5', message ? 'items-start' : 'items-center', className)}
          {...props}
        >
          {children}
          {/* o controle (`peer`) desabilitado esmaece o texto e tira o clique do rótulo */}
          <div className="flex cursor-pointer flex-col gap-1 peer-disabled:cursor-not-allowed peer-disabled:opacity-45">
            {labelElement}
            {messageElement}
          </div>
        </div>
      ) : (
        <div
          data-slot="field"
          data-orientation={orientation}
          className={cn('flex flex-col gap-3', className)}
          {...props}
        >
          {labelElement}
          {children}
          {messageElement}
        </div>
      )}
    </FieldControlContext>
  );
}
