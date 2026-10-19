// @vitest-environment jsdom
import '../support/dom.js';
import type { CommissionGroup, CommissionMember, CommissionParty, ContactOption, UserOption } from '@crm/shared';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CommissionEditor, type CommissionEditorProps, Field } from '../../src/index.js';

const carlos: CommissionParty = { kind: 'user', id: 'u-carlos', name: 'Carlos Menezes' };
const marina: CommissionParty = { kind: 'user', id: 'u-marina', name: 'Marina Duarte' };
const joao: CommissionParty = { kind: 'contact', id: 'c-joao', name: 'João Batista' };

const contacts: ContactOption[] = [
  { id: 'c-joao', name: 'João Batista', personType: 'pf', taxId: null, roles: ['external_broker'] },
  { id: 'c-antonio', name: 'Antônio Ribeiro', personType: 'pf', taxId: null, roles: ['external_broker'] },
];

const users: UserOption[] = [
  { id: 'u-carlos', name: 'Carlos Menezes', email: 'carlos@grandvista.com.br' },
  { id: 'u-marina', name: 'Marina Duarte', email: 'marina@grandvista.com.br' },
];

const searchContacts = async () => ({ items: contacts });
const searchUsers = async () => ({ items: users });

const member = (party: CommissionParty, percent: string | null = null): CommissionMember => ({ party, percent });

const sale: CommissionGroup[] = [
  { name: 'Venda', percent: '4', members: [member(carlos), member(marina)] },
  { name: 'Indicação', percent: '1', members: [member(joao)] },
];

type HarnessProps = Partial<CommissionEditorProps> & {
  initial?: CommissionGroup[];
  onGroups?: (groups: CommissionGroup[]) => void;
};

function Harness({ initial = sale, onGroups, ...props }: HarnessProps) {
  const [value, setValue] = useState(initial);
  return (
    <Field label="Comissão">
      <CommissionEditor
        value={value}
        onChange={(groups) => {
          setValue(groups);
          onGroups?.(groups);
        }}
        netValue="1000000"
        searchContacts={searchContacts}
        searchUsers={searchUsers}
        {...(props as object)}
      />
    </Field>
  );
}

const groupRegion = (name: string) => screen.getByRole('region', { name });
const memberRow = (group: string, name: string) =>
  within(within(groupRegion(group)).getByRole('list', { name: `Membros de ${group}` })).getByRole('listitem', {
    name,
  });

describe('CommissionEditor — leitura', () => {
  it('mostra cada grupo com percentual e valor, cada membro com a parte e o valor, e o total', () => {
    render(<CommissionEditor value={sale} netValue="1000000" />);

    const venda = groupRegion('Venda');
    expect(venda).toHaveTextContent('4%');
    expect(venda).toHaveTextContent('R$ 40.000,00');
    expect(memberRow('Venda', 'Carlos Menezes')).toHaveTextContent('50%');
    expect(memberRow('Venda', 'Carlos Menezes')).toHaveTextContent('R$ 20.000,00');
    expect(memberRow('Indicação', 'João Batista')).toHaveTextContent('Externo');
    expect(memberRow('Indicação', 'João Batista')).toHaveTextContent('R$ 10.000,00');
    expect(screen.getByText('Comissão total').closest('p')).toHaveTextContent('Comissão total · 5% · R$ 50.000,00');
  });

  it('sem valor líquido, mostra os percentuais e travessão no lugar dos valores', () => {
    render(<CommissionEditor value={sale} netValue={null} />);

    expect(memberRow('Venda', 'Marina Duarte')).toHaveTextContent('50%');
    expect(memberRow('Venda', 'Marina Duarte')).toHaveTextContent('—');
    expect(screen.getByText('Comissão total').closest('p')).toHaveTextContent('Comissão total · 5% · —');
  });

  it('sem onChange, ou com readOnly, não oferece controle de edição', () => {
    const { rerender } = render(<CommissionEditor value={sale} netValue="1000" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    rerender(<CommissionEditor value={sale} netValue="1000" onChange={vi.fn()} readOnly searchUsers={searchUsers} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('avisa quando não há grupo', () => {
    render(<CommissionEditor value={[]} netValue="1000" />);

    expect(screen.getByText('Nenhum grupo de comissão.')).toBeInTheDocument();
    expect(screen.queryByText('Comissão total')).not.toBeInTheDocument();
  });
});

describe('CommissionEditor — avisos', () => {
  it('aponta no grupo a soma de sobrescritas acima de 100%', () => {
    render(<CommissionEditor value={[{ name: 'Venda', percent: '4', members: [member(carlos, '70'), member(marina, '40')] }]} />);

    expect(groupRegion('Venda')).toHaveTextContent('Os percentuais próprios somam 110%, acima de 100% do grupo.');
  });

  it('aponta no membro a repetição', () => {
    render(<CommissionEditor value={[{ name: 'Venda', percent: '4', members: [member(carlos), member(carlos)] }]} />);

    const rows = within(groupRegion('Venda')).getAllByRole('listitem');
    expect(rows[0]).not.toHaveTextContent('já está neste grupo');
    expect(rows[1]).toHaveTextContent('Carlos Menezes já está neste grupo.');
  });

  it('aponta o grupo sem membros', () => {
    render(<CommissionEditor value={[{ name: 'Captação', percent: '1', members: [] }]} />);

    expect(groupRegion('Captação')).toHaveTextContent('Grupo sem membros: ninguém recebe esta parte.');
  });
});

describe('CommissionEditor — modo restrito', () => {
  it('mostra só a linha do usuário atual, sem colegas, sem valor do grupo e sem total', () => {
    render(<CommissionEditor value={sale} netValue="1000000" visibility="own" currentUserId="u-carlos" onChange={vi.fn()} />);

    expect(memberRow('Venda', 'Carlos Menezes')).toHaveTextContent('R$ 20.000,00');
    expect(screen.queryByText('Marina Duarte')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Indicação' })).not.toBeInTheDocument();
    expect(screen.queryByText('R$ 40.000,00')).not.toBeInTheDocument();
    expect(screen.queryByText('Comissão total')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('avisa quando o usuário não participa', () => {
    render(<CommissionEditor value={sale} visibility="own" currentUserId="u-outro" />);

    expect(screen.getByText('Você não participa desta comissão.')).toBeInTheDocument();
  });
});

describe('CommissionEditor — edição', () => {
  it('o Field nomeia o botão de adicionar grupo', () => {
    render(<Harness />);

    expect(screen.getByRole('button', { name: 'Comissão' })).toHaveTextContent('Adicionar grupo');
  });

  it('adiciona um grupo vazio ao fim e leva o foco ao nome dele', async () => {
    const onGroups = vi.fn();
    const user = userEvent.setup();
    render(<Harness onGroups={onGroups} />);

    await user.click(screen.getByRole('button', { name: 'Comissão' }));

    expect(onGroups).toHaveBeenLastCalledWith([...sale, { name: '', percent: null, members: [] }]);
    const name = screen.getByRole('textbox', { name: 'Nome do grupo 3' });
    expect(name).toHaveFocus();
    expect(screen.getByRole('region', { name: 'Grupo 3' })).toHaveTextContent('Grupo sem membros');
  });

  it('edita o nome e o percentual do grupo', async () => {
    const onGroups = vi.fn();
    const user = userEvent.setup();
    render(<Harness onGroups={onGroups} />);

    const name = screen.getByRole('textbox', { name: 'Nome do grupo 2' });
    await user.clear(name);
    await user.type(name, 'Captação');
    expect(onGroups).toHaveBeenLastCalledWith([sale[0], { ...sale[1], name: 'Captação' }]);

    const percent = screen.getByRole('textbox', { name: 'Percentual de Venda' });
    await user.clear(percent);
    await user.type(percent, '5');
    expect(onGroups).toHaveBeenLastCalledWith([{ ...sale[0], percent: '5' }, { ...sale[1], name: 'Captação' }]);
    expect(groupRegion('Venda')).toHaveTextContent('R$ 50.000,00');
  });

  it('remove o grupo, anuncia e leva o foco ao botão de adicionar grupo', async () => {
    const onGroups = vi.fn();
    const user = userEvent.setup();
    render(<Harness onGroups={onGroups} />);

    await user.click(screen.getByRole('button', { name: 'Remover grupo Venda' }));

    expect(onGroups).toHaveBeenLastCalledWith([sale[1]]);
    expect(screen.queryByRole('region', { name: 'Venda' })).not.toBeInTheDocument();
    expect(screen.getByText('Grupo Venda removido.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comissão' })).toHaveFocus();
  });

  it('adiciona o contato escolhido ao grupo, sem oferecer quem já está nele', async () => {
    const onGroups = vi.fn();
    const user = userEvent.setup();
    render(<Harness onGroups={onGroups} />);

    await user.click(within(groupRegion('Indicação')).getByRole('combobox', { name: 'Adicionar membro a Indicação' }));
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([expect.stringContaining('Antônio Ribeiro')]);
    await user.click(options[0]!);

    const antonio: CommissionParty = { kind: 'contact', id: 'c-antonio', name: 'Antônio Ribeiro' };
    expect(onGroups).toHaveBeenLastCalledWith([sale[0], { ...sale[1], members: [member(joao), member(antonio)] }]);
    expect(memberRow('Indicação', 'Antônio Ribeiro')).toHaveTextContent('R$ 5.000,00');
    expect(screen.getByText('Antônio Ribeiro entrou em Indicação.')).toBeInTheDocument();
  });

  it('troca para o corretor interno e adiciona o usuário escolhido', async () => {
    const onGroups = vi.fn();
    const user = userEvent.setup();
    render(<Harness onGroups={onGroups} />);

    const indicacao = groupRegion('Indicação');
    await user.click(within(indicacao).getByRole('button', { name: 'Interno' }));
    await user.click(within(indicacao).getByRole('combobox', { name: 'Adicionar membro a Indicação' }));
    const options = await screen.findAllByRole('option');
    await user.click(options.find((option) => option.textContent?.includes('Marina Duarte'))!);

    expect(onGroups).toHaveBeenLastCalledWith([sale[0], { ...sale[1], members: [member(joao), member(marina)] }]);
  });

  it('percentual vazio mostra a parte igual; preenchido sobrescreve e redivide o resto', async () => {
    const onGroups = vi.fn();
    const user = userEvent.setup();
    render(<Harness onGroups={onGroups} />);

    const carlosPercent = screen.getByRole('textbox', { name: 'Percentual de Carlos Menezes em Venda' });
    expect(carlosPercent).toHaveValue('');
    expect(carlosPercent).toHaveAttribute('placeholder', '50');

    await user.type(carlosPercent, '75');

    expect(onGroups).toHaveBeenLastCalledWith([{ ...sale[0], members: [member(carlos, '75'), member(marina)] }, sale[1]]);
    expect(screen.getByRole('textbox', { name: 'Percentual de Marina Duarte em Venda' })).toHaveAttribute('placeholder', '25');
    expect(memberRow('Venda', 'Carlos Menezes')).toHaveTextContent('R$ 30.000,00');
    expect(memberRow('Venda', 'Marina Duarte')).toHaveTextContent('R$ 10.000,00');

    await user.clear(carlosPercent);
    expect(onGroups).toHaveBeenLastCalledWith(sale);
  });

  it('remove o membro, anuncia e leva o foco ao remover do seguinte', async () => {
    const onGroups = vi.fn();
    const user = userEvent.setup();
    render(<Harness onGroups={onGroups} />);

    await user.click(screen.getByRole('button', { name: 'Remover Carlos Menezes de Venda' }));

    expect(onGroups).toHaveBeenLastCalledWith([{ ...sale[0], members: [member(marina)] }, sale[1]]);
    expect(screen.getByText('Carlos Menezes saiu de Venda.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remover Marina Duarte de Venda' })).toHaveFocus();
  });

  it('removido o último membro, o foco vai para o seletor do grupo', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Remover João Batista de Indicação' }));

    expect(within(groupRegion('Indicação')).getByRole('combobox', { name: 'Adicionar membro a Indicação' })).toHaveFocus();
  });

  it('os campos internos não herdam o id nem a descrição do Field', () => {
    render(<Harness />);

    const addGroup = screen.getByRole('button', { name: 'Comissão' });
    for (const field of screen.getAllByRole('textbox')) expect(field.id).not.toBe(addGroup.id);
  });

  it('desabilitado, trava todos os controles', () => {
    render(<Harness disabled />);

    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    for (const field of screen.getAllByRole('textbox')) expect(field).toBeDisabled();
    for (const picker of screen.getAllByRole('combobox')) expect(picker).toBeDisabled();
  });
});
