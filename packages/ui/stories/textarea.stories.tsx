import type { Meta, StoryObj } from '@storybook/react-vite';
import { Field, Textarea } from '../src/index.js';
import { constrained, Stack } from './support/layout.js';

const meta = {
  title: 'Primitivos/Textarea',
  component: Textarea,
  args: { placeholder: 'Resumo técnico da fazenda', 'aria-label': 'Resumo técnico' },
  decorators: [constrained('md')],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const Estados: Story = {
  name: 'Estados',
  render: () => (
    <Stack>
      <Field label="Resumo técnico" hint="Até 10.000 caracteres">
        <Textarea placeholder="Solo, relevo, água" />
      </Field>
      <Field label="Diferenciais" error="Texto longo demais">
        <Textarea defaultValue="Sede reformada, pista de pouso" />
      </Field>
      <Field label="Observação documental">
        <Textarea disabled defaultValue="Matrícula em regularização" />
      </Field>
      <Field label="Infraestrutura">
        <Textarea rows={8} placeholder="Oito linhas" />
      </Field>
    </Stack>
  ),
};
