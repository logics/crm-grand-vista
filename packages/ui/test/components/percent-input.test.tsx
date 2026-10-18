// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
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

  it('valor como vem do banco (`numeric(7,4)`) aparece em pt-BR; a edição volta canônica', async () => {
    const user = userEvent.setup();
    function Form() {
      const [value, setValue] = useState<string | null>('12.5000');
      return (
        <>
          <PercentInput aria-label="Comissão" value={value} onChange={setValue} />
          <output aria-label="valor">{String(value)}</output>
        </>
      );
    }
    render(<Form />);
    const input = screen.getByRole('textbox', { name: 'Comissão' });
    expect(input).toHaveValue('12,5');
    await user.type(input, '25');
    expect(screen.getByRole('status', { name: 'valor' })).toHaveTextContent('12.525');
  });

  it('vírgula é o separador decimal: ponto como decimal é inválido e não muda o valor', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PercentInput aria-label="Comissão" defaultValue="6" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await user.clear(input);
    onChange.mockClear();
    await user.type(input, '12.5');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(onChange).toHaveBeenLastCalledWith('12');
    await user.tab();
    expect(input).toHaveValue('12');
    expect(input).not.toHaveAttribute('aria-invalid');
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
