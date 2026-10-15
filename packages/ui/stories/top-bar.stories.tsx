import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, IconButton, Input, TopBar } from '../src/index.js';

const meta = {
  title: 'Navegação/TopBar',
  component: TopBar,
  args: {
    breadcrumb: 'Comercial · Fazendas',
    title: 'Fazenda Três Barras',
    search: <Input icon="search" pill size="sm" placeholder="Buscar" aria-label="Buscar" />,
    actions: (
      <>
        <IconButton icon="bell" label="Notificações" dot />
        <Button icon="plus">Cadastrar fazenda</Button>
      </>
    ),
  },
} satisfies Meta<typeof TopBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const SoBusca: Story = { name: 'Só busca', args: { breadcrumb: undefined, title: undefined } };

export const SoTitulo: Story = { name: 'Só título', args: { breadcrumb: undefined, search: undefined } };
