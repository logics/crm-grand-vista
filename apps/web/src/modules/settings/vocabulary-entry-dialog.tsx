import { vocabularyNameSchema, type VocabularyEntry } from '@crm/shared';
import { Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input } from '@crm/ui';
import { useState, type FormEvent } from 'react';

// Diálogo de entrada de cadastro auxiliar: criar ou renomear. A recusa do
// servidor (nome repetido, entrada inativa homônima) aparece no campo e o
// diálogo continua aberto, para o usuário corrigir ou ir reativar.

interface VocabularyEntryDialogProps {
  /** A entrada a renomear; ausente, o diálogo cria. */
  entry?: VocabularyEntry;
  title: string;
  onClose: () => void;
  /** Rejeitar com `Error` mostra a mensagem no campo. */
  onSubmit: (name: string) => Promise<void>;
}

export function VocabularyEntryDialog({ entry, title, onClose, onSubmit }: VocabularyEntryDialogProps) {
  const [name, setName] = useState(entry?.name ?? '');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = vocabularyNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar. Tente de novo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form noValidate onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="sr-only">Informe o nome da entrada.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label="Nome" required error={error}>
              <Input
                autoFocus
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError(undefined);
                }}
              />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
