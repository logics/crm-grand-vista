// @vitest-environment jsdom
import '../support/dom.js';
import type { MunicipalityOption, RegionOption } from '@crm/shared';
import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Field, MunicipalityPicker } from '../../src/index.js';
import { answer, fakeSearch, open, optionNames, setup } from '../support/async-search.js';

const rioVerde: MunicipalityOption = { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO' };
const jatai: MunicipalityOption = { ibgeCode: '5211909', name: 'Jataí', uf: 'GO' };
const sorriso: MunicipalityOption = { ibgeCode: '5107925', name: 'Sorriso', uf: 'MT' };

type MunicipalityProps = {
  search: ReturnType<typeof fakeSearch<MunicipalityOption>>['search'];
  onChange: (value: MunicipalityOption | null) => void;
};

function Municipality({ search, onChange }: MunicipalityProps) {
  const [value, setValue] = useState<MunicipalityOption | null>(null);
  return (
    <Field label="Município">
      <MunicipalityPicker
        search={search}
        value={value}
        onChange={(municipality) => {
          setValue(municipality);
          onChange(municipality);
        }}
      />
    </Field>
  );
}

type RegionsProps = {
  search?: ReturnType<typeof fakeSearch<RegionOption>>['search'];
  initial?: Array<RegionOption | string>;
  onChange?: (value: RegionOption[]) => void;
  resolve?: (ids: string[]) => Promise<RegionOption[]>;
};

function Regions({ search = fakeSearch<RegionOption>().search, initial = [], onChange, resolve }: RegionsProps) {
  const [value, setValue] = useState<Array<RegionOption | string>>(initial);
  return (
    <Field label="Regiões de interesse">
      <MunicipalityPicker
        allowUf
        multiple
        search={search}
        resolve={resolve}
        value={value}
        onChange={(regions) => {
          setValue(regions);
          onChange?.(regions);
        }}
      />
    </Field>
  );
}

const chips = () =>
  Array.from(document.querySelectorAll('[data-slot="async-combobox"] [data-slot="tag"]')).map((tag) => tag.textContent);

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('MunicipalityPicker', () => {
  it('mostra o município como "Nome — UF" e entrega a opção escolhida', async () => {
    const user = setup();
    const onChange = vi.fn();
    const { search, calls } = fakeSearch<MunicipalityOption>();
    render(<Municipality search={search} onChange={onChange} />);
    const trigger = await open(user, 'Município');
    expect(trigger).toHaveTextContent('Escolha o município');
    await answer(calls[0], { items: [rioVerde, sorriso] });

    expect(optionNames()).toEqual(['Rio Verde — GO', 'Sorriso — MT']);
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(rioVerde);
    expect(trigger).toHaveTextContent('Rio Verde — GO');
  });

  describe('com UF', () => {
    it('mistura UF e município na lista e no valor, devolvendo { uf } e { ibgeCode }', async () => {
      const user = setup();
      const onChange = vi.fn();
      const { search, calls } = fakeSearch<RegionOption>();
      render(<Regions search={search} onChange={onChange} />);
      const trigger = await open(user, 'Regiões de interesse');
      expect(trigger).toHaveTextContent('Escolha o município ou a UF');
      await answer(calls[0], { items: [{ uf: 'GO' }, rioVerde, jatai] });

      expect(optionNames()).toEqual(['Goiás (UF)', 'Rio Verde — GO', 'Jataí — GO']);
      await user.click(screen.getByRole('option', { name: 'Goiás (UF)' }));
      await user.click(screen.getByRole('option', { name: 'Rio Verde — GO' }));

      expect(onChange).toHaveBeenLastCalledWith([{ uf: 'GO' }, rioVerde]);
      expect(screen.getByRole('option', { name: 'Goiás (UF)' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('option', { name: 'Jataí — GO' })).toHaveAttribute('aria-checked', 'false');
      expect(chips()).toEqual(['Goiás (UF)', 'Rio Verde — GO']);
    });

    it('hidrata pela sigla e pelo código IBGE o valor que só tem as chaves', async () => {
      const resolve = vi.fn(async (ids: string[]) =>
        [{ uf: 'MT' } as const, sorriso].filter((region) => ids.includes('ibgeCode' in region ? region.ibgeCode : region.uf)),
      );
      render(<Regions initial={['MT', '5107925']} resolve={resolve} />);

      expect(await screen.findByRole('combobox', { name: 'Regiões de interesse' })).toHaveTextContent(
        'Mato Grosso (UF), Sorriso — MT',
      );
      expect(resolve).toHaveBeenCalledWith(['MT', '5107925']);
      expect(chips()).toEqual(['Mato Grosso (UF)', 'Sorriso — MT']);
    });

    it('remover o chip da UF mantém o município', async () => {
      const user = setup();
      const onChange = vi.fn();
      render(<Regions initial={[{ uf: 'GO' }, rioVerde]} onChange={onChange} />);

      await user.click(screen.getByRole('button', { name: 'Remover Goiás (UF)' }));
      expect(onChange).toHaveBeenLastCalledWith([rioVerde]);
    });
  });
});
