import {
  type ContactOption,
  type ReferralLink,
  type ReferralSubject,
  type Referrer,
  type UserOption,
} from '@crm/shared';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef, useState } from 'react';
import { type AsyncComboboxPage, Field, ReferralChainEditor } from '../src/index.js';
import { constrained } from './support/layout.js';

const pedro: ReferralSubject = { kind: 'contact', id: 'c-pedro', name: 'Pedro Almeida' };

const joao: Referrer = { kind: 'contact', id: 'c-joao', name: 'João Batista' };
const sebastiao: Referrer = { kind: 'contact', id: 'c-sebastiao', name: 'Sebastião Ferreira' };
const carlos: Referrer = { kind: 'user', id: 'u-carlos', name: 'Carlos Menezes' };

const contacts: ContactOption[] = [
  { id: 'c-pedro', name: 'Pedro Almeida', personType: 'pf', taxId: '12345678901', roles: ['buyer'] },
  { id: 'c-joao', name: 'João Batista', personType: 'pf', taxId: '98765432100', roles: ['external_broker'] },
  { id: 'c-sebastiao', name: 'Sebastião Ferreira', personType: 'pf', taxId: null, roles: ['external_broker', 'owner'] },
  { id: 'c-antonio', name: 'Antônio Ribeiro', personType: 'pf', taxId: null, roles: ['owner'] },
  { id: 'c-agro', name: 'Agropecuária Vale Verde', personType: 'pj', taxId: '12345678000190', roles: ['external_broker'] },
];

const users: UserOption[] = [
  { id: 'u-carlos', name: 'Carlos Menezes', email: 'carlos@grandvista.com.br' },
  { id: 'u-marina', name: 'Marina Duarte', email: 'marina@grandvista.com.br' },
];

/** Busca simulada: filtra pelo nome com um atraso de rede. */
function simulated<T extends { name: string }>(items: T[]) {
  return (term: string, { signal }: { signal: AbortSignal }) =>
    new Promise<AsyncComboboxPage<T>>((resolve, reject) => {
      const timer = setTimeout(
        () => resolve({ items: items.filter((item) => item.name.toLowerCase().includes(term.toLowerCase())) }),
        300,
      );
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(signal.reason);
      });
    });
}

const link = (referrer: Referrer, position: number, notes: string | null = null): ReferralLink => ({
  referrer,
  position,
  notes,
});

type Args = { initial?: ReferralLink[]; readOnly?: boolean; disabled?: boolean; hint?: string; createContact?: boolean };

function ChainField({ initial = [], readOnly, disabled, createContact, hint = 'Do mais próximo ao mais distante' }: Args) {
  const [value, setValue] = useState(initial);
  const created = useRef(0);
  return (
    <Field label="Cadeia de indicação" hint={hint}>
      <ReferralChainEditor
        subject={pedro}
        value={value}
        onChange={setValue}
        searchContacts={simulated(contacts)}
        searchUsers={simulated(users)}
        // simula o app: o contato cadastrado volta para o editor, que o inclui como último elo
        onCreateContact={
          createContact
            ? async (term) => {
                created.current += 1;
                return { kind: 'contact', id: `c-novo-${created.current}`, name: term || 'Contato novo' };
              }
            : undefined
        }
        readOnly={readOnly}
        disabled={disabled}
      />
    </Field>
  );
}

// O seletor aberto cobre a página de documentação: as stories ficam só no canvas.
const meta = {
  title: 'Formulário/ReferralChainEditor',
  component: ChainField,
  tags: ['!autodocs'],
  decorators: [constrained('xl')],
} satisfies Meta<typeof ChainField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vazia: Story = {};

export const UmNivel: Story = { name: 'Um nível', args: { initial: [link(joao, 1)] } };

export const TresNiveis: Story = {
  name: 'Três níveis',
  args: { initial: [link(joao, 1), link(sebastiao, 2), link(carlos, 3)] },
};

export const ComNota: Story = {
  name: 'Com nota',
  args: { initial: [link(joao, 1, 'Vizinho de cerca, conhece o Pedro há 20 anos'), link(sebastiao, 2)] },
};

export const SomenteLeitura: Story = {
  name: 'Somente leitura',
  args: {
    readOnly: true,
    hint: undefined,
    initial: [link(joao, 1, 'Vizinho de cerca'), link(sebastiao, 2), link(carlos, 3, 'Atendeu o Sebastião em 2023')],
  },
};

export const ComErroDeValidacao: Story = {
  name: 'Com erro de validação',
  args: {
    initial: [
      link(joao, 1),
      link(sebastiao, 2),
      link(joao, 3),
      link({ kind: 'contact', id: pedro.id, name: pedro.name }, 4),
    ],
  },
};

export const Desabilitada: Story = { args: { disabled: true, initial: [link(joao, 1, 'Vizinho de cerca'), link(carlos, 2)] } };

export const LimiteAtingido: Story = {
  name: 'Limite atingido',
  args: {
    initial: [
      link(joao, 1),
      link(sebastiao, 2),
      link(carlos, 3),
      link({ kind: 'contact', id: 'c-antonio', name: 'Antônio Ribeiro' }, 4),
      link({ kind: 'user', id: 'u-marina', name: 'Marina Duarte' }, 5),
      link({ kind: 'contact', id: 'c-agro', name: 'Agropecuária Vale Verde' }, 6),
      link({ kind: 'contact', id: 'c-helena', name: 'Helena Prado' }, 7),
      link({ kind: 'contact', id: 'c-otavio', name: 'Otávio Lacerda' }, 8),
      link({ kind: 'contact', id: 'c-lucia', name: 'Lúcia Fontes' }, 9),
      link({ kind: 'contact', id: 'c-renato', name: 'Renato Siqueira' }, 10),
    ],
  },
};

export const IndicadorSemAcesso: Story = {
  name: 'Indicador sem acesso',
  args: { initial: [link(joao, 1), link({ ...carlos, linked: false }, 2)] },
};

export const ComCadastroRapido: Story = {
  name: 'Com cadastro rápido',
  args: { createContact: true, initial: [link(joao, 1)] },
};
