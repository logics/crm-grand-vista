import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SidebarNav } from '../src/index.js';

const meta = {
  title: 'Navegação/SidebarNav',
  component: SidebarNav,
  parameters: { layout: 'fullscreen' },
  args: {
    active: 'fazendas',
    onSelect: fn(),
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
      { section: 'Comercial' },
      { id: 'fazendas', label: 'Fazendas', icon: 'tractor', badge: 128 },
      { id: 'compradores', label: 'Compradores', icon: 'users' },
      { id: 'funil', label: 'Funil', icon: 'kanban', badge: 3 },
      { section: 'Administração' },
      { id: 'perfis', label: 'Perfis de acesso', icon: 'user-round-cog' },
    ],
    footer: <span className="text-xs text-text-faint">Milson Sousa</span>,
  },
  decorators: [(Story) => <div className="flex h-[calc(16*var(--space-10))] bg-surface-page p-5">{Story()}</div>],
} satisfies Meta<typeof SidebarNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expandida: Story = {};

export const Recolhida: Story = { args: { collapsed: true } };
