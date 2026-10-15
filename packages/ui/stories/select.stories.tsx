import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../src/index.js';
import { Row } from './support/layout.js';

const states = (
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Centro-Oeste</SelectLabel>
      <SelectItem value="go">Goiás</SelectItem>
      <SelectItem value="mt">Mato Grosso</SelectItem>
    </SelectGroup>
    <SelectSeparator />
    <SelectGroup>
      <SelectLabel>Sudeste</SelectLabel>
      <SelectItem value="mg">Minas Gerais</SelectItem>
      <SelectItem value="sp" disabled>
        São Paulo
      </SelectItem>
    </SelectGroup>
  </SelectContent>
);

// Aberto, o conteúdo cobre a página de documentação: as stories ficam só no canvas.
const meta = {
  title: 'Primitivos/Select',
  component: Select,
  tags: ['!autodocs'],
  args: { defaultValue: 'mg' },
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-[calc(6*var(--space-10))]" aria-label="Estado">
        <SelectValue placeholder="Todos os estados" />
      </SelectTrigger>
      {states}
    </Select>
  ),
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const Aberto: Story = { args: { open: true } };

export const TamanhosEEstados: Story = {
  name: 'Tamanhos e estados',
  render: () => (
    <Row>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <Select key={size}>
          <SelectTrigger size={size} aria-label="Estado">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          {states}
        </Select>
      ))}
      <Select>
        <SelectTrigger aria-invalid aria-label="Estado">
          <SelectValue placeholder="Obrigatório" />
        </SelectTrigger>
        {states}
      </Select>
      <Select disabled defaultValue="go">
        <SelectTrigger aria-label="Estado">
          <SelectValue />
        </SelectTrigger>
        {states}
      </Select>
    </Row>
  ),
};
