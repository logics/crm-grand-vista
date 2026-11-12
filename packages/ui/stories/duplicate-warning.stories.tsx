import type { Meta, StoryObj } from '@storybook/react-vite';
import { DuplicateWarning, type DuplicateWarningLink } from '../src/index.js';

// Na aplicação, o link é o do roteador; na vitrine, uma âncora.
const Anchor: DuplicateWarningLink = (props) => <a {...props} />;

const meta = {
  title: 'Feedback/DuplicateWarning',
  component: DuplicateWarning,
  args: {
    title: 'Já existe um cadastro parecido com este. Confira antes de salvar.',
    label: 'Possível cadastro duplicado',
    linkComponent: Anchor,
    onSaveAnyway: () => {},
    items: [{ id: '1', label: 'Maria Souza', reasons: ['Mesmo WhatsApp'], href: '#maria' }],
  },
} satisfies Meta<typeof DuplicateWarning>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UmItem: Story = { name: 'Um item' };

export const VariosItens: Story = {
  name: 'Vários itens',
  args: {
    title: 'Já existem cadastros parecidos com este. Confira antes de salvar.',
    items: [
      { id: '1', label: 'Maria Souza', reasons: ['Mesmo WhatsApp', 'Mesmo telefone'], href: '#maria' },
      { id: '2', label: 'Maria de Souza Lima', reasons: ['Mesmo documento'], href: '#maria-lima' },
    ],
  },
};

export const Desabilitado: Story = { args: { disabled: true } };
