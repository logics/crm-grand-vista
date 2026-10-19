import type { CommissionGroup, CommissionMember, CommissionParty, ContactOption, UserOption } from '@crm/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { CommissionEditor, Field } from '../src/index.js';
import { constrained } from './support/layout.js';
import { simulatedSearch } from './support/search.js';

const carlos: CommissionParty = { kind: 'user', id: 'u-carlos', name: 'Carlos Menezes' };
const marina: CommissionParty = { kind: 'user', id: 'u-marina', name: 'Marina Duarte' };
const rafael: CommissionParty = { kind: 'user', id: 'u-rafael', name: 'Rafael Tavares' };
const joao: CommissionParty = { kind: 'contact', id: 'c-joao', name: 'João Batista' };
const sebastiao: CommissionParty = { kind: 'contact', id: 'c-sebastiao', name: 'Sebastião Ferreira' };

const contacts: ContactOption[] = [
  { id: 'c-joao', name: 'João Batista', personType: 'pf', taxId: '98765432100', roles: ['external_broker'] },
  { id: 'c-sebastiao', name: 'Sebastião Ferreira', personType: 'pf', taxId: null, roles: ['external_broker', 'owner'] },
  { id: 'c-agro', name: 'Agropecuária Vale Verde', personType: 'pj', taxId: '12345678000190', roles: ['external_broker'] },
];

const users: UserOption[] = [
  { id: 'u-carlos', name: 'Carlos Menezes', email: 'carlos@grandvista.com.br' },
  { id: 'u-marina', name: 'Marina Duarte', email: 'marina@grandvista.com.br' },
  { id: 'u-rafael', name: 'Rafael Tavares', email: 'rafael@grandvista.com.br' },
];

const searchContacts = simulatedSearch(contacts, (contact) => contact.name);
const searchUsers = simulatedSearch(users, (user) => user.name);

const member = (party: CommissionParty, percent: string | null = null): CommissionMember => ({ party, percent });

const severalGroups: CommissionGroup[] = [
  { name: 'Venda', percent: '3', members: [member(carlos, '60'), member(marina), member(rafael)] },
  { name: 'Captação', percent: '1.5', members: [member(rafael)] },
  { name: 'Indicação', percent: '0.5', members: [member(joao), member(sebastiao)] },
];

type Args = {
  initial?: CommissionGroup[];
  netValue?: string | null;
  readOnly?: boolean;
  disabled?: boolean;
  own?: boolean;
  hint?: string;
};

function CommissionField({ initial = [], netValue = '18500000', readOnly, disabled, own, hint = 'Sobre o valor líquido da venda' }: Args) {
  const [value, setValue] = useState(initial);
  const visibility = own ? { visibility: 'own' as const, currentUserId: carlos.id } : {};
  return (
    <Field label="Comissão" hint={hint}>
      <CommissionEditor
        value={value}
        onChange={setValue}
        netValue={netValue}
        searchContacts={searchContacts}
        searchUsers={searchUsers}
        readOnly={readOnly}
        disabled={disabled}
        {...visibility}
      />
    </Field>
  );
}

// O seletor aberto cobre a página de documentação: as stories ficam só no canvas.
const meta = {
  title: 'Formulário/CommissionEditor',
  component: CommissionField,
  tags: ['!autodocs'],
  decorators: [constrained('form')],
} satisfies Meta<typeof CommissionField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vazia: Story = {};

export const UmGrupo: Story = {
  name: 'Um grupo',
  args: { initial: [{ name: 'Venda', percent: '4', members: [member(carlos), member(marina)] }] },
};

export const VariosGruposComSobrescrita: Story = {
  name: 'Vários grupos com sobrescrita',
  args: { initial: severalGroups },
};

export const SemValorLiquido: Story = {
  name: 'Sem valor líquido',
  args: { initial: severalGroups, netValue: null, hint: 'Os valores aparecem quando a venda tiver o valor líquido' },
};

export const ComAvisos: Story = {
  name: 'Com avisos',
  args: {
    initial: [
      { name: 'Venda', percent: '3', members: [member(carlos, '70'), member(marina, '45'), member(rafael)] },
      { name: 'Captação', percent: '1', members: [member(rafael), member(rafael)] },
      { name: 'Indicação', percent: '1', members: [] },
    ],
  },
};

export const ModoRestrito: Story = {
  name: 'Modo restrito',
  args: { initial: severalGroups, own: true, hint: 'Só a sua parte' },
};

export const SomenteLeitura: Story = {
  name: 'Somente leitura',
  args: { initial: severalGroups, readOnly: true, hint: undefined },
};

export const Desabilitada: Story = { args: { initial: severalGroups, disabled: true } };
