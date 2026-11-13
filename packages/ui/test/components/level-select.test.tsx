// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Field, LevelSelect } from '../../src/index.js';

describe('LevelSelect', () => {
  it('lista Alta, Média e Baixa nessa ordem, além de "Não informado"', async () => {
    const user = userEvent.setup();
    render(<LevelSelect aria-label="Prioridade" value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Prioridade' })).toHaveTextContent('Não informado');
    await user.click(screen.getByRole('combobox', { name: 'Prioridade' }));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Não informado',
      'Alta',
      'Média',
      'Baixa',
    ]);
  });

  it('escolher um nível o entrega; escolher "Não informado" entrega nulo', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LevelSelect aria-label="Prioridade" value="medium" onChange={onChange} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Média');

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Alta' }));
    expect(onChange).toHaveBeenLastCalledWith('high');

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Não informado' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('o Field o nomeia e passa o erro', () => {
    render(
      <Field label="Prioridade" error="Informe a prioridade.">
        <LevelSelect value={null} onChange={vi.fn()} />
      </Field>,
    );
    expect(screen.getByRole('combobox', { name: 'Prioridade' })).toHaveAttribute('aria-invalid', 'true');
  });
});
