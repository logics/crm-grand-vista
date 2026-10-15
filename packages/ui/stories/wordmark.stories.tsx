import type { Meta, StoryObj } from '@storybook/react-vite';
import { Wordmark } from '../src/index.js';
import { OnInverse, Stack } from './support/layout.js';

const meta = {
  title: 'Núcleo/Wordmark',
  component: Wordmark,
  args: { size: 'h2', tone: 'dark', descriptor: true },
} satisfies Meta<typeof Wordmark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const SobreVerde: Story = {
  name: 'Sobre verde',
  args: { tone: 'light' },
  render: (args) => (
    <OnInverse>
      <Wordmark {...args} />
    </OnInverse>
  ),
};

export const Tamanhos: Story = {
  render: (args) => (
    <Stack>
      {(['body', 'lg', 'h3', 'h2', 'h1', 'display'] as const).map((size) => (
        <Wordmark key={size} {...args} size={size} />
      ))}
      <Wordmark {...args} descriptor={false} />
    </Stack>
  ),
};
