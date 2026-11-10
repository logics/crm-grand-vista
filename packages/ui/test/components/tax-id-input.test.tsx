// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaxIdInput } from '../../src/index.js';

describe('TaxIdInput', () => {
  it('PF: máscara de CPF, só dígitos, entrega o valor normalizado', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TaxIdInput aria-label="Documento" personType="pf" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Documento' });

    await user.type(input, '529.982.247-25x99');
    expect(input).toHaveValue('529.982.247-25');
    expect(onChange).toHaveBeenLastCalledWith('52998224725');
  });

  it('PJ: aceita letras (CNPJ alfanumérico), em maiúsculas, com a máscara de CNPJ', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TaxIdInput aria-label="Documento" personType="pj" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Documento' });

    await user.type(input, '12abc34501de35');
    expect(input).toHaveValue('12.ABC.345/01DE-35');
    expect(onChange).toHaveBeenLastCalledWith('12ABC34501DE35');
  });

  it('PJ: os dígitos verificadores só aceitam número', async () => {
    const user = userEvent.setup();
    render(<TaxIdInput aria-label="Documento" personType="pj" defaultValue="12ABC34501DE" />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'X3Y5');
    expect(input).toHaveValue('12.ABC.345/01DE-35');
  });

  it('mostra formatado o valor normalizado que vem do banco', () => {
    render(<TaxIdInput aria-label="Documento" personType="pj" value="11222333000181" />);
    expect(screen.getByRole('textbox')).toHaveValue('11.222.333/0001-81');
  });

  it('apagar tudo entrega null', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TaxIdInput aria-label="Documento" personType="pf" value="52998224725" onChange={onChange} />);
    await user.clear(screen.getByRole('textbox'));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('trocar o tipo de pessoa refaz a máscara do mesmo valor', () => {
    const { rerender } = render(<TaxIdInput aria-label="Documento" personType="pj" value="11222333000181" />);
    rerender(<TaxIdInput aria-label="Documento" personType="pf" value="11222333000181" />);
    expect(screen.getByRole('textbox')).toHaveValue('112.223.330-00');
  });
});
