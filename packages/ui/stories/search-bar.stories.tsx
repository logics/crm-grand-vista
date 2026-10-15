import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SearchBar, Tag } from '../src/index.js';

const meta = {
  title: 'Formulário/SearchBar',
  component: SearchBar,
  args: { placeholder: 'Buscar fazenda, região ou matrícula', onSubmit: fn() },
} satisfies Meta<typeof SearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const ComFiltros: Story = {
  name: 'Com filtros',
  args: {
    filters: (
      <>
        <Tag icon="map-pin">Oeste baiano</Tag>
        <Tag icon="wheat">Soja</Tag>
      </>
    ),
  },
};

export const SemMoldura: Story = { name: 'Sem moldura', args: { bare: true } };
