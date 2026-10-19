import { CONTACT_ROLES, CONTACT_ROLE_LABELS, type ContactOption, type ContactRole } from '@crm/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ContactPicker, type ContactPickerSearch, Field } from '../src/index.js';
import { constrained, Stack } from './support/layout.js';
import { answersEmpty, fails, neverAnswers, simulatedResolve, simulatedSearch } from './support/search.js';

const contacts: ContactOption[] = [
  {
    id: '0199c1d2-7a4b-7c3e-9f10-000000000001',
    name: 'João Batista Ferreira',
    personType: 'pf',
    taxId: '12345678909',
    roles: ['buyer', 'owner'],
  },
  {
    id: '0199c1d2-7a4b-7c3e-9f10-000000000002',
    name: 'Agropecuária Vale Verde Ltda.',
    personType: 'pj',
    taxId: '12345678000190',
    roles: ['owner'],
  },
  {
    id: '0199c1d2-7a4b-7c3e-9f10-000000000003',
    name: 'Sebastião Rodrigues',
    personType: 'pf',
    taxId: null,
    roles: ['external_broker'],
  },
  {
    id: '0199c1d2-7a4b-7c3e-9f10-000000000004',
    name: 'Maria Helena Albuquerque',
    personType: 'pf',
    taxId: '98765432100',
    roles: ['buyer'],
  },
  {
    id: '0199c1d2-7a4b-7c3e-9f10-000000000005',
    name: 'Carlos Eduardo Menezes',
    personType: 'pf',
    taxId: '11122233344',
    roles: ['external_broker', 'buyer'],
  },
  {
    id: '0199c1d2-7a4b-7c3e-9f10-000000000006',
    name: 'Grupo Cerrado Investimentos S.A.',
    personType: 'pj',
    taxId: '98765432000110',
    roles: ['buyer'],
  },
];

/** Busca simulada pelo nome; o papel filtra antes de paginar, como na API. */
const searchContacts: ContactPickerSearch = (term, options) =>
  simulatedSearch(
    contacts.filter((contact) => !options.role || contact.roles.includes(options.role)),
    (contact) => contact.name,
  )(term, options);

const resolveContacts = simulatedResolve(contacts, (contact) => contact.id);

type Args = {
  search?: ContactPickerSearch;
  initial?: ContactOption | string | null;
  label?: string;
  role?: ContactRole;
  error?: string;
  disabled?: boolean;
  defaultOpen?: boolean;
  creatable?: boolean;
};

function ContactField({ search = searchContacts, initial = null, label = 'Contato', error, creatable, ...props }: Args) {
  const [value, setValue] = useState<ContactOption | string | null>(initial);
  return (
    <Field label={label} error={error}>
      <ContactPicker
        search={search}
        resolve={resolveContacts}
        value={value}
        onChange={setValue}
        onCreate={creatable ? () => {} : undefined}
        {...props}
      />
    </Field>
  );
}

// Aberto, o conteúdo cobre a página de documentação: as stories ficam só no canvas.
const meta = {
  title: 'Formulário/ContactPicker',
  component: ContactField,
  tags: ['!autodocs'],
  decorators: [constrained('md')],
} satisfies Meta<typeof ContactField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unico: Story = { name: 'Único', args: { initial: contacts[0]! } };

export const Aberto: Story = { args: { defaultOpen: true } };

export const ValorPorId: Story = { name: 'Valor por ID', args: { initial: contacts[1]!.id } };

export const PorPapel: Story = {
  name: 'Por papel',
  render: () => (
    <Stack>
      {CONTACT_ROLES.map((role) => (
        <ContactField key={role} role={role} label={CONTACT_ROLE_LABELS[role]} />
      ))}
    </Stack>
  ),
};

export const CorretorExternoAberto: Story = {
  name: 'Corretor externo aberto',
  args: { role: 'external_broker', label: 'Indicado por', defaultOpen: true },
};

export const VazioComCadastrar: Story = {
  name: 'Vazio com cadastrar',
  args: { search: answersEmpty(), defaultOpen: true, creatable: true },
};

export const Carregando: Story = { args: { search: neverAnswers(), defaultOpen: true } };

export const Erro: Story = { args: { search: fails(), defaultOpen: true } };

export const Desabilitado: Story = { args: { initial: contacts[0]!, disabled: true } };

export const Invalido: Story = { name: 'Inválido', args: { label: 'Comprador', role: 'buyer', error: 'Escolha o comprador da oportunidade' } };
