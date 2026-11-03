import { createVocabularyEntrySchema, type CreateVocabularyEntryInput, type VocabularyEntry } from '@crm/shared';
import { Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input } from '@crm/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

// Diálogo de entrada de cadastro auxiliar: criar ou renomear. A recusa do
// servidor (nome repetido, entrada inativa homônima) aparece no campo e o
// diálogo continua aberto, para o usuário corrigir ou ir reativar.

interface VocabularyEntryDialogProps {
  /** A entrada a renomear; ausente, o diálogo cria. */
  entry?: VocabularyEntry;
  title: string;
  onClose: () => void;
  /** Rejeitar com `Error` mostra a mensagem no campo. */
  onSubmit: (input: CreateVocabularyEntryInput) => Promise<void>;
}

export function VocabularyEntryDialog({ entry, title, onClose, onSubmit }: VocabularyEntryDialogProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateVocabularyEntryInput>({
    resolver: zodResolver(createVocabularyEntrySchema),
    defaultValues: { name: entry?.name ?? '' },
  });

  const submit = handleSubmit(async (input) => {
    try {
      await onSubmit(input);
    } catch (failure) {
      setError('name', {
        message: failure instanceof Error ? failure.message : 'Não foi possível salvar. Tente de novo.',
      });
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form noValidate onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="sr-only">Informe o nome da entrada.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label="Nome" required error={errors.name?.message}>
              <Input autoFocus {...register('name')} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
