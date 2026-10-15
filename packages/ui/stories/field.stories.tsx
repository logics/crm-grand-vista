import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox, Field, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from '../src/index.js';
import { Stack } from './support/layout.js';

const meta = {
  title: 'Formulário/Field',
  component: Field,
  args: {
    label: 'Valor por hectare útil',
    hint: 'Sem impostos; a unidade vai no sufixo.',
    required: false,
    orientation: 'vertical',
    children: <Input prefix="R$" placeholder="62.000" />,
  },
  decorators: [(Story) => <div className="max-w-[calc(9*var(--space-10))]">{Story()}</div>],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const Obrigatorio: Story = { name: 'Obrigatório', args: { required: true } };

export const ComErro: Story = {
  name: 'Com erro',
  args: {
    label: 'E-mail',
    hint: undefined,
    error: 'Informe um e-mail válido.',
    children: <Input type="email" defaultValue="contato@" />,
  },
};

export const ControlesAninhados: Story = {
  name: 'Controles aninhados',
  render: () => (
    <Stack>
      <Field label="Estado" hint="Onde fica a sede da fazenda.">
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mg">Minas Gerais</SelectItem>
            <SelectItem value="ba">Bahia</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field orientation="horizontal" label="CAR válido" hint="Conferido no SICAR.">
        <Checkbox />
      </Field>
      <Field orientation="horizontal" label="Receber alertas de inércia">
        <Switch defaultChecked />
      </Field>
    </Stack>
  ),
};
