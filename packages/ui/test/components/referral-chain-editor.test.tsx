// @vitest-environment jsdom
import '../support/dom.js';
import type { ReferralLink, ReferralSubject, Referrer, UserOption } from '@crm/shared';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Field, ReferralChainEditor, type ReferralChainEditorProps } from '../../src/index.js';

const pedro: ReferralSubject = { kind: 'contact', id: 'c-pedro', name: 'Pedro Almeida' };

const joao: Referrer = { kind: 'contact', id: 'c-joao', name: 'João Batista' };
const sebastiao: Referrer = { kind: 'contact', id: 'c-sebastiao', name: 'Sebastião Ferreira' };
const carlos: Referrer = { kind: 'user', id: 'u-carlos', name: 'Carlos Menezes' };

const contacts = [
  { id: 'c-pedro', name: 'Pedro Almeida' },
  { id: 'c-joao', name: 'João Batista' },
  { id: 'c-sebastiao', name: 'Sebastião Ferreira' },
  { id: 'c-antonio', name: 'Antônio Ribeiro' },
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
    expect(options.map((option) => option.textContent)).toEqual(['Antônio Ribeiro']);
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
