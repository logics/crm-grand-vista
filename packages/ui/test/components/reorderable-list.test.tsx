// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ReorderableList } from '../../src/index.js';

const initial = [
  { id: 'a', name: 'Prospecção' },
  { id: 'b', name: 'Proposta' },
  { id: 'c', name: 'Fechamento' },
];

function Harness({ onReorder, disabled }: { onReorder?: (ids: string[]) => void; disabled?: boolean }) {
  const [items, setItems] = useState(initial);
  return (
    <ReorderableList
      aria-label="Etapas"
      items={items}
      getId={(item) => item.id}
      getLabel={(item) => item.name}
      renderItem={(item) => item.name}
      disabled={disabled}
      onReorder={
        onReorder &&
        ((ids) => {
          onReorder(ids);
          setItems(ids.map((id) => items.find((item) => item.id === id)!));
        })
      }
    />
  );
}

const names = () => within(screen.getByRole('list', { name: 'Etapas' })).getAllByRole('listitem').map((li) => li.textContent);

describe('ReorderableList', () => {
  it('mostra os itens na ordem recebida', () => {
    render(<Harness onReorder={() => {}} />);
    expect(names()).toEqual(['Prospecção', 'Proposta', 'Fechamento']);
  });

  it('os botões movem para cima e para baixo e entregam a nova ordem', async () => {
    const onReorder = vi.fn();
    const user = userEvent.setup();
    render(<Harness onReorder={onReorder} />);

    await user.click(screen.getByRole('button', { name: 'Mover Prospecção para baixo' }));
    expect(onReorder).toHaveBeenLastCalledWith(['b', 'a', 'c']);
    expect(names()).toEqual(['Proposta', 'Prospecção', 'Fechamento']);

    await user.click(screen.getByRole('button', { name: 'Mover Fechamento para cima' }));
    expect(onReorder).toHaveBeenLastCalledWith(['b', 'c', 'a']);
  });

  it('as pontas não podem sair da lista e o foco segue o item movido', async () => {
    const user = userEvent.setup();
    render(<Harness onReorder={() => {}} />);
    expect(screen.getByRole('button', { name: 'Mover Prospecção para cima' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mover Fechamento para baixo' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Mover Proposta para cima' }));
    // chegou ao topo: o botão de subir ficou desabilitado e o foco vai ao de descer
    expect(screen.getByRole('button', { name: 'Mover Proposta para baixo' })).toHaveFocus();
  });

  it('a alça move pelo teclado: Espaço pega, seta move, Espaço solta', async () => {
    const onReorder = vi.fn();
    const user = userEvent.setup();
    render(<Harness onReorder={onReorder} />);

    screen.getByRole('button', { name: 'Mover Prospecção' }).focus();
    await user.keyboard(' ');
    await user.keyboard('{ArrowDown}');
    await user.keyboard(' ');
    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c']);
    expect(screen.getAllByRole('status').map((s) => s.textContent)).toContain('Prospecção solto na posição 2 de 3.');
  });

  it('anuncia o movimento pelos botões', async () => {
    const user = userEvent.setup();
    render(<Harness onReorder={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Mover Prospecção para baixo' }));
    expect(screen.getAllByRole('status').map((s) => s.textContent)).toContain(
      'Prospecção movido para a posição 2 de 3.',
    );
  });

  it('sem onReorder ou desabilitada, não oferece controles', () => {
    const { rerender } = render(<Harness />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<Harness onReorder={() => {}} disabled />);
    expect(screen.queryByRole('button', { name: /para (cima|baixo)/ })).toBeNull();
  });
});
