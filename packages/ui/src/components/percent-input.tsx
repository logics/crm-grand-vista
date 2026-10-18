import { PERCENT_SCALE } from '@crm/shared';
import { type DecimalInputProps, useDecimalInput } from '../lib/decimal-input.js';
import { Input } from '../primitives/input.js';

// Campo de percentual: sufixo "%", até quatro casas (`numeric(7,4)`), de 0 a
// 100 a não ser que `min`/`max` digam outra coisa. O valor é o percentual, não
// a fração: `"18"` é 18%. Aceita ponto ou vírgula decimal e mostra vírgula: o
// ponto digitado vira vírgula, porque até 100 ele nunca é milhar.

export type PercentInputProps = DecimalInputProps;

const format = { minScale: 0, maxScale: PERCENT_SCALE };

export function PercentInput({ min = '0', max = '100', ...props }: PercentInputProps) {
  return <Input suffix="%" {...useDecimalInput({ min, max, ...props }, { format, dotAsDecimal: true })} />;
}
