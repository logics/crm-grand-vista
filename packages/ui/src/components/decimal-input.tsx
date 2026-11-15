import { type DecimalInputProps, useDecimalInput } from '../lib/decimal-input.js';
import { Input } from '../primitives/input.js';

// Campo de quantidade decimal genérica (sacas, distâncias, toneladas): só as
// casas que o valor tem, até `scale`, com sufixo opcional. O valor é a string
// decimal canônica, nunca `number` (`lib/decimal-input`). Para dinheiro, área e
// percentual há campos próprios.

export type DecimalFieldProps = DecimalInputProps & {
  /** Casas no máximo, como na coluna `numeric(p, scale)`; o que passa é arredondado. */
  scale?: number;
  /** Unidade mostrada depois do número, como "sacas". */
  suffix?: string;
};

export function DecimalInput({ scale = 4, suffix, min = '0', ...props }: DecimalFieldProps) {
  const decimal = useDecimalInput({ min, ...props }, { format: { minScale: 0, maxScale: scale } });
  return <Input {...(suffix ? { suffix } : {})} {...decimal} />;
}
