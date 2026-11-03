import {
  createVocabularyEntrySchema,
  type CreateVocabularyEntryInput,
  type VocabularyDefinition,
  type VocabularyEntry,
} from '@crm/shared';
import { Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@crm/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

// Diálogo de entrada de cadastro auxiliar: criar ou renomear. A recusa do
// servidor (nome repetido, entrada inativa homônima) aparece no campo e o
// diálogo continua aberto, para o usuário corrigir ou ir reativar.

interface VocabularyEntryDialogProps {
  /** A entrada a renomear; ausente, o diálogo cria. */
  entry?: VocabularyEntry;
  /** Dá o significado de sistema, quando o cadastro o tem. */
  vocabulary: VocabularyDefinition;
  title: string;
  onClose: () => void;
  /** Rejeitar com `Error` mostra a mensagem no campo. */
  onSubmit: (input: CreateVocabularyEntryInput) => Promise<void>;
}

export function VocabularyEntryDialog({ entry, vocabulary, title, onClose, onSubmit }: VocabularyEntryDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateVocabularyEntryInput>({
    resolver: zodResolver(createVocabularyEntrySchema),
    defaultValues: { name: entry?.name ?? '', systemMeaning: entry?.systemMeaning },
  });

  const meanings = vocabulary.systemMeaning?.options;

  const submit = handleSubmit(async (input) => {
    if (meanings && !entry && !input.systemMeaning) {
      setError('systemMeaning', { message: 'Escolha o significado.' });
      return;
    }
    try {
      // O significado só vai na criação: no PATCH ele é recusado.
      await onSubmit(entry ? { name: input.name } : input);
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
            {meanings && (
              <Field
                label="Significado"
                required={!entry}
                hint={entry ? 'O significado não muda depois de criado.' : undefined}
                error={errors.systemMeaning?.message}
              >
                {entry ? (
                  <Input readOnly value={meanings[entry.systemMeaning ?? ''] ?? ''} />
                ) : (
                  <Controller
                    control={control}
                    name="systemMeaning"
                    render={({ field }) => (
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger aria-label="Significado">
                          <SelectValue placeholder="Escolha" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(meanings).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
              </Field>
            )}
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
