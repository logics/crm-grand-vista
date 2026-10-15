// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  Checkbox,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '../../src/index.js';

describe('Field', () => {
  it('o rótulo nomeia o controle e a dica o descreve', () => {
    render(
      <Field label="Valor por hectare útil" hint="Em R$, sem centavos">
        <Input prefix="R$" />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Valor por hectare útil' });
    expect(input).toHaveAccessibleDescription('Em R$, sem centavos');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('o erro substitui a dica e marca o controle como inválido', () => {
    render(
      <Field label="E-mail" hint="O do cadastro" error="Informe um e-mail válido">
        <Input />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'E-mail' });
    expect(input).toHaveAccessibleDescription('Informe um e-mail válido');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('O do cadastro')).toBeNull();
  });

  it('obrigatório: o controle anuncia, e o asterisco fica fora do nome', () => {
    render(
      <Field label="Matrícula" required>
        <Input />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Matrícula' });
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('`htmlFor` aponta para o controle que já tem id', () => {
    render(
      <Field label="CAR" htmlFor="car">
        <Input id="car" />
      </Field>,
    );
    expect(screen.getByRole('textbox', { name: 'CAR' })).toHaveAttribute('id', 'car');
  });

  it('o que o controle declara vence; a descrição soma as duas', () => {
    render(
      <>
        <span id="extra">Ver a matrícula</span>
        <Field label="CCIR" hint="Do INCRA">
          <Input aria-describedby="extra" aria-invalid={false} />
        </Field>
      </>,
    );
    const input = screen.getByRole('textbox', { name: 'CCIR' });
    expect(input).toHaveAccessibleDescription('Do INCRA Ver a matrícula');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('chega ao gatilho de um Select, aninhado no Root', () => {
    render(
      <Field label="Estado" error="Escolha um estado">
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mg">Minas Gerais</SelectItem>
          </SelectContent>
        </Select>
      </Field>,
    );
    const trigger = screen.getByRole('combobox', { name: 'Estado' });
    expect(trigger).toHaveAccessibleDescription('Escolha um estado');
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
  });

  it('na horizontal, o rótulo fica ao lado da caixa de seleção e a alterna', async () => {
    const user = userEvent.setup();
    render(
      <Field orientation="horizontal" label="CAR válido" hint="Conferido no SICAR">
        <Checkbox />
      </Field>,
    );
    const box = screen.getByRole('checkbox', { name: 'CAR válido' });
    expect(box).toHaveAccessibleDescription('Conferido no SICAR');
    await user.click(screen.getByText('CAR válido'));
    expect(box).toBeChecked();
  });

  it('na horizontal, vale também para o interruptor', async () => {
    const user = userEvent.setup();
    render(
      <Field orientation="horizontal" label="Notificar por e-mail">
        <Switch />
      </Field>,
    );
    await user.click(screen.getByText('Notificar por e-mail'));
    expect(screen.getByRole('switch', { name: 'Notificar por e-mail' })).toBeChecked();
  });
});
