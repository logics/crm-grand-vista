import { type PersonType, maskTaxId, sanitizeTaxIdInput } from '@crm/shared';
import { type ChangeEvent, useState } from 'react';
import { Input, type InputProps } from '../primitives/input.js';

// Campo de documento do contato, com a máscara do tipo de pessoa: PF é CPF
// (`000.000.000-00`, só dígitos); PJ é CNPJ, numérico ou alfanumérico
// (`AA.AAA.AAA/AAAA-00`, letras em maiúsculas). O valor é o **normalizado**, sem
// pontuação (`"12ABC34501DE35"`), como a API o grava; `null` é vazio. Quem
// valida o documento é o schema de `@crm/shared`, o mesmo da API: o campo só
// impede de digitar o que nunca serve.

export type TaxIdInputProps = Omit<InputProps, 'value' | 'defaultValue' | 'onChange' | 'type' | 'maxLength'> & {
  personType: PersonType;
  /** Documento normalizado; `null` e `""` são vazio. Com ele, o campo é controlado. */
  value?: string | null;
  defaultValue?: string | null;
  /** Recebe o documento normalizado a cada tecla; `null` quando o campo fica vazio. */
  onChange?: (value: string | null) => void;
};

export function TaxIdInput({ personType, value, defaultValue = null, onChange, ...props }: TaxIdInputProps) {
  const [internal, setInternal] = useState(defaultValue ?? '');
  const current = value === undefined ? internal : (value ?? '');

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = sanitizeTaxIdInput(event.target.value, personType);
    setInternal(next);
    onChange?.(next || null);
  };

  return (
    <Input
      inputMode={personType === 'pf' ? 'numeric' : 'text'}
      autoComplete="off"
      autoCapitalize="characters"
      spellCheck={false}
      placeholder={personType === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'}
      {...props}
      type="text"
      value={maskTaxId(current, personType)}
      onChange={handleChange}
    />
  );
}
