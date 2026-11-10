import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContactShortcuts } from '../src/index.js';

const meta = {
  title: 'Contatos/ContactShortcuts',
  component: ContactShortcuts,
  args: { name: 'João Batista Ferreira' },
} satisfies Meta<typeof ContactShortcuts>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Completo: Story = {
  args: { phone: '+5564999990000', whatsapp: '+5564999990000', email: 'joao@exemplo.com' },
};

export const SoWhatsApp: Story = {
  name: 'Só WhatsApp',
  args: { whatsapp: '+351912345678' },
};

export const SoTelefone: Story = {
  name: 'Só telefone',
  args: { phone: '+556433334444' },
};
