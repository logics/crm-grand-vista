import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, EmptyState } from '../src/index.js';

const meta = {
  title: 'Feedback/EmptyState',
  component: EmptyState,
  args: {
    icon: 'search-x',
    title: 'Nenhuma fazenda compatível',
    description: 'Ajuste a faixa de valor ou as regiões de interesse do comprador.',
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const ComAcao: Story = {
  name: 'Com ação',
  args: { action: <Button variant="secondary">Limpar filtros</Button> },
};

export const Compacto: Story = {
  args: { compact: true, icon: 'inbox', title: 'Sem atividades', description: undefined },
};
