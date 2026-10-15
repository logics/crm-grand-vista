import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from '../src/index.js';
import { Stack } from './support/layout.js';

const meta = {
  title: 'Primitivos/Input',
  component: Input,
  args: { placeholder: 'Nome da fazenda', size: 'md', 'aria-label': 'Nome da fazenda' },
  decorators: [(Story) => <div className="max-w-[calc(8*var(--space-10))]">{Story()}</div>],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const Molduras: Story = {
  render: (args) => (
    <Stack>
      <Input {...args} icon="search" placeholder="Buscar fazenda, comprador, matrícula" />
      <Input {...args} prefix="R$" placeholder="62.000" aria-label="Valor por hectare" />
      <Input {...args} suffix="ha" placeholder="1.480" aria-label="Área total" />
      <Input {...args} icon="search" pill placeholder="Buscar" aria-label="Buscar" />
    </Stack>
  ),
};

export const TamanhosEEstados: Story = {
  name: 'Tamanhos e estados',
  render: (args) => (
    <Stack>
      <Input {...args} size="sm" placeholder="Pequeno" />
      <Input {...args} size="md" placeholder="Médio" />
      <Input {...args} size="lg" placeholder="Grande" />
      <Input {...args} aria-invalid defaultValue="contato@" aria-label="E-mail" />
      <Input {...args} disabled defaultValue="Fazenda Três Barras" />
    </Stack>
  ),
};
