// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DecimalInput } from '../../src/index.js';

describe('DecimalInput', () => {
  it('mostra o sufixo e entrega o decimal canônico, arredondado em `scale` casas', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DecimalInput aria-label="Sacas" suffix="sacas" scale={2} onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Sacas' });
    expect(screen.getByText('sacas')).toBeInTheDocument();
    await user.type(input, '7.000,129');
    expect(onChange).toHaveBeenLastCalledWith('7000.13');
    await user.tab();
    expect(input).toHaveValue('7.000,13');
  });

  it('valor do banco aparece em pt-BR, só com as casas que tem', () => {
    render(<DecimalInput aria-label="Sacas" value="7000.5000" />);
    expect(screen.getByRole('textbox', { name: 'Sacas' })).toHaveValue('7.000,5');
  });

  it('campo limpo entrega null', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DecimalInput aria-label="Sacas" defaultValue="10" onChange={onChange} />);
    await user.clear(screen.getByRole('textbox', { name: 'Sacas' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
