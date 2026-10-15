import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../src/index.js';
import { Row, Stack } from './support/layout.js';

const meta = {
  title: 'Núcleo/Button',
  component: Button,
  args: { children: 'Cadastrar fazenda', variant: 'primary', size: 'md' },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const Variantes: Story = {
  render: (args) => (
    <Row>
      <Button {...args} variant="primary" icon="plus">
        Cadastrar fazenda
      </Button>
      <Button {...args} variant="accent">
        Enviar oportunidade
      </Button>
      <Button {...args} variant="secondary" icon="download">
        Exportar
      </Button>
      <Button {...args} variant="soft">
        Limpar filtros
      </Button>
      <Button {...args} variant="dark">
        Ver no mapa
      </Button>
      <Button {...args} variant="ghost">
        Cancelar
      </Button>
      <Button {...args} variant="danger" icon="x">
        Excluir
      </Button>
    </Row>
  ),
};

export const Tamanhos: Story = {
  render: (args) => (
    <Row>
      <Button {...args} size="sm">
        Pequeno
      </Button>
      <Button {...args} size="md">
        Médio
      </Button>
      <Button {...args} size="lg">
        Grande
      </Button>
    </Row>
  ),
};

export const Estados: Story = {
  render: (args) => (
    <Stack>
      <Row>
        <Button {...args} variant="primary" count={3}>
          Pendências
        </Button>
        <Button {...args} variant="secondary" count={12}>
          Filtros
        </Button>
        <Button {...args} variant="secondary" iconRight="chevron-right">
          Próxima etapa
        </Button>
        <Button {...args} disabled>
          Desabilitado
        </Button>
        <Button {...args} variant="secondary" disabled>
          Desabilitado
        </Button>
      </Row>
      <Button {...args} block size="lg">
        Largura total
      </Button>
    </Stack>
  ),
};
