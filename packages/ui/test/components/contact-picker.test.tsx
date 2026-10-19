// @vitest-environment jsdom
import '../support/dom.js';
import type { ContactOption, ContactRole } from '@crm/shared';
import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ContactPickerSearchOptions, ContactPicker, Field } from '../../src/index.js';
import { advance, answer, fakeSearch, open, setup } from '../support/async-search.js';

const joao: ContactOption = {
  id: '0199c1d2-7a4b-7c3e-9f10-000000000001',
  name: 'João Batista Ferreira',
  personType: 'pf',
  taxId: '12345678909',
  roles: ['buyer', 'owner'],
};

const agropecuaria: ContactOption = {
  id: '0199c1d2-7a4b-7c3e-9f10-000000000002',
  name: 'Agropecuária Vale Verde Ltda.',
  personType: 'pj',
  taxId: '12345678000190',
  roles: ['owner'],
};

const contactSearch = () => fakeSearch<ContactOption, ContactPickerSearchOptions>();

type HarnessProps = {
  search: ReturnType<typeof contactSearch>['search'];
  role?: ContactRole;
  onChange?: (value: ContactOption | null) => void;
  onCreate?: (term: string) => void;
};

function Contact({ search, role, onChange, onCreate }: HarnessProps) {
  const [value, setValue] = useState<ContactOption | null>(null);
  return (
    <Field label="Contato">
      <ContactPicker
        search={search}
        role={role}
        onCreate={onCreate}
        value={value}
        onChange={(contact) => {
          setValue(contact);
          onChange?.(contact);
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

describe('ContactPicker', () => {
  it('a opção mostra nome, PF ou PJ, documento abreviado e papéis', async () => {
    const user = setup();
    const { search, calls } = contactSearch();
    render(<Contact search={search} />);
    await open(user, 'Contato');
    await answer(calls[0], { items: [joao, agropecuaria] });

    const [person, company] = screen.getAllByRole('option');
    expect(within(person!).getByText('PF')).toBeVisible();
    expect(person).toHaveTextContent('João Batista Ferreira');
    expect(person).toHaveTextContent('***.456.789-** · Comprador, Proprietário');
    expect(within(company!).getByText('PJ')).toBeVisible();
    expect(company).toHaveTextContent('12.345.678/0001-90 · Proprietário');
  });

  it('contato sem documento mostra travessão no lugar dele', async () => {
    const user = setup();
    const { search, calls } = contactSearch();
    render(<Contact search={search} />);
    await open(user, 'Contato');
    await answer(calls[0], { items: [{ ...joao, taxId: null, roles: ['buyer'] }] });

    expect(screen.getByRole('option')).toHaveTextContent('— · Comprador');
  });

  it('o gatilho mostra só o nome do escolhido', async () => {
    const user = setup();
    const onChange = vi.fn();
    const { search, calls } = contactSearch();
    render(<Contact search={search} onChange={onChange} />);
    const trigger = await open(user, 'Contato');
    expect(trigger).toHaveTextContent('Escolha o contato');
    await answer(calls[0], { items: [joao] });
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenLastCalledWith(joao);
    expect(trigger).toHaveTextContent(/^João Batista Ferreira$/);
  });

  it('com papel, repassa o filtro à busca e o nomeia no placeholder', async () => {
    const user = setup();
    const { search } = contactSearch();
    render(<Contact search={search} role="external_broker" />);
    const trigger = await open(user, 'Contato');

    expect(trigger).toHaveTextContent('Escolha o corretor externo');
    expect(search).toHaveBeenLastCalledWith('', expect.objectContaining({ role: 'external_broker' }));
    await user.type(screen.getByPlaceholderText('Buscar contato'), 'car');
    await advance(250);
    expect(search).toHaveBeenLastCalledWith('car', expect.objectContaining({ role: 'external_broker' }));
  });

  it('sem papel, a busca não recebe filtro', async () => {
    const user = setup();
    const { search } = contactSearch();
    render(<Contact search={search} />);
    await open(user, 'Contato');

    expect(search.mock.calls[0]![1].role).toBeUndefined();
  });

  it('no vazio, "Cadastrar contato" recebe o termo buscado', async () => {
    const user = setup();
    const onCreate = vi.fn();
    const { search, calls } = contactSearch();
    render(<Contact search={search} onCreate={onCreate} />);
    await open(user, 'Contato');
    await user.type(screen.getByPlaceholderText('Buscar contato'), 'Sebastião');
    await advance(250);
    await answer(calls[1], { items: [] });

    await user.click(screen.getByRole('button', { name: 'Cadastrar contato' }));
    expect(onCreate).toHaveBeenCalledWith('Sebastião');
  });
});
