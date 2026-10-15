import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../lib/cn.js';
import { focusRing, iconStroke } from '../lib/styles.js';

// Diálogo do shadcn sobre o Radix: foco preso, retorno de foco ao gatilho,
// Escape, trava de rolagem e ARIA vêm do Radix. Do export (`Dialog.jsx`) vem só
// a aparência: scrim verde, cabeçalho com sobretítulo, rodapé com filete e a
// variante `sheet`, que sobe da borda inferior no mobile.

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-scrim-modal backdrop-blur-[0.125rem]',
        'motion-safe:data-[state=open]:animate-fade-in motion-safe:data-[state=closed]:animate-fade-out',
        className,
      )}
      {...props}
    />
  );
}

const contentVariant = {
  center: [
    'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl',
    'w-[calc(100%-2*var(--space-8))] max-w-[32.5rem] max-h-[calc(100%-2*var(--space-8))]',
    'motion-safe:data-[state=open]:animate-pop-in motion-safe:data-[state=closed]:animate-pop-out',
  ].join(' '),
  sheet: [
    'inset-x-0 bottom-0 max-h-[92%] rounded-t-sheet',
    'motion-safe:data-[state=open]:animate-sheet-in motion-safe:data-[state=closed]:animate-sheet-out',
  ].join(' '),
} as const;

export type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  /** `center` é o modal centrado; `sheet` sobe da borda inferior, para telas estreitas. */
  variant?: keyof typeof contentVariant;
  /** Botão "Fechar" no canto do cabeçalho. */
  showCloseButton?: boolean;
};

export function DialogContent({
  className,
  children,
  variant = 'center',
  showCloseButton = true,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-variant={variant}
        className={cn(
          'group/dialog fixed z-50 flex flex-col overflow-hidden bg-surface-card text-text-body shadow-overlay outline-none',
          contentVariant[variant],
          className,
        )}
        {...props}
      >
        {variant === 'sheet' && (
          <span aria-hidden className="mx-auto mt-4 h-2 w-10 shrink-0 rounded-pill bg-border-default" />
        )}
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            className={cn(
              'absolute top-6 right-6 inline-flex size-control-height-sm items-center justify-center rounded-pill',
              'bg-surface-sunken text-text-body transition-control hover:bg-surface-muted',
              'group-data-[variant=sheet]/dialog:top-7',
              focusRing,
            )}
          >
            <X className="size-6" strokeWidth={iconStroke} />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/** Cabeçalho: sobretítulo, título e descrição, com folga à direita para o botão "Fechar". */
export function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        'flex shrink-0 flex-col gap-2 pt-7 pr-11 pb-5 pl-8',
        'group-data-[variant=sheet]/dialog:pt-5 group-data-[variant=sheet]/dialog:pl-7',
        className,
      )}
      {...props}
    />
  );
}

/** Sobretítulo em caixa-alta mono, acima do título (`.gv-eyebrow`). */
export function DialogEyebrow({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="dialog-eyebrow" className={cn('gv-eyebrow', className)} {...props} />;
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-h2 font-semibold leading-snug tracking-heading text-text-heading', className)}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('m-0 text-sm text-text-muted', className)}
      {...props}
    />
  );
}

/** Corpo rolável entre o cabeçalho e o rodapé. */
export function DialogBody({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        'min-h-0 flex-1 overflow-auto px-8 pt-2 pb-8',
        'group-data-[variant=sheet]/dialog:px-7 group-data-[variant=sheet]/dialog:pb-7',
        className,
      )}
      {...props}
    />
  );
}

/** Rodapé com as ações, alinhadas à direita, separado do corpo por um filete. */
export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex shrink-0 flex-wrap justify-end gap-4 border-t border-border-subtle px-6 py-5',
        'group-data-[variant=sheet]/dialog:pb-7',
        className,
      )}
      {...props}
    />
  );
}
