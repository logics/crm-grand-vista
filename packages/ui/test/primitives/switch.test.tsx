// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from '../../src/index.js';

describe('Switch', () => {
  it('é um switch acessível que Espaço alterna', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <label>
        <Switch onCheckedChange={onCheckedChange} /> Publicar no site
      </label>,
    );
    const toggle = screen.getByRole('switch', { name: 'Publicar no site' });
    expect(toggle).not.toBeChecked();

    await user.tab();
    await user.keyboard(' ');
    expect(toggle).toBeChecked();
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
  });

  it('desabilitado não alterna', async () => {
    const user = userEvent.setup();
    render(<Switch disabled aria-label="Alertas de pendência" />);
    await user.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch')).not.toBeChecked();
  });
});
