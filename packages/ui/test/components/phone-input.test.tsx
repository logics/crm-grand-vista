// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PhoneInput } from '../../src/index.js';

describe('PhoneInput', () => {
  it('mostra o +55 pré-preenchido e recebe o telefone como se digita', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhoneInput aria-label="Telefone" onChange={onChange} />);
    expect(screen.getByText('+55')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Telefone' }), '64999990000');

    expect(onChange).toHaveBeenLastCalledWith('64999990000');
  });

  it('ao sair, reescreve o número válido no formato de exibição', async () => {
    const user = userEvent.setup();
    render(<PhoneInput aria-label="Telefone" />);
    const input = screen.getByRole('textbox', { name: 'Telefone' });

    await user.type(input, '64999990000');
    await user.tab();

    expect(input).toHaveValue('(64) 99999-0000');
  });

  it('número inválido fica como foi digitado', async () => {
    const user = userEvent.setup();
    render(<PhoneInput aria-label="Telefone" />);
    const input = screen.getByRole('textbox', { name: 'Telefone' });

    await user.type(input, '123');
    await user.tab();

    expect(input).toHaveValue('123');
  });

  it('começando por +, aceita outro país e o prefixo +55 some', async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState<string | null>('');
      return <PhoneInput aria-label="Telefone" value={value} onChange={setValue} />;
    }
    render(<Controlled />);
    const input = screen.getByRole('textbox', { name: 'Telefone' });

    await user.type(input, '+351912345678');
    expect(screen.queryByText('+55')).not.toBeInTheDocument();
    await user.tab();

    expect(input).toHaveValue('+351912345678');
  });

  it('valor gravado brasileiro volta formatado pelo chamador e mantém o prefixo', () => {
    render(<PhoneInput aria-label="Telefone" value="(64) 99999-0000" />);
    expect(screen.getByRole('textbox')).toHaveValue('(64) 99999-0000');
    expect(screen.getByText('+55')).toBeInTheDocument();
  });

  it('é um campo de telefone para o teclado do celular', () => {
    render(<PhoneInput aria-label="Telefone" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('inputmode', 'tel');
  });
});
