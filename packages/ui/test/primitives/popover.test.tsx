// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Popover, PopoverContent, PopoverTrigger } from '../../src/index.js';

describe('Popover', () => {
  it('abre pelo teclado, leva o foco para dentro e Escape o devolve ao gatilho', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Filtros</PopoverTrigger>
        <PopoverContent aria-label="Filtros">
          <input aria-label="Hectares mínimos" />
        </PopoverContent>
      </Popover>,
    );
    const trigger = screen.getByRole('button', { name: 'Filtros' });
    await user.tab();
    await user.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });
});
