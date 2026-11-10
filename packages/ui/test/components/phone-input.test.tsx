// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PhoneInput } from '../../src/index.js';

function Controlled({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState<string | null>(initial);
  return <PhoneInput aria-label="Telefone" value={value} onChange={setValue} />;
}

describe('PhoneInput', () => {
  it('mostra o +55 pré-preenchido e entrega o telefone mascarado', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhoneInput aria-label="Telefone" onChange={onChange} />);
    expect(screen.getByText('+55')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Telefone' }), '64999990000');

    expect(onChange).toHaveBeenLastCalledWith('(64) 99999-0000');
  });

  it('formata a cada tecla', async () => {
    const user = userEvent.setup();
    render(<PhoneInput aria-label="Telefone" />);
    const input = screen.getByRole('textbox', { name: 'Telefone' });

    await user.type(input, '6');
    expect(input).toHaveValue('(6');
    await user.type(input, '49');
    expect(input).toHaveValue('(64) 9');
    await user.type(input, '9999');
    expect(input).toHaveValue('(64) 9999-9');
  });

  it('número incompleto fica como foi digitado', async () => {
    const user = userEvent.setup();
    render(<PhoneInput aria-label="Telefone" />);
    const input = screen.getByRole('textbox', { name: 'Telefone' });

    await user.type(input, '123');
    await user.tab();

    expect(input).toHaveValue('(12) 3');
  });

  it('fixo tem hífen após 4; o 11º dígito vira celular', async () => {
    const user = userEvent.setup();
    render(<PhoneInput aria-label="Telefone" />);
    const input = screen.getByRole('textbox', { name: 'Telefone' });

    await user.type(input, '6433334444');
    expect(input).toHaveValue('(64) 3333-4444');
    await user.type(input, '5');
    expect(input).toHaveValue('(64) 33334-4445');
  });

  it('não aceita além do teto: 13 dígitos dão 15 caracteres', async () => {
    const user = userEvent.setup();
    render(<PhoneInput aria-label="Telefone" />);
    const input = screen.getByRole('textbox', { name: 'Telefone' });

    await user.type(input, '6499999000012');

    expect(input).toHaveValue('(64) 99999-0000');
    expect((input as HTMLInputElement).value).toHaveLength(15);
  });

  it('letras são descartadas', async () => {
    const user = userEvent.setup();
    render(<PhoneInput aria-label="Telefone" />);
    const input = screen.getByRole('textbox', { name: 'Telefone' });

    await user.type(input, '6a4b');

    expect(input).toHaveValue('(64');
  });

  it('colar com +55 vira o número brasileiro e o prefixo +55 continua visível', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole('textbox', { name: 'Telefone' });

    await user.click(input);
    await user.paste('+55 (64) 99999-0000');

    expect(input).toHaveValue('(64) 99999-0000');
    expect(screen.getByText('+55')).toBeInTheDocument();
  });

  it('começando por +, aceita outro país e o prefixo +55 some', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole('textbox', { name: 'Telefone' });

    await user.type(input, '+351912345678');
    expect(screen.queryByText('+55')).not.toBeInTheDocument();
    await user.tab();

    expect(input).toHaveValue('+351912345678');
  });

  it('outro país: teto de 15 dígitos e colar +351 sem separadores', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole('textbox', { name: 'Telefone' });

    await user.type(input, '+1234567890123456789');
    expect(input).toHaveValue('+123456789012345');

    await user.clear(input);
    await user.click(input);
    await user.paste('+351 912 345 678');
    expect(input).toHaveValue('+351912345678');
  });

  it('digitar + e depois 5 não volta ao campo brasileiro', async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByRole('textbox', { name: 'Telefone' });

    await user.type(input, '+5');

    expect(input).toHaveValue('+5');
    expect(screen.queryByText('+55')).not.toBeInTheDocument();
  });

  it('backspace logo após o hífen apaga o dígito anterior', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="(64) 9999-9" />);
    const input = screen.getByRole('textbox', { name: 'Telefone' });

    await user.type(input, '{Backspace}', { initialSelectionStart: 10, initialSelectionEnd: 10 });

    expect(input).toHaveValue('(64) 9999');
  });

  it('backspace logo após ") " apaga o dígito anterior e mantém o cursor', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="(64) 99999-0000" />);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Telefone' });

    await user.type(input, '{Backspace}', { initialSelectionStart: 5, initialSelectionEnd: 5 });

    expect(input).toHaveValue('(69) 9999-0000');
    expect(input.selectionStart).toBe(2);
  });

  it('edição no meio mantém o cursor depois do dígito inserido', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="(64) 99999-0000" />);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Telefone' });

    // cursor depois do 3º dígito (o primeiro 9)
    await user.type(input, '1', { initialSelectionStart: 6, initialSelectionEnd: 6 });

    expect(input).toHaveValue('(64) 91999-9000');
    expect(input.selectionStart).toBe(7);
  });

  it('apagar com backspace até esvaziar', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="(64) 99999-0000" />);
    const input = screen.getByRole('textbox', { name: 'Telefone' });

    await user.click(input);
    await user.keyboard('{End}{Backspace>16/}');

    expect(input).toHaveValue('');
  });

  it('a ref do formulário chega ao <input>', () => {
    const ref = createRef<HTMLInputElement>();
    render(<PhoneInput aria-label="Telefone" ref={ref} />);
    expect(ref.current).toBe(screen.getByRole('textbox'));
  });

  it('valor gravado cru aparece mascarado e mantém o prefixo', () => {
    render(<PhoneInput aria-label="Telefone" value="64999990000" />);
    expect(screen.getByRole('textbox')).toHaveValue('(64) 99999-0000');
    expect(screen.getByText('+55')).toBeInTheDocument();
  });

  it('é um campo de telefone para o teclado do celular', () => {
    render(<PhoneInput aria-label="Telefone" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('inputmode', 'tel');
  });
});
