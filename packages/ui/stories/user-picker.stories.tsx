import type { UserOption } from '@crm/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { type AsyncComboboxSearch, Field, UserPicker } from '../src/index.js';
import { constrained } from './support/layout.js';

const users: UserOption[] = [
  { id: 'u1', name: 'Carlos Menezes', email: 'carlos@grandvista.com.br' },
  { id: 'u2', name: 'Marina Duarte', email: 'marina@grandvista.com.br' },
  { id: 'u3', name: 'Rafael Tavares', email: 'rafael@grandvista.com.br' },
  { id: 'u4', name: 'Beatriz Nogueira', email: 'beatriz@grandvista.com.br' },
];

/** Busca simulada: filtra pelo nome com um atraso de rede. */
const searchUsers: AsyncComboboxSearch<UserOption> = (term, { signal }) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => resolve({ items: users.filter((user) => user.name.toLowerCase().includes(term.toLowerCase())) }),
      300,
    );
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });

const answersEmpty: AsyncComboboxSearch<UserOption> = async () => ({ items: [] });

type Args = {
  search?: AsyncComboboxSearch<UserOption>;
  initial?: UserOption | null;
  error?: string;
  disabled?: boolean;
  defaultOpen?: boolean;
};

function UserField({ search = searchUsers, initial = null, error, ...props }: Args) {
  const [value, setValue] = useState<UserOption | string | null>(initial);
  return (
    <Field label="Corretor responsável" error={error}>
      <UserPicker search={search} value={value} onChange={setValue} {...props} />
    </Field>
  );
}

// Aberto, o conteúdo cobre a página de documentação: as stories ficam só no canvas.
const meta = {
  title: 'Formulário/UserPicker',
  component: UserField,
  tags: ['!autodocs'],
  decorators: [constrained('md')],
} satisfies Meta<typeof UserField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Escolhido: Story = { args: { initial: users[1]! } };

export const Aberto: Story = { args: { defaultOpen: true } };

export const Vazio: Story = { args: { search: answersEmpty, defaultOpen: true } };

export const Invalido: Story = { name: 'Inválido', args: { error: 'Escolha o corretor responsável.' } };

export const Desabilitado: Story = { args: { initial: users[0]!, disabled: true } };
