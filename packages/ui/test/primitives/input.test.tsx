// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Input } from '../../src/index.js';

describe('Input', () => {
  it('as props vão para o campo; prefixo e sufixo o ladeiam', async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Área" name="area" prefix="≈" suffix="ha" inputMode="numeric" />);
    const input = screen.getByRole('textbox', { name: 'Área' });
    expect(input).toHaveAttribute('name', 'area');
    await user.type(input, '1200');
    expect(input).toHaveValue('1200');
    expect(screen.getByText('ha')).toBeInTheDocument();
    expect(screen.getByText('≈')).toBeInTheDocument();
  });

  it('`className` vai para a moldura, não para o campo', () => {
    render(<Input aria-label="Busca" className="w-full" />);
    const input = screen.getByRole('textbox');
    expect(input).not.toHaveClass('w-full');
    expect(input.closest('[data-slot=input]')).toHaveClass('w-full');
  });
});
