import {
  createVocabularyEntrySchema,
  type CreateVocabularyEntryInput,
  type VocabularyDefinition,
  type VocabularyEntry,
  vocabularyMeaningRequiredMessage,
} from '@crm/shared';
import { Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, MunicipalityPicker, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@crm/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, type Control } from 'react-hook-form';
import { useTenantSlug } from '../../shell/tenant-query.js';
import { resolveMunicipalityItems, searchMunicipalities } from '../municipalities/municipality-source.js';

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

/** Campo extra da praça: os municípios que ela atende, guardados como códigos IBGE. */
function ServedMunicipalitiesField({ control, error }: { control: Control<CreateVocabularyEntryInput>; error?: string }) {
  const slug = useTenantSlug();
  return (
    <Field label="Municípios atendidos" hint="Um município pertence a uma única praça." error={error}>
      <Controller
        control={control}
        name="municipalities"
        render={({ field }) => (
          <MunicipalityPicker
            multiple
            aria-label="Municípios atendidos"
            search={searchMunicipalities(slug)}
            resolve={resolveMunicipalityItems(slug)}
            value={field.value ?? []}
            onChange={(items) => field.onChange(items.map((item) => item.ibgeCode))}
            onBlur={field.onBlur}
          />
        )}
      />
    </Field>
  );
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
    defaultValues: {
      name: entry?.name ?? '',
      systemMeaning: entry?.systemMeaning,
      ...(vocabulary.servedMunicipalities
        ? { municipalities: entry?.municipalities?.map((municipality) => municipality.ibgeCode) ?? [] }
        : {}),
    },
  });

  const meanings = vocabulary.systemMeaning?.options;

  const submit = handleSubmit(async (input) => {
    if (meanings && !entry && !input.systemMeaning) {
      setError('systemMeaning', { message: vocabularyMeaningRequiredMessage });
      return;
    }
    try {
      // O significado só vai na criação: no PATCH ele é recusado.
      await onSubmit(entry ? { name: input.name, municipalities: input.municipalities } : input);
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
            {vocabulary.servedMunicipalities && (
              <ServedMunicipalitiesField control={control} error={errors.municipalities?.message} />
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
