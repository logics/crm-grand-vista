import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Tag } from '../src/index.js';
import { Row } from './support/layout.js';

const meta = {
  title: 'Núcleo/Tag',
  component: Tag,
  args: { children: 'Alto Paranaíba', icon: 'map-pin', selected: false },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = { name: 'Padrão' };

export const Estados: Story = {
  render: (args) => (
    <Row>
      <Tag {...args} icon={undefined}>
        Soja
      </Tag>
      <Tag {...args} selected icon="wheat">
        Milho
      </Tag>
      <Tag {...args} onRemove={fn()}>
        Oeste baiano
      </Tag>
      <Tag {...args} selected icon={undefined} onRemove={fn()}>
        Pecuária
      </Tag>
    </Row>
  ),
};
