import { FIELD_REGISTRY, QUALIFICATION_LEVELS, QUALIFICATION_LEVEL_LABELS, type QualificationLevel } from '@crm/shared';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@crm/ui';

const fields = FIELD_REGISTRY.buyer_profiles.fields;
// Sentinela do Radix, que não aceita `value=""`: nunca sai do componente (a saída é `null`).
const NOT_INFORMED = 'none';

/** Grau de qualificação: os quatro rótulos ou "Não informado" (`null`). */
export function QualificationSelect({
  value,
  onChange,
  onBlur,
}: {
  value: QualificationLevel | null;
  onChange: (value: QualificationLevel | null) => void;
  onBlur?: () => void;
}) {
  return (
    <Select
      value={value ?? NOT_INFORMED}
      onValueChange={(next) => onChange(next === NOT_INFORMED ? null : (next as QualificationLevel))}
    >
      <SelectTrigger aria-label={fields.qualification_level.label} onBlur={onBlur}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NOT_INFORMED}>Não informado</SelectItem>
        {QUALIFICATION_LEVELS.map((level) => (
          <SelectItem key={level} value={level}>
            {QUALIFICATION_LEVEL_LABELS[level]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
