import { describe, expect, it } from 'vitest';
import {
  type CommissionGroup,
  type CommissionMember,
  type CommissionParty,
  describeCommissionIssue,
  splitCommission,
  validateCommission,
} from '../src/commission.js';

const carlos: CommissionParty = { kind: 'user', id: 'u-carlos', name: 'Carlos Menezes' };
const marina: CommissionParty = { kind: 'user', id: 'u-marina', name: 'Marina Duarte' };
const joao: CommissionParty = { kind: 'contact', id: 'c-joao', name: 'João Batista' };
const sameIdContact: CommissionParty = { kind: 'contact', id: 'u-carlos', name: 'Carlos (contato)' };

const member = (party: CommissionParty, percent: string | null = null): CommissionMember => ({ party, percent });
const group = (name: string, percent: string | null, members: CommissionMember[]): CommissionGroup => ({
  name,
  percent,
  members,
});

const amounts = (netValue: string | null, groups: CommissionGroup[]) =>
  splitCommission(netValue, groups).groups.map((entry) => entry.members.map((row) => row.amount));

describe('splitCommission — divisão igual', () => {
  it('divide o grupo em partes iguais e soma os grupos no total', () => {
    const split = splitCommission('1000000', [
      group('Venda', '4', [member(carlos), member(marina)]),
      group('Indicação', '1', [member(joao)]),
    ]);

    expect(split.percent).toBe('5');
    expect(split.total).toBe('50000');
    expect(split.groups.map((entry) => entry.amount)).toEqual(['40000', '10000']);
    expect(split.groups[0]!.members).toEqual([
      { percent: '50', salePercent: '2', amount: '20000', overridden: false },
      { percent: '50', salePercent: '2', amount: '20000', overridden: false },
    ]);
    expect(split.groups[1]!.members).toEqual([{ percent: '100', salePercent: '1', amount: '10000', overridden: false }]);
    expect(split.paid).toBe('50000');
  });

  it('a parte igual que não fecha em quatro casas é arredondada só na exibição', () => {
    const split = splitCommission('100', [group('Venda', '6', [member(carlos), member(marina), member(joao)])]);

    expect(split.groups[0]!.members.map((row) => row.percent)).toEqual(['33.3333', '33.3333', '33.3333']);
    // sobre a venda, a conta parte da fração exata: 6% / 3 = 2%
    expect(split.groups[0]!.members.map((row) => row.salePercent)).toEqual(['2', '2', '2']);
  });
});

describe('splitCommission — sobrescrita', () => {
  it('quem tem percentual próprio fica com ele; os demais dividem o resto igualmente', () => {
    const split = splitCommission('1000000', [
      group('Venda', '5', [member(carlos, '50'), member(marina), member(joao)]),
    ]);

    expect(split.groups[0]!.members).toEqual([
      { percent: '50', salePercent: '2.5', amount: '25000', overridden: true },
      { percent: '25', salePercent: '1.25', amount: '12500', overridden: false },
      { percent: '25', salePercent: '1.25', amount: '12500', overridden: false },
    ]);
  });

  it('sobrescrita que passa de 100% deixa os demais com zero e paga o que foi pedido', () => {
    const split = splitCommission('1000', [group('Venda', '10', [member(carlos, '80'), member(marina, '40'), member(joao)])]);

    expect(split.groups[0]!.amount).toBe('100');
    expect(split.groups[0]!.members).toEqual([
      { percent: '80', salePercent: '8', amount: '80', overridden: true },
      { percent: '40', salePercent: '4', amount: '40', overridden: true },
      { percent: '0', salePercent: '0', amount: '0', overridden: false },
    ]);
    // o que se paga de fato passa do total da comissão
    expect(split.total).toBe('100');
    expect(split.paid).toBe('120');
  });

  it('todos sobrescritos somando menos de 100%: o que sobra do grupo fica sem dono', () => {
    const split = splitCommission('1000', [group('Venda', '10', [member(carlos, '30'), member(marina, '30')])]);

    expect(split.groups[0]!.amount).toBe('100');
    expect(split.groups[0]!.members.map((row) => row.amount)).toEqual(['30', '30']);
    expect(split.paid).toBe('60');
  });
});

describe('splitCommission — centavos', () => {
  it('reparte o centavo indivisível sem perder nem sobrar, o primeiro da lista leva o resto', () => {
    // 6% de 1.000,00 = 60,00; em três partes iguais, 20,00 cada
    expect(amounts('1000', [group('Venda', '6', [member(carlos), member(marina), member(joao)])])).toEqual([
      ['20', '20', '20'],
    ]);
    // 1% de 1.000,00 = 10,00; em três, 3,34 + 3,33 + 3,33
    expect(amounts('1000', [group('Venda', '1', [member(carlos), member(marina), member(joao)])])).toEqual([
      ['3.34', '3.33', '3.33'],
    ]);
    // 2% de 1.000,00 = 20,00; em três, 6,67 + 6,67 + 6,66
    expect(amounts('1000', [group('Venda', '2', [member(carlos), member(marina), member(joao)])])).toEqual([
      ['6.67', '6.67', '6.66'],
    ]);
  });

  it('o total é o percentual somado sobre o líquido; os grupos fecham nele ao centavo', () => {
    // 1,5% e 1,5% de 0,99: cada grupo vale 0,01485, o total 0,0297 → 0,03
    const split = splitCommission('0.99', [group('A', '1.5', [member(carlos)]), group('B', '1.5', [member(marina)])]);

    expect(split.total).toBe('0.03');
    expect(split.groups.map((entry) => entry.amount)).toEqual(['0.02', '0.01']);
  });

  it('o resto vai para a maior fração, não para o primeiro', () => {
    // 1.000,01 × 10% = 100,001 → 100,00; 25% / 75% → 25,00 e 75,00
    expect(amounts('1000.01', [group('Venda', '10', [member(carlos, '25'), member(marina, '75')])])).toEqual([
      ['25', '75'],
    ]);
    // 0,07 × 100% = 0,07; 30% / 70% → 0,021 e 0,049 → 0,02 e 0,05
    expect(amounts('0.07', [group('Venda', '100', [member(carlos, '30'), member(marina, '70')])])).toEqual([
      ['0.02', '0.05'],
    ]);
  });

  it('a soma dos membros fecha o grupo em toda divisão igual', () => {
    const cents = (value: string) => {
      const [integer = '', fraction = ''] = value.split('.');
      return BigInt(integer + fraction.padEnd(2, '0'));
    };
    for (const size of [2, 3, 6, 7, 9]) {
      const members = Array.from({ length: size }, (_, index) => member({ kind: 'user', id: `u-${index}`, name: `U${index}` }));
      const split = splitCommission('1234567.89', [group('Venda', '3.3333', members)]);
      const sum = split.groups[0]!.members.reduce((acc, row) => acc + cents(row.amount!), 0n);
      expect(sum).toBe(cents(split.groups[0]!.amount!));
    }
  });
});

describe('splitCommission — dados incompletos', () => {
  it('sem valor líquido, calcula os percentuais e deixa os valores em null', () => {
    const split = splitCommission(null, [group('Venda', '4', [member(carlos), member(marina)])]);

    expect(split.total).toBeNull();
    expect(split.paid).toBeNull();
    expect(split.percent).toBe('4');
    expect(split.groups[0]).toEqual({
      amount: null,
      members: [
        { percent: '50', salePercent: '2', amount: null, overridden: false },
        { percent: '50', salePercent: '2', amount: null, overridden: false },
      ],
    });
  });

  it('grupo sem percentual vale zero', () => {
    const split = splitCommission('1000', [group('Venda', null, [member(carlos)]), group('Indicação', '1', [member(joao)])]);

    expect(split.percent).toBe('1');
    expect(split.groups.map((entry) => entry.amount)).toEqual(['0', '10']);
  });

  it('grupo sem membros tem valor, mas ninguém para recebê-lo', () => {
    const split = splitCommission('1000', [group('Venda', '5', [])]);

    expect(split.groups[0]).toEqual({ amount: '50', members: [] });
    expect(split.paid).toBe('0');
  });

  it('sem grupos, o total é zero', () => {
    expect(splitCommission('1000', [])).toEqual({ percent: '0', total: '0', paid: '0', groups: [] });
  });
});

describe('validateCommission', () => {
  it('comissão bem formada não tem problema', () => {
    expect(
      validateCommission([
        group('Venda', '4', [member(carlos, '60'), member(marina)]),
        group('Indicação', '1', [member(joao), member(carlos)]),
      ]),
    ).toEqual([]);
  });

  it('aponta a soma de sobrescritas acima de 100% do grupo', () => {
    expect(validateCommission([group('Venda', '4', [member(carlos, '70'), member(marina, '40.5')])])).toEqual([
      { code: 'overrides_exceed', group: 0, sum: '110.5' },
    ]);
  });

  it('aponta o grupo todo sobrescrito que não fecha 100%', () => {
    expect(validateCommission([group('Venda', '4', [member(carlos, '30'), member(marina, '30')])])).toEqual([
      { code: 'overrides_short', group: 0, sum: '60' },
    ]);
  });

  it('aponta o membro repetido no mesmo grupo, com a posição em que apareceu primeiro', () => {
    expect(
      validateCommission([group('Venda', '4', [member(carlos), member(marina), member(carlos, '10')])]),
    ).toEqual([{ code: 'duplicate_member', group: 0, member: 2, firstMember: 0, party: carlos }]);
  });

  it('usuário e contato de mesmo id são pessoas diferentes', () => {
    expect(validateCommission([group('Venda', '4', [member(carlos), member(sameIdContact)])])).toEqual([]);
  });

  it('aponta o grupo sem membros', () => {
    expect(validateCommission([group('Venda', '4', [member(carlos)]), group('Indicação', '1', [])])).toEqual([
      { code: 'empty_group', group: 1 },
    ]);
  });
});

describe('describeCommissionIssue', () => {
  it.each([
    [{ code: 'overrides_exceed', group: 0, sum: '110.5' } as const, 'Os percentuais próprios somam 110,5%, acima de 100% do grupo. Reduza-os até fechar 100%.'],
    [{ code: 'overrides_short', group: 0, sum: '60' } as const, 'Os percentuais próprios somam 60% e não fecham 100% do grupo. Ajuste-os ou deixe um em branco para dividir o resto.'],
    [
      { code: 'duplicate_member', group: 0, member: 2, firstMember: 0, party: carlos } as const,
      'Carlos Menezes já está neste grupo. Remova a linha repetida.',
    ],
    [{ code: 'empty_group', group: 1 } as const, 'Grupo sem membros: ninguém recebe esta parte. Adicione um membro ou remova o grupo.'],
  ])('%j', (issue, message) => {
    expect(describeCommissionIssue(issue)).toBe(message);
  });
});
