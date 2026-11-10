import { formatPhone, normalizePhone } from '@crm/shared';
import { type FocusEvent, useState } from 'react';
import { Input, type InputProps } from '../primitives/input.js';

// Campo de telefone. O texto é o que a pessoa digita — `(64) 99999-0000` — e é
// ele que o formulário guarda e o Zod normaliza (`normalizePhone`): este campo
// não decide o que vale. O `+55` aparece pré-preenchido como prefixo enquanto o
// texto não começa com `+`; quem começa por `+` digita o código do país e o
// prefixo some, porque o número deixou de ser brasileiro. Ao sair do campo, um
// número válido é reescrito no formato de exibição (`formatPhone`).

export type PhoneInputProps = Omit<InputProps, 'type' | 'prefix' | 'value' | 'defaultValue' | 'onChange'> & {
  /** Texto do campo; `null` é vazio. Com ele, o campo é controlado. */
  value?: string | null;
  defaultValue?: string | null;
  /** Recebe o texto a cada tecla; o vazio é `''`. */
  onChange?: (value: string) => void;
};

/** Código do país pré-preenchido. */
const DEFAULT_COUNTRY_PREFIX = '+55';

export function PhoneInput({
  value,
  defaultValue,
  onChange,
  onBlur,
  placeholder = '(64) 99999-0000',
  ...props
}: PhoneInputProps) {
  // Sem `value`, o campo guarda o próprio texto: o prefixo precisa dele.
  const [draft, setDraft] = useState(defaultValue ?? '');
  const controlled = value !== undefined;
  const text = controlled ? (value ?? '') : draft;

  const change = (next: string) => {
    if (!controlled) setDraft(next);
    onChange?.(next);
  };

  const reformat = (event: FocusEvent<HTMLInputElement>) => {
    const phone = normalizePhone(event.currentTarget.value);
    const formatted = phone === null ? null : formatPhone(phone);
    if (formatted !== null && formatted !== event.currentTarget.value) change(formatted);
    onBlur?.(event);
  };

  return (
    <Input
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      placeholder={placeholder}
      // sem `+` o número é brasileiro
      prefix={text.trimStart().startsWith('+') ? undefined : DEFAULT_COUNTRY_PREFIX}
      value={text}
      onChange={(event) => change(event.target.value)}
      onBlur={reformat}
      {...props}
    />
  );
}
