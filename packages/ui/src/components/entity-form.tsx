import { zodResolver } from '@hookform/resolvers/zod';
import { type ComponentProps, type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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
import { actionDock, textLink, unsavedNotice } from '../lib/styles.js';

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
  /** Âncora estável da seção (`#tecnico`); com duas ou mais seções ancoradas, o formulário mostra o índice no topo. */
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  /** Seção opcional: nasce recolhida (só o cabeçalho); abre no clique, pela âncora do índice ou quando um campo dela tem erro. */
  collapsed?: boolean;
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
  /** Avisa quando o formulário passa a ter (ou deixa de ter) alterações não salvas. */
  onDirtyChange?: (dirty: boolean) => void;
  /**
   * Id de uma seção ancorada: o formulário abre a seção (se recolhida), rola até ela e foca o primeiro campo.
   * Uso típico: o hash da URL sem `#`. O pacote não lê a URL; quem passa o valor é o app.
   */
  focusSection?: string;
};

const colSpanClass = { 1: '', 2: 'col-span-2 max-mobile:col-span-1' } as const;

/** Rola até o card da seção e foca o controle do primeiro `Field` dela (ou o primeiro focável). */
function focusSectionControl(form: HTMLFormElement | null, id: string) {
  const card = form?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  if (!card) return;
  card.scrollIntoView({ block: 'start' });
  const label = card.querySelector<HTMLLabelElement>('label[for]');
  const control =
    (label && document.getElementById(label.htmlFor)) ??
    card.querySelector<HTMLElement>('input, select, textarea, button, [tabindex]:not([tabindex="-1"])');
  // a rolagem já foi feita pela seção: sem `preventScroll`, o foco rolaria só até o controle e esconderia o título
  control?.focus({ preventScroll: true });
}

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
  onDirtyChange,
  focusSection,
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
  // seções recolhidas abertas pela pessoa, pela âncora (`id`) ou, sem ela, pela posição
  const [opened, setOpened] = useState<ReadonlySet<string | number>>(() =>
    sections.some((section) => section.id === focusSection && section.collapsed) && focusSection
      ? new Set([focusSection])
      : new Set(),
  );
  const anchored = sections.filter((section) => section.id);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingSection = useRef<string | null>(null);
  const fieldNames = sections.flatMap((section) => section.fields.map((field) => field.name));

  // Clique no índice: abre a seção recolhida e deixa rolagem e foco para depois do commit. O Set novo
  // força o render que roda o efeito, mesmo com a seção já aberta.
  const goToSection = (id: string) => {
    pendingSection.current = id;
    setOpened((current) => {
      const next = new Set(current);
      if (sections.find((section) => section.id === id)?.collapsed) next.add(id);
      return next;
    });
  };

  useLayoutEffect(() => {
    const id = pendingSection.current;
    if (!id) return;
    pendingSection.current = null;
    focusSectionControl(formRef.current, id);
  });

  // `focusSection` que muda abre a seção recolhida já no render (ajuste de estado durante o render)
  const [shownFocus, setShownFocus] = useState(focusSection);
  if (focusSection !== shownFocus) {
    setShownFocus(focusSection);
    if (focusSection && sections.some((section) => section.id === focusSection && section.collapsed)) {
      setOpened((current) => new Set(current).add(focusSection));
    }
  }

  // Só `focusSection` dispara: um re-render não pode puxar o foco de volta. Os campos podem trocar de
  // elemento num render logo depois do primeiro commit (o seletor da cadeia refaz o controle), então o
  // foco é repetido nesse render seguinte; o microtask encerra a janela antes de qualquer ação da pessoa.
  useEffect(() => {
    if (!focusSection) return;
    focusSectionControl(formRef.current, focusSection);
    pendingSection.current = focusSection;
    queueMicrotask(() => {
      pendingSection.current = null;
    });
  }, [focusSection]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

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
      ref={formRef}
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
      {anchored.length > 1 && (
        <nav aria-label="Seções do formulário" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {anchored.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={textLink}
              onClick={() => {
                if (section.id) goToSection(section.id);
              }}
            >
              {section.title}
            </a>
          ))}
        </nav>
      )}
      {sections.map((section, index) => {
        const titleId = `${baseId}section-${index}`;
        const bodyId = `${baseId}body-${index}`;
        const hasError = section.fields.some((item) => form.getFieldState(item.name, form.formState).error);
        const key = section.id ?? index;
        const expanded = !section.collapsed || opened.has(key) || hasError;
        const toggle = () =>
          setOpened((current) => {
            const next = new Set(current);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
          });
        return (
          <Card
            // a seção é uma região nomeada pelo título
            key={titleId}
            id={section.id}
            aria-labelledby={titleId}
            className="scroll-mt-6"
            title={<span id={titleId}>{section.title}</span>}
            subtitle={section.description}
            action={
              section.collapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={expanded ? 'chevron-up' : 'chevron-down'}
                  aria-expanded={expanded}
                  aria-controls={bodyId}
                  onClick={toggle}
                >
                  {expanded ? 'Recolher' : 'Preencher'}
                </Button>
              )
            }
          >
            {/* recolhida, a seção segue montada: os valores e as regras do formulário não se perdem */}
            <div id={bodyId} className={cn('grid grid-cols-2 gap-x-6 gap-y-7 max-mobile:grid-cols-1', !expanded && 'hidden')}>
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
      {/* sempre à vista: acompanha a rolagem, sem obrigar a ir até o fim do formulário */}
      <div data-slot="entity-form-actions" className={actionDock}>
        {isDirty && (
          <p role="status" className={unsavedNotice.text}>
            <span aria-hidden className={unsavedNotice.dot} />
            Alterações não salvas
          </p>
        )}
        {/* no mobile, os dois botões dividem a linha: o envio nunca cai sozinho para baixo */}
        <div className="flex gap-4 max-mobile:w-full">
          <Button variant="ghost" className="max-mobile:flex-1" onClick={cancel}>
            Cancelar
          </Button>
          <Button type="submit" className="max-mobile:flex-1" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
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
