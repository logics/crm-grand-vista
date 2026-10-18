import { MONEY_SCALE } from '@crm/shared';
import { type DecimalInputProps, useDecimalInput } from '../lib/decimal-input.js';
import { Input } from '../primitives/input.js';

// Campo de dinheiro: prefixo "R$" e sempre duas casas (`numeric(16,2)`). Formata
// a cada tecla, com os centavos entrando pela direita: 1, 4, 8, 0, 5, 0 dá
// "1.480,50". O valor é a string decimal canônica, nunca `number`
// (`lib/decimal-input`).

export type MoneyInputProps = DecimalInputProps;

const format = { minScale: MONEY_SCALE, maxScale: MONEY_SCALE };

export function MoneyInput(props: MoneyInputProps) {
  return <Input prefix="R$" {...useDecimalInput(props, { format, shifted: true })} />;
}
