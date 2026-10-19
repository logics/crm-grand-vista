// @vitest-environment jsdom
import '../support/dom.js';
import type { FarmOption } from '@crm/shared';
import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FarmPicker, Field } from '../../src/index.js';
import { advance, answer, fakeSearch, open, setup } from '../support/async-search.js';

const santaHelena: FarmOption = {
  id: '0199c1d2-7a4b-7c3e-9f10-000000000001',
  name: 'Fazenda Santa Helena',
  municipality: { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO' },
  totalAreaHa: '1480.5',
};

type HarnessProps = {
  search: ReturnType<typeof fakeSearch<FarmOption>>['search'];
  onChange?: (value: FarmOption[]) => void;
  onCreate?: (term: string) => void;
};

function Farms({ search, onChange, onCreate }: HarnessProps) {
  const [value, setValue] = useState<Array<FarmOption | string>>([]);
  return (
    <Field label="Fazendas candidatas">
      <FarmPicker
        multiple
        search={search}
        onCreate={onCreate}
        value={value}
        onChange={(farms) => {
          setValue(farms);
          onChange?.(farms);
        }}
      />
    </Field>
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('FarmPicker', () => {
  it('a opção mostra nome, município e área; o chip, só o nome', async () => {
    const user = setup();
    const onChange = vi.fn();
    const { search, calls } = fakeSearch<FarmOption>();
    render(<Farms search={search} onChange={onChange} />);
    const trigger = await open(user, 'Fazendas candidatas');
    expect(trigger).toHaveTextContent('Escolha a fazenda');
    expect(screen.getByPlaceholderText('Buscar fazenda')).toHaveFocus();
    await answer(calls[0], { items: [santaHelena] });

    const option = screen.getByRole('option');
    expect(option).toHaveTextContent('Fazenda Santa Helena');
    expect(option).toHaveTextContent('Rio Verde — GO · 1.480,5 ha');
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith([santaHelena]);
    expect(screen.getByRole('button', { name: 'Remover Fazenda Santa Helena' })).toBeVisible();
  });

  it('no vazio, "Cadastrar fazenda" recebe o termo buscado', async () => {
    const user = setup();
    const onCreate = vi.fn();
    const { search, calls } = fakeSearch<FarmOption>();
    render(<Farms search={search} onCreate={onCreate} />);
    await open(user, 'Fazendas candidatas');
    await user.type(screen.getByPlaceholderText('Buscar fazenda'), 'Recanto');
    await advance(250);
    await answer(calls[1], { items: [] });

    await user.click(screen.getByRole('button', { name: 'Cadastrar fazenda' }));
    expect(onCreate).toHaveBeenCalledWith('Recanto');
  });

  it('sem onCreate, o vazio não oferece cadastro', async () => {
    const user = setup();
    const { search, calls } = fakeSearch<FarmOption>();
    render(<Farms search={search} />);
    await open(user, 'Fazendas candidatas');
    await answer(calls[0], { items: [] });

    expect(screen.getByRole('status')).toHaveTextContent('Nenhum resultado');
    expect(screen.queryByRole('button', { name: 'Cadastrar fazenda' })).toBeNull();
  });
});
