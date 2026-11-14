import { LEVELS, LEVEL_LABELS, type Level } from '@crm/shared';
import type { ComponentProps } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select.js';

// O Radix não aceita `value=""` em item: "Não informado" usa este sentinela, que
// nunca sai do componente (a saída é `null`).
const NOT_INFORMED = 'none';

export interface LevelSelectProps
  extends Omit<ComponentProps<typeof SelectTrigger>, 'value' | 'onChange' | 'defaultValue' | 'children'> {
  value: Level | null;
  onChange: (value: Level | null) => void;
}

/**
 * Escolha de um nível (Alta, Média, Baixa) ou de "Não informado", que entrega
 * `null`. Sobre o `Select`: o `Field` que o envolve nomeia o gatilho.
 */
export function LevelSelect({ value, onChange, disabled, ...trigger }: LevelSelectProps) {
  return (
    <Select
      value={value ?? NOT_INFORMED}
      onValueChange={(next) => onChange(next === NOT_INFORMED ? null : (next as Level))}
      disabled={disabled}
    >
      <SelectTrigger {...trigger}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NOT_INFORMED}>Não informado</SelectItem>
        {LEVELS.map((level) => (
          <SelectItem key={level} value={level}>
            {LEVEL_LABELS[level]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
