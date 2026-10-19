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
const summary = () => screen.getByRole('group', { name: 'Resumo da comissão' });
/** Abre o seletor de membro do grupo e devolve o combobox. */
async function openPicker(user: ReturnType<typeof userEvent.setup>, group: string) {
  await user.click(within(groupRegion(group)).getByRole('button', { name: `Adicionar membro a ${group}` }));
  return within(groupRegion(group)).getByRole('combobox', { name: `Quem entra em ${group}?` });
}
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
    expect(summary()).toHaveTextContent('Valor líquidoR$ 1.000.000,00');
    expect(summary()).toHaveTextContent('Comissão total5% · R$ 50.000,00');
  });

  it('mostra quanto cada membro leva da venda: o percentual do grupo vezes o dele', () => {
    render(<CommissionEditor value={sale} netValue="1000000" />);

    expect(memberRow('Venda', 'Carlos Menezes')).toHaveTextContent('2% da venda');
    expect(memberRow('Indicação', 'João Batista')).toHaveTextContent('1% da venda');
  });

  it('sem valor líquido, mostra os percentuais e travessão no lugar dos valores', () => {
    render(<CommissionEditor value={sale} netValue={null} />);

    expect(memberRow('Venda', 'Marina Duarte')).toHaveTextContent('50%');
    expect(memberRow('Venda', 'Marina Duarte')).toHaveTextContent('—');
    expect(summary()).toHaveTextContent('Valor líquido—');
    expect(summary()).toHaveTextContent('Comissão total5% · —');
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
    expect(screen.queryByRole('group', { name: 'Resumo da comissão' })).not.toBeInTheDocument();
  });
});

describe('CommissionEditor — avisos', () => {
  const exceeding: CommissionGroup[] = [{ name: 'Venda', percent: '4', members: [member(carlos, '70'), member(marina, '40'), member(joao)] }];

  it('aponta no grupo a soma de sobrescritas acima de 100%, e liga o aviso aos percentuais que a causam', () => {
    render(<CommissionEditor value={exceeding} netValue="1000000" onChange={vi.fn()} />);

    const message = 'Os percentuais próprios somam 110%, acima de 100% do grupo. Reduza-os até fechar 100%.';
    expect(groupRegion('Venda')).toHaveTextContent(message);
    for (const name of ['Carlos Menezes', 'Marina Duarte']) {
      const percent = screen.getByRole('textbox', { name: `Percentual de ${name} em Venda` });
      expect(percent).toHaveAttribute('aria-invalid', 'true');
      expect(percent).toHaveAccessibleDescription(message);
    }
    const equal = screen.getByRole('textbox', { name: 'Percentual de João Batista em Venda' });
    expect(equal).not.toHaveAttribute('aria-invalid');
  });

  it('com sobrescritas acima de 100%, o resumo mostra o que os membros recebem de fato', () => {
    render(<CommissionEditor value={exceeding} netValue="1000000" />);

    // 4% de 1.000.000 = 40.000; 70% + 40% = 44.000
    expect(summary()).toHaveTextContent('Comissão total4% · R$ 40.000,00');
    expect(summary()).toHaveTextContent('Os membros recebem R$ 44.000,00, acima do total.');
  });

  it('aponta no membro a repetição, ligada ao percentual dele', () => {
    render(<CommissionEditor value={[{ name: 'Venda', percent: '4', members: [member(carlos), member(carlos)] }]} onChange={vi.fn()} />);

    const rows = within(groupRegion('Venda')).getAllByRole('listitem');
    expect(rows[0]).not.toHaveTextContent('já está neste grupo');
    expect(rows[1]).toHaveTextContent('Carlos Menezes já está neste grupo. Remova a linha repetida.');
    const [, repeated] = screen.getAllByRole('textbox', { name: 'Percentual de Carlos Menezes em Venda' });
    expect(repeated).toHaveAttribute('aria-invalid', 'true');
    expect(repeated).toHaveAccessibleDescription('Carlos Menezes já está neste grupo. Remova a linha repetida.');
  });

  it('aponta o grupo sem membros, ligado ao seletor que resolve', () => {
    render(<CommissionEditor value={[{ name: 'Captação', percent: '1', members: [] }]} onChange={vi.fn()} searchUsers={searchUsers} />);

    const message = 'Grupo sem membros: ninguém recebe esta parte. Adicione um membro ou remova o grupo.';
    expect(groupRegion('Captação')).toHaveTextContent(message);
    expect(within(groupRegion('Captação')).getByRole('combobox', { name: 'Quem entra em Captação?' })).toHaveAccessibleDescription(
      message,
    );
  });
});

describe('CommissionEditor — modo restrito', () => {
  it('mostra só a linha do usuário atual, sem colegas, sem valor do grupo e sem total', () => {
    render(<CommissionEditor value={sale} netValue="1000000" visibility="own" currentUserId="u-carlos" onChange={vi.fn()} />);

    expect(memberRow('Venda', 'Carlos Menezes')).toHaveTextContent('R$ 20.000,00');
    expect(screen.queryByText('Marina Duarte')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Indicação' })).not.toBeInTheDocument();
    expect(screen.queryByText('R$ 40.000,00')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Resumo da comissão' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('avisa quando o usuário não participa', () => {
    render(<CommissionEditor value={sale} visibility="own" currentUserId="u-outro" />);

    expect(screen.getByText('Você não participa desta comissão.')).toBeInTheDocument();
  });
});

describe('CommissionEditor — edição', () => {
  it('o Field nomeia o editor como grupo; o botão de adicionar grupo guarda o próprio nome', () => {
    render(<Harness />);

    expect(screen.getByRole('group', { name: 'Comissão' })).toHaveAttribute('data-slot', 'commission-editor');
    expect(screen.getByRole('button', { name: 'Adicionar grupo' })).toBeInTheDocument();
  });

  it('adiciona um grupo vazio ao fim e leva o foco ao nome dele', async () => {
    const onGroups = vi.fn();
    const user = userEvent.setup();
    render(<Harness onGroups={onGroups} />);

    await user.click(screen.getByRole('button', { name: 'Adicionar grupo' }));

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

  it('remove o grupo, anuncia e oferece desfazer, com o foco nele', async () => {
    const onGroups = vi.fn();
    const user = userEvent.setup();
    render(<Harness onGroups={onGroups} />);

    await user.click(screen.getByRole('button', { name: 'Remover grupo Venda' }));

    expect(onGroups).toHaveBeenLastCalledWith([sale[1]]);
    expect(screen.queryByRole('region', { name: 'Venda' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Grupo Venda removido.');
    const undo = screen.getByRole('button', { name: 'Desfazer a remoção de Venda' });
    expect(undo).toHaveFocus();

    await user.click(undo);

    expect(onGroups).toHaveBeenLastCalledWith(sale);
    expect(groupRegion('Venda')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desfazer a remoção de Venda' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nome do grupo 1' })).toHaveFocus();
  });

  it('o seletor de membro abre sob demanda, já no corretor interno, com o foco nele', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(within(groupRegion('Venda')).queryByRole('combobox')).not.toBeInTheDocument();
    const picker = await openPicker(user, 'Venda');

    expect(picker).toHaveFocus();
    expect(within(groupRegion('Venda')).getByRole('button', { name: 'Interno' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('adiciona o contato escolhido ao grupo, sem oferecer quem já está nele, e fecha o seletor', async () => {
    const onGroups = vi.fn();
    const user = userEvent.setup();
    render(<Harness onGroups={onGroups} />);

    await openPicker(user, 'Indicação');
    await user.click(within(groupRegion('Indicação')).getByRole('button', { name: 'Externo' }));
    await user.click(within(groupRegion('Indicação')).getByRole('combobox', { name: 'Quem entra em Indicação?' }));
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([expect.stringContaining('Antônio Ribeiro')]);
    await user.click(options[0]!);

    const antonio: CommissionParty = { kind: 'contact', id: 'c-antonio', name: 'Antônio Ribeiro' };
    expect(onGroups).toHaveBeenLastCalledWith([sale[0], { ...sale[1], members: [member(joao), member(antonio)] }]);
    expect(memberRow('Indicação', 'Antônio Ribeiro')).toHaveTextContent('R$ 5.000,00');
    expect(screen.getByText('Antônio Ribeiro entrou em Indicação.')).toBeInTheDocument();
    expect(within(groupRegion('Indicação')).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(groupRegion('Indicação')).getByRole('button', { name: 'Adicionar membro a Indicação' })).toHaveFocus();
  });

  it('adiciona o usuário escolhido', async () => {
    const onGroups = vi.fn();
    const user = userEvent.setup();
    render(<Harness onGroups={onGroups} />);

    await user.click(await openPicker(user, 'Indicação'));
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

    expect(within(groupRegion('Indicação')).getByRole('combobox', { name: 'Quem entra em Indicação?' })).toHaveFocus();
  });

  it('os campos internos não herdam o id nem a descrição do Field', () => {
    render(<Harness />);

    const editor = screen.getByRole('group', { name: 'Comissão' });
    for (const field of screen.getAllByRole('textbox')) expect(field.id).not.toBe(editor.id);
    expect(screen.getByRole('button', { name: 'Adicionar grupo' }).id).not.toBe(editor.id);
  });

  it('desabilitado, trava todos os controles', () => {
    render(<Harness disabled />);

    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    for (const field of screen.getAllByRole('textbox')) expect(field).toBeDisabled();
    for (const picker of screen.queryAllByRole('combobox')) expect(picker).toBeDisabled();
  });
});
