// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchBar, Tag } from '../../src/index.js';

describe('SearchBar', () => {
  it('é uma região de busca; Enter envia o termo sem recarregar a página', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SearchBar placeholder="Fazenda, município ou proprietário" onSubmit={onSubmit} />);
    expect(screen.getByRole('search')).toBeInTheDocument();
    await user.type(screen.getByRole('searchbox', { name: 'Fazenda, município ou proprietário' }), 'Santa Helena{Enter}');
    expect(onSubmit).toHaveBeenCalledOnce();
    const [query, event] = onSubmit.mock.calls[0]!;
    expect(query).toBe('Santa Helena');
    expect(event.defaultPrevented).toBe(true);
  });

  it('o botão envia, com o rótulo dado; os filtros ficam entre o campo e o botão', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<SearchBar buttonLabel="Filtrar" filters={<Tag>Soja</Tag>} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Filtrar' }));
    expect(onSubmit).toHaveBeenCalledWith('', expect.anything());
    const form = screen.getByRole('search');
    const order = [...form.querySelectorAll('input, [data-slot=tag], button')].map((element) => element.tagName);
    expect(order).toEqual(['INPUT', 'SPAN', 'BUTTON']);
  });

  it('o campo aceita props de quem usa, como valor controlado', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchBar inputProps={{ value: 'Café', onChange, name: 'termo' }} />);
    const input = screen.getByRole('searchbox');
    expect(input).toHaveValue('Café');
    expect(input).toHaveAttribute('name', 'termo');
    await user.type(input, 'x');
    expect(onChange).toHaveBeenCalled();
  });
});
