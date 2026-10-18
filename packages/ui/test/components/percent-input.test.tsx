// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Field, PercentInput } from '../../src/index.js';

describe('PercentInput', () => {
  it('sufixo %, até quatro casas', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PercentInput aria-label="Comissão" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Comissão' });
    expect(screen.getByText('%')).toBeInTheDocument();
    await user.type(input, '2,123456');
    expect(onChange).toHaveBeenLastCalledWith('2.1235');
    await user.tab();
    expect(input).toHaveValue('2,1235');
  });

  it('de 0 a 100 por padrão', async () => {
    const user = userEvent.setup();
    render(<PercentInput aria-label="Comissão" />);
    const input = screen.getByRole('textbox');
    await user.type(input, '100');
    expect(input).not.toHaveAttribute('aria-invalid');
    await user.type(input, '1');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    await user.clear(input);
    await user.type(input, '-1');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('`min` e `max` configuráveis', async () => {
    const user = userEvent.setup();
    render(<PercentInput aria-label="Variação" min="-50" max="200" />);
    const input = screen.getByRole('textbox');
    await user.type(input, '150');
    expect(input).not.toHaveAttribute('aria-invalid');
    await user.clear(input);
    await user.type(input, '-20');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('o `Field` nomeia o campo; desabilitado não recebe digitação', async () => {
    const user = userEvent.setup();
    render(
      <Field label="Comissão padrão" hint="Das configurações da empresa">
        <PercentInput defaultValue="6" disabled />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Comissão padrão' });
    expect(input).toHaveAccessibleDescription('Das configurações da empresa');
    await user.type(input, '1');
    expect(input).toHaveValue('6');
  });
});
