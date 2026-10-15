// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StageStepper } from '../../src/index.js';

const stages = [
  'Lead recebido',
  'Qualificação',
  'Levantamento de perfil',
  'Apresentação de opções',
  'Visita técnica',
];

describe('StageStepper', () => {
  it('uma etapa por item; a atual é marcada e as anteriores, concluídas', () => {
    render(<StageStepper stages={stages} current={2} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items[2]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).toHaveAttribute('data-state', 'done');
    expect(items[2]).toHaveAttribute('data-state', 'current');
    expect(items[4]).toHaveAttribute('data-state', 'upcoming');
    expect(within(items[0]!).getByText('Lead recebido')).toBeInTheDocument();
  });

  it('sem onSelect, é só leitura; com ele, cada etapa é um botão que entrega o índice', async () => {
    const { rerender } = render(<StageStepper stages={stages} current={1} />);
    expect(screen.queryByRole('button')).toBeNull();
    const onSelect = vi.fn();
    rerender(<StageStepper stages={stages} current={1} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: 'Visita técnica' }));
    expect(onSelect).toHaveBeenCalledWith(4);
  });

  it('compacto: só as barras, a etapa atual e "etapa N de M"', async () => {
    const onSelect = vi.fn();
    render(<StageStepper compact stages={stages} current={3} onSelect={onSelect} />);
    expect(screen.getByText('Apresentação de opções')).toBeInTheDocument();
    expect(screen.getByText('etapa 4 de 5')).toBeInTheDocument();
    expect(screen.queryByText('Lead recebido')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Qualificação' }));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
