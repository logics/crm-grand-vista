import { type MunicipalityOption, type RegionOption, regionKey, regionLabel } from '@crm/shared';
import { AsyncCombobox, type AsyncComboboxPickerProps } from './async-combobox.js';

// Seletor de município sobre o `AsyncCombobox`: a opção é "Rio Verde — GO".
// Com `allowUf`, aceita também a UF inteira ("Goiás (UF)") e devolve
// `{ ibgeCode } | { uf }` — a região de interesse de `buyer_regions`. O valor
// por chave é o código IBGE ou a sigla, que `resolve` hidrata.

export type MunicipalityPickerProps =
  | ({ allowUf?: false } & AsyncComboboxPickerProps<MunicipalityOption>)
  | ({ allowUf: true } & AsyncComboboxPickerProps<RegionOption>);

export function MunicipalityPicker({ allowUf = false, ...props }: MunicipalityPickerProps) {
  // sem `allowUf`, a busca só devolve municípios, e `onChange` só os recebe
  const combobox = props as AsyncComboboxPickerProps<RegionOption>;
  return (
    <AsyncCombobox
      getKey={regionKey}
      getLabel={regionLabel}
      placeholder={allowUf ? 'Escolha o município ou a UF' : 'Escolha o município'}
      searchPlaceholder={allowUf ? 'Buscar município ou UF' : 'Buscar município'}
      {...combobox}
    />
  );
}
