import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { FarmCard } from '../src/index.js';
import { constrained, Grid } from './support/layout.js';

const meta = {
  title: 'Domínio/FarmCard',
  component: FarmCard,
  args: {
    name: 'Fazenda Boa Esperança',
    location: 'Jaborandi, BA',
    price: 'R$ 62.000',
    priceUnit: '/ ha',
    area: '1.480 ha',
    specs: [
      { icon: 'droplets', value: 'Irrigável' },
      { icon: 'wheat', value: 'Soja · milho' },
      { icon: 'ruler', value: '68 sc/ha' },
    ],
    status: 'Disponível',
    statusTone: 'success',
    onClick: fn(),
  },
} satisfies Meta<typeof FarmCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Largura de uma coluna da grade de fazendas. */
const narrow = [constrained('lg')];

/** Sem foto, o espaço da imagem fica em areia: não se usa imagem genérica no lugar da fazenda. */
export const SemFoto: Story = { name: 'Sem foto', decorators: narrow };

export const ComFoto: Story = {
  name: 'Com foto e destaque',
  // A fachada é a única foto real da marca; aqui só demonstra o espaço da imagem.
  args: { image: '/logo-fachada-grandvista.jpeg', featured: true },
  decorators: narrow,
};

export const Status: Story = {
  render: (args) => (
    <Grid>
      <FarmCard {...args} status="Disponível" statusTone="success" />
      <FarmCard {...args} name="Fazenda Três Barras" status="Em negociação" statusTone="warning" />
      <FarmCard {...args} name="Fazenda Santa Helena" status="Vendida" statusTone="danger" price={undefined} />
    </Grid>
  ),
};
