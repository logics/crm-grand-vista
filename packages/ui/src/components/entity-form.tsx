import { zodResolver } from '@hookform/resolvers/zod';
import { type ComponentProps, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import {
  Controller,
  type ControllerRenderProps,
  type DefaultValues,
  type FieldPath,
  type FieldValues,
  type Resolver,
  useForm,
} from 'react-hook-form';
import type { z } from 'zod';
import { cn } from '../lib/cn.js';
import { formErrorMap, isRequiredField } from '../lib/form-schema.js';
import { Button } from './button.js';
import { Card } from './card.js';
import { ConfirmDialog } from './confirm-dialog.js';
import { Field } from './field.js';
import { Icon } from './icon.js';

// Formulário de cadastro em seções (fazenda, contato, oportunidade), validado
// pelo mesmo schema Zod da fronteira HTTP. Cada seção é um `Card` com grade de
// duas colunas, que cai para uma no mobile; cada campo vai num `Field` ligado ao
// React Hook Form. As seções são o contrato: quando o registro de metadados de
// campo existir, um adaptador as gera — este componente não o conhece.
// `packages/ui` não fala com a API: o envio é o `onSubmit` recebido, e um
// `FormSubmitError` rejeitado traz o erro geral e os de campo do servidor.

/** Rejeição do `onSubmit` com mensagem para o topo e, opcionalmente, erros por campo. */
export class FormSubmitError extends Error {
  constructor(
    message: string,
    /** Mensagem por nome de campo (com ponto nos aninhados). */
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'FormSubmitError';
  }
}

const genericSubmitError = 'Não foi possível salvar. Tente de novo.';

/** Um campo por nome: `render` recebe o `field` com o tipo do valor daquele nome. */
export type EntityFormField<TValues extends FieldValues> = {
  [TName in FieldPath<TValues>]: {
    name: TName;
    label: ReactNode;
    hint?: ReactNode;
    /** 2 ocupa a linha toda da grade; no mobile, tudo ocupa uma coluna. */
    colSpan?: 1 | 2;
    /** O controle, ligado ao formulário: espalhe `field` num `Input`, ou ligue `value`/`onChange`/`ref` à mão. */
    render: (field: ControllerRenderProps<TValues, TName>) => ReactNode;
  };
}[FieldPath<TValues>];

export type EntityFormSection<TValues extends FieldValues> = {
  title: ReactNode;
  description?: ReactNode;
  fields: EntityFormField<TValues>[];
};

type FormSchema = z.ZodType<FieldValues, FieldValues>;

export type EntityFormProps<TSchema extends FormSchema> = Omit<
  ComponentProps<'form'>,
  'onSubmit' | 'defaultValues' | 'children'
> & {
  schema: TSchema;
  defaultValues: DefaultValues<z.input<TSchema>>;
  sections: EntityFormSection<z.input<TSchema>>[];
  /** Recebe os valores já convertidos pelo schema. Rejeitar mostra o erro no topo (`FormSubmitError` para mensagem e campos próprios). */
  onSubmit: (values: z.output<TSchema>) => void | Promise<void>;
  /** Sair sem salvar; com alterações, só depois de confirmar o descarte. */
  onCancel: () => void;
  /** Rótulo do envio, começando pelo verbo. */
  submitLabel?: string;
};

const colSpanClass = { 1: '', 2: 'col-span-2 max-mobile:col-span-1' } as const;

/** Erro geral no topo; `focus` quando nenhum campo recebe o foco no lugar dele. */
type ServerError = { messages: string[]; focus: boolean };

export function EntityForm<TSchema extends FormSchema>({
  className,
  schema,
  defaultValues,
  sections,
  onSubmit,
  onCancel,
  submitLabel = 'Salvar',
  ...props
}: EntityFormProps<TSchema>) {
  type Input = z.input<TSchema>;
  type Output = z.output<TSchema>;
  const baseId = useId();
  const [serverError, setServerError] = useState<ServerError>();
  const alertRef = useRef<HTMLDivElement>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const form = useForm<Input, unknown, Output>({
    defaultValues,
    // o mapa de erros precisa dos valores brutos para saber o que está vazio; o
    // cast só fixa os genéricos que o `zodResolver` não infere de `TSchema`
    resolver: (values, context, options) =>
      (zodResolver(schema, { error: formErrorMap(schema, values) }) as Resolver<Input, unknown, Output>)(
        values,
        context,
        options,
      ),
  });
  const { isSubmitting, isDirty } = form.formState;
  const fieldNames = sections.flatMap((section) => section.fields.map((field) => field.name));

  useEffect(() => {
    if (serverError?.focus) alertRef.current?.focus();
  }, [serverError]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      // salvo, o que está na tela passa a ser o estado limpo
      form.reset(form.getValues());
    } catch (error) {
      if (!(error instanceof FormSubmitError)) {
        setServerError({ messages: [genericSubmitError], focus: true });
        return;
      }
      // campo que o formulário não mostra tem a mensagem levada ao topo
      const names = Object.keys(error.fieldErrors);
      const shown = fieldNames.filter((name) => names.includes(name));
      const hidden = names.filter((name) => !shown.includes(name as FieldPath<Input>));
      setServerError({
        messages: [error.message, ...hidden.map((name) => error.fieldErrors[name] ?? '')],
        focus: shown.length === 0,
      });
      // o foco vai para o primeiro campo apontado, na ordem do formulário
      for (const name of shown) {
        form.setError(name, { type: 'server', message: error.fieldErrors[name] }, { shouldFocus: name === shown[0] });
      }
    }
  });

  const cancel = () => (isDirty ? setConfirmingDiscard(true) : onCancel());

  return (
    <form
      data-slot="entity-form"
      noValidate
      aria-busy={isSubmitting || undefined}
      className={cn('flex flex-col gap-gap-shell max-mobile:gap-gap-shell-mobile', className)}
      onSubmit={(event) => {
        setServerError(undefined);
        return submit(event);
      }}
      {...props}
    >
      {serverError && (
        <div
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="flex items-start gap-4 rounded-input bg-status-danger-bg px-6 py-5 text-sm text-status-danger-fg outline-none"
        >
          <Icon name="alert-circle" size="md" />
          <div className="flex flex-col gap-2">
            {serverError.messages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        </div>
      )}
      {sections.map((section, index) => {
        const titleId = `${baseId}section-${index}`;
        return (
          <Card
            // a seção é uma região nomeada pelo título
            key={titleId}
            aria-labelledby={titleId}
            title={<span id={titleId}>{section.title}</span>}
            subtitle={section.description}
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-7 max-mobile:grid-cols-1">
              {section.fields.map((item) => (
                <Controller
                  key={item.name}
                  control={form.control}
                  name={item.name}
                  render={({ field, fieldState }) => (
                    <Field
                      className={colSpanClass[item.colSpan ?? 1]}
                      label={item.label}
                      hint={item.hint}
                      error={fieldState.error?.message}
                      required={isRequiredField(schema, item.name)}
                    >
                      {/* `render` é o do mesmo `name` deste `Controller`: o cast junta a união por nome */}
                      {(item.render as (field: ControllerRenderProps<Input, FieldPath<Input>>) => ReactNode)(field)}
                    </Field>
                  )}
                />
              ))}
            </div>
          </Card>
        );
      })}
      <div className="flex flex-wrap justify-end gap-4">
        <Button variant="ghost" onClick={cancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
      <ConfirmDialog
        open={confirmingDiscard}
        onOpenChange={setConfirmingDiscard}
        title="Descartar alterações?"
        description="O que foi preenchido e não foi salvo se perde."
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        onConfirm={onCancel}
      />
    </form>
  );
}
