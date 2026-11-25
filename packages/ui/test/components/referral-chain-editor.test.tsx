// @vitest-environment jsdom
import '../support/dom.js';
import {
  type ContactOption,
  REFERRAL_CHAIN_LIMIT_REACHED_MESSAGE,
  type ReferralLink,
  type ReferralSubject,
  type Referrer,
  type UserOption,
} from '@crm/shared';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Field, ReferralChainEditor, type ReferralChainEditorProps } from '../../src/index.js';
import { classesWithoutCss } from '../support/classes.js';
import { compileStyles } from '../support/tailwind.js';

const pedro: ReferralSubject = { kind: 'contact', id: 'c-pedro', name: 'Pedro Almeida' };

const joao: Referrer = { kind: 'contact', id: 'c-joao', name: 'João Batista' };
const sebastiao: Referrer = { kind: 'contact', id: 'c-sebastiao', name: 'Sebastião Ferreira' };
const carlos: Referrer = { kind: 'user', id: 'u-carlos', name: 'Carlos Menezes' };

const contact = (id: string, name: string): ContactOption => ({
  id,
  name,
  personType: 'pf',
  taxId: null,
  roles: ['external_broker'],
});

const contacts = [
  contact('c-pedro', 'Pedro Almeida'),
  contact('c-joao', 'João Batista'),
  contact('c-sebastiao', 'Sebastião Ferreira'),
  contact('c-antonio', 'Antônio Ribeiro'),
];

const users: UserOption[] = [
  { id: 'u-carlos', name: 'Carlos Menezes', email: 'carlos@grandvista.com.br' },
  { id: 'u-marina', name: 'Marina Duarte', email: 'marina@grandvista.com.br' },
];

const searchContacts = async () => ({ items: contacts });
const searchUsers = async () => ({ items: users });

const link = (referrer: Referrer, position: number, notes: string | null = null): ReferralLink => ({
  referrer,
  position,
  notes,
});

const twoLevels = [link(joao, 1, 'Vizinho de cerca'), link(sebastiao, 2)];

type HarnessProps = Partial<ReferralChainEditorProps> & { initial?: ReferralLink[]; onLinks?: (links: ReferralLink[]) => void };

function Harness({ initial = [], onLinks, ...props }: HarnessProps) {
  const [value, setValue] = useState(initial);
  return (
    <Field label="Cadeia de indicação">
      <ReferralChainEditor
        subject={pedro}
        value={value}
        onChange={(links) => {
          setValue(links);
          onLinks?.(links);
        }}
        searchContacts={searchContacts}
        searchUsers={searchUsers}
        {...props}
      />
    </Field>
  );
}

const chainList = () => screen.getByRole('list', { name: 'Cadeia de indicação de Pedro Almeida' });
const items = () => within(chainList()).getAllByRole('listitem');

describe('ReferralChainEditor — leitura', () => {
  it('mostra a cadeia do sujeito até a origem', () => {
    render(<ReferralChainEditor subject={pedro} value={twoLevels} />);

    expect(screen.getByText('Pedro Almeida').closest('p')).toHaveTextContent(
      'Pedro Almeida, indicado por João Batista, indicado por Sebastião Ferreira',
    );
  });

  it('lista cada elo na ordem das posições, com nome, tipo e nota', () => {
    render(<ReferralChainEditor subject={pedro} value={[link(carlos, 2), link(joao, 1, 'Vizinho de cerca')]} />);

    const [first, second] = items();
    expect(first).toHaveAccessibleName('1. João Batista');
    expect(first).toHaveTextContent('Externo');
    expect(first).toHaveTextContent('Vizinho de cerca');
    expect(second).toHaveAccessibleName('2. Carlos Menezes');
    expect(second).toHaveTextContent('Interno');
  });

  it('sem onChange, ou com readOnly, não oferece controle de edição', () => {
    const { rerender } = render(<ReferralChainEditor subject={pedro} value={twoLevels} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    rerender(<ReferralChainEditor subject={pedro} value={twoLevels} onChange={vi.fn()} readOnly searchUsers={searchUsers} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('avisa quando não há indicador', () => {
    render(<ReferralChainEditor subject={pedro} value={[]} />);

    expect(screen.getByText('Nenhum indicador registrado.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('aponta no elo o indicador repetido e o próprio sujeito', () => {
    const self: Referrer = { kind: 'contact', id: pedro.id, name: pedro.name };
    render(<ReferralChainEditor subject={pedro} value={[link(joao, 1), link(joao, 2), link(self, 3)]} />);

    const [first, second, third] = items();
    expect(first).not.toHaveTextContent('já está na cadeia');
    expect(second).toHaveTextContent('João Batista já está na cadeia, na posição 1.');
    expect(third).toHaveTextContent('Pedro Almeida é quem foi indicado e não pode entrar na própria cadeia.');
  });
});

describe('ReferralChainEditor — edição', () => {
  it('o Field nomeia o seletor do próximo indicador', () => {
    render(<Harness initial={twoLevels} />);

    expect(screen.getByRole('combobox', { name: 'Cadeia de indicação' })).toHaveTextContent(
      'Quem indicou Sebastião Ferreira?',
    );
  });

  it('acrescenta o contato escolhido ao fim, sem oferecer o sujeito nem quem já está na cadeia', async () => {
    const onLinks = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={twoLevels} onLinks={onLinks} />);

    await user.click(screen.getByRole('combobox', { name: 'Cadeia de indicação' }));
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([expect.stringContaining('Antônio Ribeiro')]);
    expect(options[0]).toHaveTextContent('Corretor externo');
    await user.click(options[0]!);

    expect(onLinks).toHaveBeenLastCalledWith([
      ...twoLevels,
      link({ kind: 'contact', id: 'c-antonio', name: 'Antônio Ribeiro' }, 3),
    ]);
    expect(items()).toHaveLength(3);
    expect(screen.getByText('Antônio Ribeiro entrou na cadeia, na posição 3.')).toBeInTheDocument();
  });

  it('troca para o corretor interno e acrescenta o usuário escolhido', async () => {
    const onLinks = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={[link(carlos, 1)]} onLinks={onLinks} />);

    const internal = screen.getByRole('button', { name: 'Interno' });
    expect(internal).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Externo' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(internal);
    expect(internal).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('combobox', { name: 'Cadeia de indicação' }));
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([expect.stringContaining('Marina Duarte')]);
    await user.click(options[0]!);

    expect(onLinks).toHaveBeenLastCalledWith([
      link(carlos, 1),
      link({ kind: 'user', id: 'u-marina', name: 'Marina Duarte' }, 2),
    ]);
  });

  it('com uma só busca, não mostra a escolha do tipo', () => {
    render(<Harness searchUsers={undefined} />);

    expect(screen.queryByRole('button', { name: 'Interno' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Cadeia de indicação' })).toHaveTextContent('Quem indicou Pedro Almeida?');
  });

  it('remove o elo, renumera os seguintes, anuncia e leva o foco ao próximo', async () => {
    const onLinks = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={[...twoLevels, link(carlos, 3)]} onLinks={onLinks} />);

    await user.click(screen.getByRole('button', { name: 'Remover João Batista' }));

    expect(onLinks).toHaveBeenLastCalledWith([link(sebastiao, 1), link(carlos, 2)]);
    expect(items().map((item) => item.getAttribute('aria-label'))).toEqual(['1. Sebastião Ferreira', '2. Carlos Menezes']);
    expect(screen.getByText('João Batista saiu da cadeia.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remover Sebastião Ferreira' })).toHaveFocus();
  });

  it('removido o último elo, o foco vai para o seletor do próximo indicador', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[link(joao, 1)]} />);

    await user.click(screen.getByRole('button', { name: 'Remover João Batista' }));

    expect(screen.getByRole('combobox', { name: 'Cadeia de indicação' })).toHaveFocus();
  });

  it('reordena pelo teclado, deriva a posição e anuncia', async () => {
    const onLinks = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={twoLevels} onLinks={onLinks} />);

    screen.getByRole('button', { name: 'Mover João Batista' }).focus();
    await user.keyboard(' ');
    expect(screen.getByText(/João Batista pego, na posição 1 de 2/)).toBeInTheDocument();
    await user.keyboard('{ArrowDown}');
    await user.keyboard(' ');

    expect(onLinks).toHaveBeenLastCalledWith([link(sebastiao, 1), link(joao, 2, 'Vizinho de cerca')]);
    expect(screen.getByText('João Batista solto na posição 2 de 2.')).toBeInTheDocument();
    expect(items()[1]).toHaveAccessibleName('2. João Batista');
  });

  it('reordena por arrastar', () => {
    const onLinks = vi.fn();
    render(<Harness initial={twoLevels} onLinks={onLinks} />);

    const [first, second] = items();
    const dataTransfer = { types: [], setData: vi.fn(), effectAllowed: 'none', dropEffect: 'none' };
    fireEvent.dragStart(first!, { dataTransfer });
    fireEvent.dragOver(second!, { dataTransfer });
    fireEvent.drop(chainList(), { dataTransfer });
    fireEvent.dragEnd(first!, { dataTransfer });

    expect(onLinks).toHaveBeenLastCalledWith([link(sebastiao, 1), link(joao, 2, 'Vizinho de cerca')]);
  });

  it('edita a nota do elo; nota apagada vira null', async () => {
    const onLinks = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={twoLevels} onLinks={onLinks} />);

    const note = screen.getByRole('textbox', { name: 'Nota sobre Sebastião Ferreira' });
    await user.type(note, 'Primo');
    expect(onLinks).toHaveBeenLastCalledWith([twoLevels[0], link(sebastiao, 2, 'Primo')]);

    await user.clear(screen.getByRole('textbox', { name: 'Nota sobre João Batista' }));
    expect(onLinks).toHaveBeenLastCalledWith([link(joao, 1), link(sebastiao, 2, 'Primo')]);
  });

  it('as notas não herdam o id nem a descrição do Field', () => {
    render(<Harness initial={twoLevels} />);

    const note = screen.getByRole('textbox', { name: 'Nota sobre João Batista' });
    const picker = screen.getByRole('combobox', { name: 'Cadeia de indicação' });
    expect(note.id).not.toBe(picker.id);
  });

  it('desabilitado, trava todos os controles', () => {
    render(<Harness initial={twoLevels} disabled />);

    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    for (const note of screen.getAllByRole('textbox')) expect(note).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Cadeia de indicação' })).toBeDisabled();
  });
});

/** Dez contatos fictícios, do 1 ao 10, na ordem. */
const fullChain = (count = 10): ReferralLink[] =>
  Array.from({ length: count }, (_, index) =>
    link({ kind: 'contact', id: `c-extra-${index + 1}`, name: `Indicador ${index + 1}` }, index + 1),
  );

describe('ReferralChainEditor — limite de indicadores', () => {
  it('com 10 elos, esconde o seletor e mostra o aviso de limite', () => {
    render(<Harness initial={fullChain()} />);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText(REFERRAL_CHAIN_LIMIT_REACHED_MESSAGE)).toBeVisible();
    expect(screen.getByText('Limite de 10 indicadores atingido.')).toBeInTheDocument();
  });

  it('com 9 elos, o seletor continua e não há aviso', () => {
    render(<Harness initial={fullChain(9)} />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.queryByText(REFERRAL_CHAIN_LIMIT_REACHED_MESSAGE)).not.toBeInTheDocument();
  });

  it('somente leitura com 10 elos não mostra o aviso', () => {
    render(<ReferralChainEditor subject={pedro} value={fullChain()} />);

    expect(screen.queryByText(REFERRAL_CHAIN_LIMIT_REACHED_MESSAGE)).not.toBeInTheDocument();
  });

  it('o 10º indicador anuncia o limite e leva o foco ao remover dele', async () => {
    const user = userEvent.setup();
    render(<Harness initial={fullChain(9)} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: /Antônio Ribeiro/ }));

    expect(
      screen.getByText(`Antônio Ribeiro entrou na cadeia, na posição 10. ${REFERRAL_CHAIN_LIMIT_REACHED_MESSAGE}`),
    ).toHaveAttribute('role', 'status');
    expect(screen.getByRole('button', { name: 'Remover Antônio Ribeiro' })).toHaveFocus();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('abaixo do limite, o anúncio da entrada não cita o limite', async () => {
    const user = userEvent.setup();
    render(<Harness initial={twoLevels} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: /Antônio Ribeiro/ }));

    expect(screen.getByText('Antônio Ribeiro entrou na cadeia, na posição 3.')).toHaveAttribute('role', 'status');
    expect(screen.queryByText(/Limite de/)).not.toBeInTheDocument();
  });

  it('o aviso de limite é texto comum: sem role nem aria-live, para não duplicar o anúncio', () => {
    render(<Harness initial={fullChain()} />);

    const warning = screen.getByText(REFERRAL_CHAIN_LIMIT_REACHED_MESSAGE);
    expect(warning).not.toHaveAttribute('role');
    expect(warning).not.toHaveAttribute('aria-live');
    expect(warning.closest('[role="status"], [aria-live]')).toBeNull();
  });

  it('com a cadeia cheia, o rótulo e a descrição do Field apontam para a lista, que existe', () => {
    render(
      <Field label="Cadeia de indicação" hint="Quem trouxe o contato.">
        <ReferralChainEditor subject={pedro} value={fullChain()} onChange={vi.fn()} />
      </Field>,
    );

    const label = screen.getByText('Cadeia de indicação', { selector: 'label' });
    const list = screen.getByRole('list', { name: /Cadeia de indicação de/ });
    expect(document.getElementById(label.getAttribute('for') ?? '')).toBe(list);
    const described = (list.getAttribute('aria-describedby') ?? '').split(' ');
    expect(described.length).toBeGreaterThan(0);
    for (const id of described) expect(document.getElementById(id)).not.toBeNull();
  });

  it('removido um elo com a cadeia cheia, o seletor volta', async () => {
    const user = userEvent.setup();
    render(<Harness initial={fullChain()} />);

    await user.click(screen.getByRole('button', { name: 'Remover Indicador 3' }));

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.queryByText(REFERRAL_CHAIN_LIMIT_REACHED_MESSAGE)).not.toBeInTheDocument();
  });
});

describe('ReferralChainEditor — indicador sem acesso', () => {
  const carlosUnlinked: Referrer = { ...carlos, linked: false };

  it('usuário com linked: false mostra Interno e Sem acesso, com o nome do elo', () => {
    render(<ReferralChainEditor subject={pedro} value={[link(joao, 1), link(carlosUnlinked, 2)]} />);

    const [, second] = items();
    expect(second).toHaveAccessibleName('2. Carlos Menezes');
    expect(second).toHaveTextContent('Interno');
    expect(second).toHaveTextContent('Sem acesso');
  });

  it('usuário vinculado ou sem linked não mostra Sem acesso', () => {
    const marina: Referrer = { kind: 'user', id: 'u-marina', name: 'Marina Duarte' };
    render(<ReferralChainEditor subject={pedro} value={[link({ ...carlos, linked: true }, 1), link(marina, 2)]} />);

    for (const item of items()) expect(item).not.toHaveTextContent('Sem acesso');
  });

  it('contato nunca mostra Sem acesso', () => {
    const contactUnlinked: Referrer = { ...joao, linked: false };
    render(<ReferralChainEditor subject={pedro} value={[link(contactUnlinked, 1)]} />);

    expect(items()[0]).not.toHaveTextContent('Sem acesso');
  });

  it('o elo sem acesso continua editável: nota e remover', () => {
    render(<Harness initial={[link(carlosUnlinked, 1)]} />);

    expect(screen.getByRole('textbox', { name: 'Nota sobre Carlos Menezes' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Remover Carlos Menezes' })).toBeEnabled();
  });
});

describe('ReferralChainEditor — cadastro rápido de contato', () => {
  /** Busca que só acha quem tem o termo no nome: "Sebastiana" não acha ninguém. */
  const filtered = async (term: string) => ({
    items: contacts.filter((option) => option.name.toLowerCase().includes(term.toLowerCase())),
  });
  const filteredUsers = async (term: string) => ({
    items: users.filter((option) => option.name.toLowerCase().includes(term.toLowerCase())),
  });

  it('com onCreateContact, o seletor de contato oferece "Cadastrar contato" com o termo buscado', async () => {
    const onCreateContact = vi.fn(async () => null);
    const user = userEvent.setup();
    const build = await compileStyles();
    render(<Harness onCreateContact={onCreateContact} searchContacts={filtered} />);

    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByPlaceholderText('Buscar contato'), 'Sebastiana');
    const create = await screen.findByRole('button', { name: 'Cadastrar contato' });
    expect(classesWithoutCss(build)).toEqual([]);
    await user.click(create);

    expect(onCreateContact).toHaveBeenCalledWith('Sebastiana');
  });

  it('sem onCreateContact, não há "Cadastrar contato"', async () => {
    const user = userEvent.setup();
    render(<Harness searchContacts={filtered} />);

    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByPlaceholderText('Buscar contato'), 'Sebastiana');
    await screen.findByText(/Nenhum resultado para/);
    expect(screen.queryByRole('button', { name: 'Cadastrar contato' })).not.toBeInTheDocument();
  });

  it('na busca de interno, não há "Cadastrar contato"', async () => {
    const user = userEvent.setup();
    render(<Harness onCreateContact={vi.fn()} searchContacts={filtered} searchUsers={filteredUsers} />);

    await user.click(screen.getByRole('button', { name: 'Interno' }));
    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByPlaceholderText('Buscar usuário'), 'Sebastiana');
    await screen.findByText(/Nenhum resultado para/);
    expect(screen.queryByRole('button', { name: 'Cadastrar contato' })).not.toBeInTheDocument();
  });
});

describe('ReferralChainEditor — contato criado pelo cadastro rápido', () => {
  const filtered = async (term: string) => ({
    items: contacts.filter((option) => option.name.toLowerCase().includes(term.toLowerCase())),
  });
  const novo: Referrer = { kind: 'contact', id: 'c-novo', name: 'Sebastiana Nova' };

  async function openCreate(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByPlaceholderText('Buscar contato'), 'Sebastiana');
    await user.click(await screen.findByRole('button', { name: 'Cadastrar contato' }));
  }

  it('quando devolve o contato, ele entra no fim, o status anuncia e o foco fica no seletor', async () => {
    const onLinks = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={twoLevels} onLinks={onLinks} onCreateContact={async () => novo} searchContacts={filtered} />);

    await openCreate(user);

    await waitFor(() => expect(onLinks).toHaveBeenCalledTimes(1));
    expect(onLinks.mock.lastCall?.[0].map((item: ReferralLink) => item.referrer.name)).toEqual([
      'João Batista',
      'Sebastião Ferreira',
      'Sebastiana Nova',
    ]);
    expect(screen.getByText('Sebastiana Nova entrou na cadeia, na posição 3.')).toHaveAttribute('role', 'status');
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveFocus());
  });

  it('com 9 elos, o 10º pelo cadastro rápido anuncia o limite e leva o foco ao remover dele', async () => {
    const user = userEvent.setup();
    render(<Harness initial={fullChain(9)} onCreateContact={async () => novo} searchContacts={filtered} />);

    await openCreate(user);

    await waitFor(() => expect(screen.queryByRole('combobox')).not.toBeInTheDocument());
    expect(
      screen.getByText(`Sebastiana Nova entrou na cadeia, na posição 10. ${REFERRAL_CHAIN_LIMIT_REACHED_MESSAGE}`),
    ).toHaveAttribute('role', 'status');
    expect(screen.getByRole('button', { name: 'Remover Sebastiana Nova' })).toHaveFocus();
  });

  it('quando devolve null (cancelado), nada muda e o foco volta ao seletor', async () => {
    const onLinks = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={twoLevels} onLinks={onLinks} onCreateContact={async () => null} searchContacts={filtered} />);

    await openCreate(user);

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveFocus());
    expect(onLinks).not.toHaveBeenCalled();
    expect(screen.queryByText(/entrou na cadeia/)).not.toBeInTheDocument();
    expect(items()).toHaveLength(2);
  });

  it('contato devolvido que já está na cadeia não entra de novo', async () => {
    const onLinks = vi.fn();
    const user = userEvent.setup();
    render(<Harness initial={twoLevels} onLinks={onLinks} onCreateContact={async () => joao} searchContacts={filtered} />);

    await openCreate(user);

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveFocus());
    expect(onLinks).not.toHaveBeenCalled();
  });
});
