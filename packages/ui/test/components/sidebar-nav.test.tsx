// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SidebarNav, type SidebarNavItem } from '../../src/index.js';

const items: SidebarNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { section: 'Comercial' },
  { id: 'fazendas', label: 'Fazendas', icon: 'tractor', badge: 128 },
  { id: 'pipeline', label: 'Funil', icon: 'kanban' },
];

describe('SidebarNav', () => {
  it('navegação com a marca, os grupos e o item ativo marcado como página atual', () => {
    render(<SidebarNav items={items} active="fazendas" />);
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
    expect(screen.getByText('Grand Vista')).toBeInTheDocument();
    expect(screen.getByText('Comercial')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fazendas/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
    expect(screen.getByText('128')).toBeInTheDocument();
  });

  it('escolher um item entrega o id', async () => {
    const onSelect = vi.fn();
    render(<SidebarNav items={items} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: 'Funil' }));
    expect(onSelect).toHaveBeenCalledWith('pipeline');
  });

  it('recolhido no trilho de ícones, os itens seguem nomeados e o grupo vira filete', () => {
    render(<SidebarNav items={items} collapsed />);
    expect(screen.getByRole('button', { name: 'Funil' })).toHaveAttribute('title', 'Funil');
    expect(screen.queryByText('Comercial')).toBeNull();
    expect(screen.queryByText('128')).toBeNull();
  });

  it('rodapé com o usuário', () => {
    render(<SidebarNav items={items} footer={<span>Rafael Tavares</span>} />);
    expect(screen.getByText('Rafael Tavares')).toBeInTheDocument();
  });
});
