import { compareDecimal, type DecimalFormat, formatDecimal, parseDecimal } from '@crm/shared';
import { type ChangeEvent, type FocusEvent, useState } from 'react';
import type { InputProps } from '../primitives/input.js';

// Base comum de `MoneyInput`, `AreaInput` e `PercentInput`: um `Input` de
// texto cujo valor é a string decimal canônica de `@crm/shared` (`"1480.5"`),
// nunca `number`. A pessoa digita em pt-BR, com vírgula ou ponto decimal; o
// texto só é reformatado ao sair do campo, para o cursor não pular. Texto que
// não é número marca o campo inválido e não muda o valor; ao sair, o campo
// volta a mostrar o último valor. Valor fora de `min`/`max` é entregue, e o
// campo fica inválido até ser corrigido.

export type DecimalInputProps = Omit<
  InputProps,
  'value' | 'defaultValue' | 'onChange' | 'min' | 'max' | 'type' | 'prefix' | 'suffix'
> & {
  /** Decimal canônico (`"1480.5"`); `null` é vazio. Com ele, o campo é controlado. */
  value?: string | null;
  defaultValue?: string | null;
  /** Recebe o decimal canônico a cada tecla que muda o valor; `null` quando o campo fica vazio. */
  onChange?: (value: string | null) => void;
  /** Limites inclusivos, em decimal canônico; fora deles o campo fica `aria-invalid`. */
  min?: string;
  max?: string;
};

export type DecimalSpec = {
  /** Casas do texto digitado; o que passa é arredondado. */
  scale: number;
  format: DecimalFormat;
  /** Unidade de exibição diferente da do valor: converte do valor para o que se mostra. */
  toDisplay?: (value: string) => string;
  /** E de volta, do que se digitou para o valor. */
  fromDisplay?: (display: string) => string;
  /** Muda quando a unidade de exibição muda, para o texto ser refeito. */
  displayKey?: string;
};

type State = { text: string; value: string | null; unreadable: boolean; displayKey?: string };

const sameDecimal = (a: string | null, b: string | null) =>
  a === null || b === null ? a === b : compareDecimal(a, b) === 0;

/** Liga as props de um campo decimal às do `Input`. */
export function useDecimalInput(
  { value, defaultValue = null, onChange, min, max, onBlur, ...props }: DecimalInputProps,
  { scale, format, toDisplay, fromDisplay, displayKey }: DecimalSpec,
): InputProps {
  const show = (decimal: string | null) =>
    decimal === null ? '' : formatDecimal(toDisplay ? toDisplay(decimal) : decimal, format);

  const initial = value === undefined ? defaultValue : value;
  const [state, setState] = useState<State>(() => ({
    text: show(initial),
    value: initial,
    unreadable: false,
    displayKey,
  }));

  // valor de fora que mudou (controlado) ou unidade nova: o texto é refeito
  const external = value === undefined ? state.value : value;
  if (state.displayKey !== displayKey || !sameDecimal(external, state.value)) {
    setState({ text: show(external), value: external, unreadable: false, displayKey });
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    const parsed = parseDecimal(text, scale);
    if (!parsed.ok) {
      setState({ ...state, text, unreadable: true });
      return;
    }
    const next = parsed.value === null || !fromDisplay ? parsed.value : fromDisplay(parsed.value);
    setState({ text, value: next, unreadable: false, displayKey });
    if (!sameDecimal(next, state.value)) onChange?.(next);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setState((current) => ({ ...current, text: show(current.value), unreadable: false }));
    onBlur?.(event);
  };

  const current = state.value;
  const outOfRange =
    current !== null &&
    ((min !== undefined && compareDecimal(current, min) < 0) ||
      (max !== undefined && compareDecimal(current, max) > 0));

  return {
    inputMode: 'decimal',
    autoComplete: 'off',
    ...props,
    type: 'text',
    value: state.text,
    onChange: handleChange,
    onBlur: handleBlur,
    // só acende: sem erro próprio, vale o do `Field` ou o de quem usa
    'aria-invalid': state.unreadable || outOfRange ? true : props['aria-invalid'],
  };
}
