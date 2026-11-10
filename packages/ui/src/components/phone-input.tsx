import { caretAfterDigits, DEFAULT_COUNTRY_PREFIX, maskPhoneInput } from '@crm/shared';
import { type ChangeEvent, type KeyboardEvent, type Ref, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Input, type InputProps } from '../primitives/input.js';

// Campo de telefone. Formata enquanto se digita (`maskPhoneInput`): `(64) 99999-0000`
// ou `(64) 3333-4444`, e não aceita além da máscara (11 dígitos no Brasil, 15 no
// internacional). O texto mascarado é o que o formulário guarda e o Zod normaliza
// (`normalizePhone`): este campo não decide o que vale, só impede de digitar o que
// nunca serve. O `+55` aparece pré-preenchido como prefixo enquanto o texto não
// começa com `+`; quem começa por `+` digita o código do país e o prefixo some,
// porque o número deixou de ser brasileiro. Não há reescrita ao sair do campo.
// O teto vem da máscara, não do `maxLength` nativo, que truncaria o colar de
// `+55 (64) 99999-0000` antes de a máscara tirar o prefixo.

export type PhoneInputProps = Omit<InputProps, 'type' | 'prefix' | 'value' | 'defaultValue' | 'onChange' | 'maxLength'> & {
  /** Texto do campo; `null` é vazio. Com ele, o campo é controlado. */
  value?: string | null;
  defaultValue?: string | null;
  /** Recebe o texto mascarado a cada tecla; o vazio é `''`. */
  onChange?: (value: string) => void;
};

const SEPARATOR = /[()\s-]/;
const isDigit = (char: string | undefined): boolean => char !== undefined && char >= '0' && char <= '9';
const countDigits = (text: string): number => text.replace(/\D/g, '').length;
const BRAZIL_CEILING = 11;
const INTERNATIONAL_CEILING = 15;

/** `after` é `before` com exatamente um dígito inserido (ou anexado)? Compara as sequências de dígitos. */
function insertsOneDigit(before: string, after: string): boolean {
  const a = before.replace(/\D/g, '');
  const b = after.replace(/\D/g, '');
  if (b.length !== a.length + 1) return false;
  for (let i = 0; i <= a.length; i++) {
    if (b.slice(0, i) + b.slice(i + 1) === a) return true;
  }
  return false;
}

export function PhoneInput({
  value,
  defaultValue,
  onChange,
  onKeyDown,
  ref,
  placeholder = '(64) 99999-0000',
  ...props
}: PhoneInputProps) {
  // Sem `value`, o campo guarda o próprio texto: o prefixo precisa dele.
  const [draft, setDraft] = useState(defaultValue ?? '');
  const controlled = value !== undefined;
  const text = maskPhoneInput(controlled ? (value ?? '') : draft);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const pendingCaret = useRef<number | null>(null);

  // A ref do RHF (via `{...field}`) precisa chegar ao `<input>`; a interna convive com ela.
  const composedRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as { current: HTMLInputElement | null }).current = node;
    },
    [ref],
  );

  // O cursor só pode ser posto depois do render que reescreve o valor.
  useLayoutEffect(() => {
    const caret = pendingCaret.current;
    if (caret === null) return;
    pendingCaret.current = null;
    inputRef.current?.setSelectionRange(caret, caret);
  });

  /** Mascara `raw`; `digitsBefore` é quantos dígitos ficam antes do cursor (`null`: cursor no fim). */
  const apply = (input: HTMLInputElement, raw: string, digitsBefore: number | null) => {
    const next = maskPhoneInput(raw);
    const caret = digitsBefore === null ? next.length : caretAfterDigits(next, digitsBefore);
    if (next === text) {
      // sem mudança não há render: o que o navegador inseriu (letra, dígito além do teto) sai na hora
      input.value = next;
      input.setSelectionRange(caret, caret);
      return;
    }
    pendingCaret.current = caret;
    if (!controlled) setDraft(next);
    onChange?.(next);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const raw = input.value;
    const caret = input.selectionStart ?? raw.length;
    // Campo no teto + um dígito a mais: recusa a tecla. Mascarar reinterpretaria o `55`
    // inicial como código do país e trocaria o número por outro, válido (`(55) 99999-0000` + `1`).
    const ceiling = text.startsWith('+') ? INTERNATIONAL_CEILING : BRAZIL_CEILING;
    if (countDigits(text) >= ceiling && insertsOneDigit(text, raw)) {
      const digitsBefore = countDigits(raw.slice(0, caret)) - 1;
      const restored = caret >= raw.length ? text.length : caretAfterDigits(text, Math.max(digitsBefore, 0));
      pendingCaret.current = null;
      input.value = text;
      input.setSelectionRange(restored, restored);
      return;
    }
    // colar `+55 (64)…` muda a contagem de dígitos: com o cursor no fim, ele fica no fim
    apply(input, raw, caret >= raw.length ? null : countDigits(raw.slice(0, caret)));
  };

  // Backspace sobre um separador apagaria só o separador, e a máscara o devolveria: apaga o dígito anterior.
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const input = event.currentTarget;
    const { selectionStart: start, selectionEnd: end, value: current } = input;
    if (start === null || start !== end) return;

    if (event.key === 'Backspace' && start > 0 && SEPARATOR.test(current[start - 1] as string)) {
      let index = start - 2;
      while (index >= 0 && !isDigit(current[index])) index--;
      if (index < 0) return;
      event.preventDefault();
      apply(input, current.slice(0, index) + current.slice(index + 1), countDigits(current.slice(0, index)));
    } else if (event.key === 'Delete' && start < current.length && SEPARATOR.test(current[start] as string)) {
      let index = start + 1;
      while (index < current.length && !isDigit(current[index])) index++;
      if (index >= current.length) return;
      event.preventDefault();
      apply(input, current.slice(0, index) + current.slice(index + 1), countDigits(current.slice(0, start)));
    }
  };

  return (
    <Input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder={placeholder}
      // sem `+` o número é brasileiro
      prefix={text.startsWith('+') ? undefined : DEFAULT_COUNTRY_PREFIX}
      {...props}
      ref={composedRef as Ref<HTMLInputElement>}
      value={text}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    />
  );
}
