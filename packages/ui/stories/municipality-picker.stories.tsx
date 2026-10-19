import { type MunicipalityOption, type RegionOption, UFS, regionKey, regionLabel } from '@crm/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { type AsyncComboboxSearch, Field, MunicipalityPicker } from '../src/index.js';
import { constrained } from './support/layout.js';
import { answersEmpty, fails, neverAnswers, simulatedResolve, simulatedSearch } from './support/search.js';

const municipalities: MunicipalityOption[] = [
  { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO' },
  { ibgeCode: '5211909', name: 'Jataí', uf: 'GO' },
  { ibgeCode: '5206206', name: 'Cristalina', uf: 'GO' },
  { ibgeCode: '5107925', name: 'Sorriso', uf: 'MT' },
  { ibgeCode: '5107040', name: 'Primavera do Leste', uf: 'MT' },
  { ibgeCode: '2919553', name: 'Luís Eduardo Magalhães', uf: 'BA' },
  { ibgeCode: '2903201', name: 'Barreiras', uf: 'BA' },
  { ibgeCode: '3170404', name: 'Unaí', uf: 'MG' },
  { ibgeCode: '3148004', name: 'Patos de Minas', uf: 'MG' },
  { ibgeCode: '2101400', name: 'Balsas', uf: 'MA' },
  { ibgeCode: '2211209', name: 'Uruçuí', uf: 'PI' },
];

/** As UFs antes dos municípios: "goi" acha a UF inteira primeiro. */
const regions: RegionOption[] = [...UFS.map((uf) => ({ uf })), ...municipalities];

const searchMunicipalities = simulatedSearch(municipalities, regionLabel);
const searchRegions = simulatedSearch(regions, regionLabel);
const resolveMunicipalities = simulatedResolve(municipalities, regionKey);
const resolveRegions = simulatedResolve(regions, regionKey);

type SingleArgs = {
  search?: AsyncComboboxSearch<MunicipalityOption>;
  initial?: MunicipalityOption | string | null;
  error?: string;
  disabled?: boolean;
  defaultOpen?: boolean;
};

function MunicipalityField({ search = searchMunicipalities, initial = null, error, ...props }: SingleArgs) {
  const [value, setValue] = useState<MunicipalityOption | string | null>(initial);
  return (
    <Field label="Município" error={error}>
      <MunicipalityPicker search={search} resolve={resolveMunicipalities} value={value} onChange={setValue} {...props} />
    </Field>
  );
}

function MunicipalitiesField({ initial = [] }: { initial?: Array<MunicipalityOption | string> }) {
  const [value, setValue] = useState<Array<MunicipalityOption | string>>(initial);
  return (
    <Field label="Municípios atendidos">
      <MunicipalityPicker
        multiple
        search={searchMunicipalities}
        resolve={resolveMunicipalities}
        value={value}
        onChange={setValue}
      />
    </Field>
  );
}

function RegionsField({ initial = [], defaultOpen }: { initial?: Array<RegionOption | string>; defaultOpen?: boolean }) {
  const [value, setValue] = useState<Array<RegionOption | string>>(initial);
  return (
    <Field label="Regiões de interesse" hint="Uma UF inteira ou municípios avulsos">
      <MunicipalityPicker
        allowUf
        multiple
        search={searchRegions}
        resolve={resolveRegions}
        value={value}
        onChange={setValue}
        defaultOpen={defaultOpen}
      />
    </Field>
  );
}

// Aberto, o conteúdo cobre a página de documentação: as stories ficam só no canvas.
const meta = {
  title: 'Formulário/MunicipalityPicker',
  component: MunicipalityField,
  tags: ['!autodocs'],
  decorators: [constrained('md')],
} satisfies Meta<typeof MunicipalityField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unico: Story = { name: 'Único', args: { initial: municipalities[0]! } };

export const Aberto: Story = { args: { defaultOpen: true } };

export const ValorPorCodigo: Story = { name: 'Valor por código IBGE', args: { initial: '5107925' } };

export const Multiplos: Story = {
  name: 'Múltiplos municípios',
  render: () => <MunicipalitiesField initial={[municipalities[0]!, '5211909']} />,
};

export const UfEMunicipios: Story = {
  name: 'UF e municípios',
  render: () => <RegionsField initial={[{ uf: 'GO' }, 'MT', '3170404']} />,
};

export const UfEMunicipiosAberto: Story = {
  name: 'UF e municípios aberto',
  render: () => <RegionsField initial={[{ uf: 'GO' }]} defaultOpen />,
};

export const Carregando: Story = { args: { search: neverAnswers(), defaultOpen: true } };

export const Vazio: Story = { args: { search: answersEmpty(), defaultOpen: true } };

export const Erro: Story = { args: { search: fails(), defaultOpen: true } };

export const Desabilitado: Story = { args: { initial: municipalities[0]!, disabled: true } };

export const Invalido: Story = { name: 'Inválido', args: { error: 'Informe o município da fazenda' } };
