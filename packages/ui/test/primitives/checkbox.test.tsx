// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from '../../src/index.js';

describe('Checkbox', () => {
  it('é uma caixa de seleção acessível que Espaço alterna', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <label>
        <Checkbox onCheckedChange={onCheckedChange} /> CAR válido
      </label>,
    );
    const box = screen.getByRole('checkbox', { name: 'CAR válido' });

    await user.tab();
    await user.keyboard(' ');
    expect(box).toBeChecked();
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    await user.keyboard(' ');
    expect(box).not.toBeChecked();
  });

  it('estado parcial é anunciado como misto', () => {
    render(<Checkbox checked="indeterminate" aria-label="Todos os documentos" />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed');
  });
});
