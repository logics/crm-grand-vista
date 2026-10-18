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

  it('ponto digitado vira vírgula: no percentual ele só pode ser decimal', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PercentInput aria-label="Comissão" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await user.type(input, '12.5');
    expect(input).toHaveValue('12,5');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(onChange).toHaveBeenLastCalledWith('12.5');
  });

  it('o ponto vira vírgula no lugar em que entrou, sem o cursor pular', async () => {
    const user = userEvent.setup();
    render(<PercentInput aria-label="Comissão" defaultValue="125" />);
    const input = screen.getByRole<HTMLInputElement>('textbox');
    await user.type(input, '.', { initialSelectionStart: 2, initialSelectionEnd: 2 });
    expect(input).toHaveValue('12,5');
    expect(input.selectionStart).toBe(3);
  });

  it('colado com ponto também padroniza', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PercentInput aria-label="Comissão" onChange={onChange} />);
    await user.click(screen.getByRole('textbox'));
    await user.paste('2.75');
    expect(screen.getByRole('textbox')).toHaveValue('2,75');
    expect(onChange).toHaveBeenLastCalledWith('2.75');
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
