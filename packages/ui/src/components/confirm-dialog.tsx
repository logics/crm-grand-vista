import { type ReactNode, useRef } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../primitives/dialog.js';
import { Button } from './button.js';
import type { IconName } from './icon.js';

// Pergunta antes de uma ação que não se desfaz (o botão de confirmar é `danger`): remover um arquivo, descartar
// o que foi preenchido. Cancelar e Escape fecham sem agir, e o foco volta a
// quem abriu. Ao confirmar, quem abriu costuma sair da tela junto com o item:
// `focusAfterConfirm` diz para onde o foco vai.

export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pergunta, nomeia o diálogo: "Remover laudo.pdf?". */
  title: ReactNode;
  /** O que acontece ao confirmar. */
  description?: ReactNode;
  /** Verbo da ação: "Remover", "Descartar". */
  confirmLabel: string;
  confirmIcon?: IconName;
  cancelLabel?: string;
  onConfirm: () => void;
  /** Destino do foco depois de confirmar, quando quem abriu não existe mais. */
  focusAfterConfirm?: () => HTMLElement | null | undefined;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmIcon,
  cancelLabel = 'Cancelar',
  onConfirm,
  focusAfterConfirm,
}: ConfirmDialogProps) {
  const confirmed = useRef(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          if (!confirmed.current) return;
          confirmed.current = false;
          const target = focusAfterConfirm?.();
          if (!target) return;
          event.preventDefault();
          target.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{cancelLabel}</Button>
          </DialogClose>
          <Button
            variant="danger"
            icon={confirmIcon}
            onClick={() => {
              confirmed.current = true;
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
