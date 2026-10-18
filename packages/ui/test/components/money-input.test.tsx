// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Field, MoneyInput } from '../../src/index.js';

function Controlled({ initial = null }: { initial?: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <>
      <MoneyInput aria-label="Preço pedido" value={value} onChange={setValue} />
      <output aria-label="valor">{String(value)}</output>
      <button type="button" onClick={() => setValue('200')}>
        Trocar
      </button>
    </>
  );
}

describe('MoneyInput', () => {
  it('campo de texto decimal com o prefixo R$', () => {
    render(<MoneyInput aria-label="Preço pedido" />);
    const input = screen.getByRole('textbox', { name: 'Preço pedido' });
    expect(input).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByText('R$')).toBeInTheDocument();
  });

  it('formata a cada tecla, com os centavos entrando pela direita', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyInput aria-label="Preço pedido" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    const typed: string[] = [];
    for (const key of '148050') {
      await user.type(input, key);
      typed.push((input as HTMLInputElement).value);
    }
    expect(typed).toEqual(['0,01', '0,14', '1,48', '14,80', '148,05', '1.480,50']);
    expect(onChange).toHaveBeenLastCalledWith('1480.5');
  });

  it('apagar o último dígito volta uma casa', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyInput aria-label="Preço pedido" defaultValue="1480.5" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await user.type(input, '{Backspace}');
    expect(input).toHaveValue('148,05');
    expect(onChange).toHaveBeenLastCalledWith('148.05');
  });

  it('colar um valor formatado entrega o mesmo valor', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyInput aria-label="Preço pedido" onChange={onChange} />);
    await user.click(screen.getByRole('textbox'));
    await user.paste('R$ 48.200.000,00');
    expect(screen.getByRole('textbox')).toHaveValue('48.200.000,00');
    expect(onChange).toHaveBeenLastCalledWith('48200000');
  });

  it('controlado: mostra o valor de fora e acompanha a troca', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="1480.50" />);
    const input = screen.getByRole('textbox', { name: 'Preço pedido' });
    expect(input).toHaveValue('1.480,50');
    await user.click(screen.getByRole('button', { name: 'Trocar' }));
    expect(input).toHaveValue('200,00');
  });

  it('valor como vem do banco (`numeric(16,2)`) aparece em pt-BR', () => {
    render(<MoneyInput aria-label="Preço pedido" value="48200000.00" />);
    expect(screen.getByRole('textbox')).toHaveValue('48.200.000,00');
  });

  it('string vazia de fora vale vazio', () => {
    render(<MoneyInput aria-label="Preço pedido" value="" />);
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('apagar tudo entrega null', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="12" />);
    await user.clear(screen.getByRole('textbox', { name: 'Preço pedido' }));
    expect(screen.getByRole('status', { name: 'valor' })).toHaveTextContent('null');
  });

  it('o que não é dígito não entra nem muda o valor', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="12" />);
    const input = screen.getByRole('textbox', { name: 'Preço pedido' });
    await user.type(input, 'a,.');
    expect(input).toHaveValue('12,00');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.getByRole('status', { name: 'valor' })).toHaveTextContent('12');
  });

  it('fora de `min`/`max` fica inválido, mas entrega o valor', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyInput aria-label="Entrada" min="0" max="1000" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await user.type(input, '150000');
    expect(onChange).toHaveBeenLastCalledWith('1500');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    await user.tab();
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('o `Field` nomeia, descreve e marca inválido', () => {
    render(
      <Field label="Preço pedido" error="Informe o preço">
        <MoneyInput />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Preço pedido' });
    expect(input).toHaveAccessibleDescription('Informe o preço');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('desabilitado não recebe digitação', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyInput aria-label="Preço pedido" disabled defaultValue="10" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    await user.type(input, '5');
    expect(input).toHaveValue('10,00');
    expect(onChange).not.toHaveBeenCalled();
  });
});
