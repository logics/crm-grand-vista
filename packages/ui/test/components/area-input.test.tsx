// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AreaInput, Field } from '../../src/index.js';

describe('AreaInput', () => {
  it('em hectares: sufixo ha, até quatro casas', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AreaInput aria-label="Área total" onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: 'Área total' });
    expect(screen.getByText('ha')).toBeInTheDocument();
    await user.type(input, '1.480');
    expect(onChange).toHaveBeenLastCalledWith('1480');
    await user.tab();
    expect(input).toHaveValue('1.480');
    await user.clear(input);
    await user.type(input, '12,34567');
    expect(onChange).toHaveBeenLastCalledWith('12.3457');
  });

  it('valor como vem do banco (`numeric(12,4)`) aparece em pt-BR', () => {
    render(<AreaInput aria-label="Área total" value="1480.2500" />);
    expect(screen.getByRole('textbox')).toHaveValue('1.480,25');
  });

  it('área negativa é inválida', async () => {
    const user = userEvent.setup();
    render(<AreaInput aria-label="Área total" />);
    const input = screen.getByRole('textbox');
    await user.type(input, '-5');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('em alqueire: mostra e aceita alqueires, entrega hectares', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AreaInput aria-label="Área total" unit="alqueire" alqueireType="goiano" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    expect(screen.getByText('alq. goiano')).toBeInTheDocument();
    await user.type(input, '100');
    expect(onChange).toHaveBeenLastCalledWith('484');
    await user.tab();
    expect(input).toHaveValue('100');
  });

  it('o valor de fora, em hectares, aparece em alqueires do tipo dado', () => {
    const { rerender } = render(
      <AreaInput aria-label="Área total" unit="alqueire" alqueireType="paulista" value="242" />,
    );
    expect(screen.getByRole('textbox')).toHaveValue('100');
    expect(screen.getByText('alq. paulista')).toBeInTheDocument();
    rerender(<AreaInput aria-label="Área total" unit="alqueire" alqueireType="norte" value="242" />);
    expect(screen.getByRole('textbox')).toHaveValue('88,9706');
    rerender(<AreaInput aria-label="Área total" value="242" />);
    expect(screen.getByRole('textbox')).toHaveValue('242');
  });

  it('em alqueire, dentro do `Field`: o erro de faixa vale em hectares', async () => {
    const user = userEvent.setup();
    render(
      <Field label="Área útil" hint="Até a área total">
        <AreaInput unit="alqueire" alqueireType="goiano" max="484" />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Área útil' });
    expect(input).toHaveAccessibleDescription('Até a área total');
    await user.type(input, '100');
    expect(input).not.toHaveAttribute('aria-invalid');
    await user.type(input, ',1');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});
