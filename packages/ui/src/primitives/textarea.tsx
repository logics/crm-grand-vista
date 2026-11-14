import type { ComponentProps } from 'react';
import { cn } from '../lib/cn.js';
import { useFieldControl } from '../lib/field-control.js';
import { textareaField } from '../lib/styles.js';

// Campo de texto de várias linhas (o `textarea` do shadcn), para textos longos
// como o resumo técnico de uma fazenda ou as observações de um contato. Sem
// ícone, prefixo ou sufixo, a superfície vai no próprio `<textarea>`
// (`textareaField`) e `className` também. Inválido é `aria-invalid`, como nos
// outros controles — o `Field` o marca sozinho. Redimensiona só na vertical.

export type TextareaProps = ComponentProps<'textarea'>;

export function Textarea({ className, rows = 4, ...props }: TextareaProps) {
  const control = useFieldControl(props);
  return <textarea data-slot="textarea" rows={rows} className={cn(textareaField, className)} {...control} />;
}
