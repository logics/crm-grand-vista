import { Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@crm/ui';
import { useState } from 'react';
import { RecordHistory, type RecordHistoryProps } from './record-history.js';

// Histórico de alterações sob demanda, para o cabeçalho de qualquer ficha: o
// botão "Histórico" abre um diálogo com o `RecordHistory`. A ficha não mostra o
// histórico como seção — ele só carrega quando a pessoa o abre.

export interface RecordHistoryButtonProps extends RecordHistoryProps {
  /** Complemento da descrição do diálogo: "nesta fazenda", "neste contato". */
  subject: string;
}

export function RecordHistoryButton({ subject, queryKey, fetchPage }: RecordHistoryButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" icon="clock" onClick={() => setOpen(true)}>
        Histórico
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Histórico de alterações</DialogTitle>
            <DialogDescription>Quem mudou o quê {subject}, do mais recente ao mais antigo.</DialogDescription>
          </DialogHeader>
          <DialogBody>{open && <RecordHistory queryKey={queryKey} fetchPage={fetchPage} />}</DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
