// @vitest-environment jsdom
import '../support/dom.js';
import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { pressable } from '../../src/lib/pressable.js';

describe('pressable', () => {
  it('sem onClick, o elemento não vira botão nem entra na ordem de tabulação', () => {
    render(<div data-testid="alvo" {...pressable({})} />);
    expect(screen.getByTestId('alvo')).not.toHaveAttribute('role');
    expect(screen.getByTestId('alvo')).not.toHaveAttribute('tabindex');
  });

  it('com onClick, é um botão focável que Enter e Espaço acionam', async () => {
    const onClick = vi.fn();
    render(<article {...pressable({ onClick })}>Fazenda</article>);
    const card = screen.getByRole('button', { name: 'Fazenda' });
    await userEvent.tab();
    expect(card).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('sem papel de botão, quando o elemento já tem semântica (linha de tabela)', () => {
    render(
      <table>
        <tbody>
          <tr data-testid="linha" {...pressable({ onClick: () => {} }, null)}>
            <td>Três Barras</td>
          </tr>
        </tbody>
      </table>,
    );
    expect(screen.getByTestId('linha')).not.toHaveAttribute('role');
    expect(screen.getByTestId('linha')).toHaveAttribute('tabindex', '0');
  });

  it('tecla vinda de um filho não aciona o elemento, e o onKeyDown de quem usa continua sendo chamado', () => {
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    render(
      <div {...pressable({ onClick, onKeyDown })}>
        <input aria-label="Filho" />
      </div>,
    );
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Filho' }), { key: 'Enter' });
    expect(onClick).not.toHaveBeenCalled();
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });
});
