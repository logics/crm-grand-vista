// @vitest-environment jsdom
import '../support/dom.js';
import type { UserOption } from '@crm/shared';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Field, UserPicker } from '../../src/index.js';

const users: UserOption[] = [
  { id: 'u1', name: 'Carlos Menezes', email: 'carlos@grandvista.com.br' },
  { id: 'u2', name: 'Marina Duarte', email: 'marina@grandvista.com.br' },
];

const search = vi.fn(async (term: string) => ({
  items: users.filter((user) => user.name.toLowerCase().includes(term.toLowerCase())),
}));

function Harness({ onChange }: { onChange?: (user: UserOption | null) => void }) {
  const [value, setValue] = useState<UserOption | null>(null);
  return (
    <Field label="Corretor responsável">
      <UserPicker
        search={search}
        debounceMs={0}
        value={value}
        onChange={(user) => {
          setValue(user);
          onChange?.(user);
        }}
      />
    </Field>
  );
}

describe('UserPicker', () => {
  it('é um combobox nomeado pelo Field, com o texto de usuário', () => {
    render(<Harness />);

    expect(screen.getByRole('combobox', { name: 'Corretor responsável' })).toHaveTextContent('Escolha o usuário');
  });

  it('lista nome e e-mail e devolve o usuário escolhido pelo teclado', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);

    screen.getByRole('combobox', { name: 'Corretor responsável' }).focus();
    await user.keyboard('{ArrowDown}');
    await user.type(await screen.findByRole('combobox', { name: 'Buscar usuário' }), 'mar');
    const option = await screen.findByRole('option', { name: /Marina Duarte/ });
    expect(option).toHaveTextContent('marina@grandvista.com.br');
    expect(screen.queryByRole('option', { name: /Carlos/ })).not.toBeInTheDocument();
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenLastCalledWith(users[1]);
    expect(screen.getByRole('combobox', { name: 'Corretor responsável' })).toHaveTextContent('Marina Duarte');
  });
});
