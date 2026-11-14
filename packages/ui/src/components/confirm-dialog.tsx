import { type ReactNode, useRef, useState } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../primitives/dialog.js';
import { Input } from '../primitives/input.js';
import { Button } from './button.js';
import { Field } from './field.js';
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
  /**
   * Confirmação digitada: o botão de confirmar só habilita quando a pessoa
   * digita exatamente este texto (caixa e acento contam; espaços nas pontas
   * do que foi digitado não). Para exclusão que não se desfaz, como a de uma fazenda.
   */
  confirmationText?: string;
  /** Rótulo do campo da confirmação digitada: "Digite o nome da fazenda para confirmar". */
  confirmationLabel?: string;
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
  confirmationText,
  confirmationLabel = 'Digite para confirmar',
}: ConfirmDialogProps) {
  const confirmed = useRef(false);
  const [typed, setTyped] = useState('');
  const blocked = confirmationText !== undefined && typed.trim() !== confirmationText;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={() => setTyped('')}
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
        {confirmationText !== undefined && (
          <Field label={confirmationLabel}>
            <Input value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" />
          </Field>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">{cancelLabel}</Button>
          </DialogClose>
          <Button
            variant="danger"
            icon={confirmIcon}
            disabled={blocked}
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
