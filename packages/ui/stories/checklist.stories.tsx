import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, ChecklistItem, ChecklistPanel } from '../src/index.js';

const meta = {
  title: 'Domínio/ChecklistPanel',
  component: ChecklistPanel,
  args: { title: 'Due diligence jurídica', done: 2, total: 5 },
  decorators: [(Story) => <div className="max-w-[calc(12*var(--space-10))]">{Story()}</div>],
} satisfies Meta<typeof ChecklistPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Os quatro estados do item, no painel com contagem e barra de conclusão. */
export const Painel: Story = {
  args: { action: <Button variant="ghost" size="sm" icon="plus">Adicionar item</Button> },
  render: (args) => (
    <ChecklistPanel {...args}>
      <ChecklistItem state="ok" label="Matrícula atualizada" meta="Conferida em 12/03" badge="Concluído" />
      <ChecklistItem state="ok" label="CCIR" meta="Exercício 2026" badge="Concluído" />
      <ChecklistItem
        state="pending"
        label="Certidão de ônus reais"
        meta="Solicitada ao cartório"
        badge="Pendente"
        action={<Button variant="ghost" size="sm">Cobrar</Button>}
      />
      <ChecklistItem state="blocked" label="CAR" meta="Sobreposição com área vizinha" badge="Bloqueado" />
      <ChecklistItem state="empty" label="Georreferenciamento" badge="Não iniciado" />
    </ChecklistPanel>
  ),
};

export const SemContagem: Story = {
  name: 'Sem contagem',
  args: { done: undefined, total: undefined, title: 'Documentos do comprador' },
  render: (args) => (
    <ChecklistPanel {...args}>
      <ChecklistItem state="ok" label="Comprovante de capacidade financeira" />
      <ChecklistItem state="empty" label="Procuração" />
    </ChecklistPanel>
  ),
};
