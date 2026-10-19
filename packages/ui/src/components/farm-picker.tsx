import { type FarmOption, formatHectares, municipalityLabel } from '@crm/shared';
import { AsyncCombobox, type AsyncComboboxPickerProps, AsyncComboboxOption } from './async-combobox.js';

// Seletor de fazenda sobre o `AsyncCombobox`: nome, município e área total.

export type FarmPickerProps = AsyncComboboxPickerProps<FarmOption>;

const farmKey = (farm: FarmOption) => farm.id;
const farmName = (farm: FarmOption) => farm.name;

const renderFarm = (farm: FarmOption) => (
  <AsyncComboboxOption
    title={farm.name}
    detail={
      <span className="gv-num">
        {municipalityLabel(farm.municipality)} · {formatHectares(farm.totalAreaHa)}
      </span>
    }
  />
);

export function FarmPicker(props: FarmPickerProps) {
  return (
    <AsyncCombobox
      getKey={farmKey}
      getLabel={farmName}
      renderItem={renderFarm}
      placeholder="Escolha a fazenda"
      searchPlaceholder="Buscar fazenda"
      createLabel="Cadastrar fazenda"
      {...props}
    />
  );
}
