import { AREA_SCALE, type AlqueireType, alqueiresToHectares, hectaresToAlqueires } from '@crm/shared';
import { type DecimalInputProps, useDecimalInput } from '../lib/decimal-input.js';
import { Input } from '../primitives/input.js';

// Campo de área, até quatro casas (`numeric(12,4)`). O valor é **sempre em
// hectares**: em alqueire, o campo mostra e aceita alqueires do tipo dado e
// entrega hectares — alqueire é unidade de entrada e exibição, nunca de
// armazenamento (`CONTEXT.md`). `min`/`max` também são em hectares; área
// negativa é inválida a não ser que `min` diga outra coisa.

export type AreaUnit = 'hectare' | 'alqueire';

export type AreaInputProps = DecimalInputProps & {
  /** Unidade em que a pessoa digita e lê; o valor segue em hectares. */
  unit?: AreaUnit;
  /** Tipo de alqueire, como em `tenant_settings`: só conta com `unit="alqueire"`. */
  alqueireType?: AlqueireType;
};

const format = { minScale: 0, maxScale: AREA_SCALE };

const alqueireLabel: Record<AlqueireType, string> = {
  goiano: 'alq. goiano',
  paulista: 'alq. paulista',
  norte: 'alq. do norte',
};

export function AreaInput({ unit = 'hectare', alqueireType = 'goiano', min = '0', ...props }: AreaInputProps) {
  const alqueire = unit === 'alqueire';
  const decimal = useDecimalInput(
    { min, ...props },
    alqueire
      ? {
          scale: AREA_SCALE,
          format,
          toDisplay: (hectares) => hectaresToAlqueires(hectares, alqueireType),
          fromDisplay: (alqueires) => alqueiresToHectares(alqueires, alqueireType),
          displayKey: alqueireType,
        }
      : { scale: AREA_SCALE, format, displayKey: 'hectare' },
  );
  return <Input suffix={alqueire ? alqueireLabel[alqueireType] : 'ha'} {...decimal} />;
}
