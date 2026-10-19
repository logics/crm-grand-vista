// Divisão da comissão de uma venda: percentual sobre o valor líquido, por
// grupo; dentro do grupo, divisão igual entre os membros, a não ser que o
// membro tenha percentual próprio — quem tem fica com ele, e os demais dividem
// o que sobra dos 100% do grupo. Função pura, sem HTTP nem banco: usada pelo
// `CommissionEditor` na prévia e, quando as rotas de venda nascerem, pela API —
// a mesma conta nos dois lados. Aritmética decimal exata, nunca `number`.
//
// Centavos não se perdem nem sobram: o total é o percentual somado sobre o
// líquido, arredondado uma vez; os grupos repartem esse total e os membros
// repartem o do grupo, cada um pelo maior resto (o centavo indivisível vai à
// maior fração, e no empate ao primeiro da lista).

import {
  MONEY_SCALE,
  PERCENT_SCALE,
  compareDecimal,
  divRound,
  formatPercent,
  rescale,
  toCanonical,
  toScaled,
} from './decimal.js';
import { type Referrer, referrerKey } from './referral-chain.js';

/** Participante da comissão: polimórfico como o indicador, corretor interno (usuário) ou externo (contato). */
export type CommissionParty = Referrer;

/** `percent` nulo é divisão igual; preenchido sobrescreve. */
export type CommissionMember = { party: CommissionParty; percent: string | null };

/** `percent` sobre o valor líquido da venda; nulo (ainda não informado) vale zero. */
export type CommissionGroup = { name: string; percent: string | null; members: CommissionMember[] };

export type CommissionMemberSplit = {
  /** Percentual efetivo dentro do grupo: o próprio ou a parte igual, em quatro casas. */
  percent: string;
  /** Percentual efetivo sobre o valor líquido da venda: o do grupo vezes o do membro, em quatro casas. */
  salePercent: string;
  /** Em reais; nulo sem valor líquido. */
  amount: string | null;
  /** Se o percentual é o próprio do membro, não a parte igual. */
  overridden: boolean;
};

export type CommissionGroupSplit = { amount: string | null; members: CommissionMemberSplit[] };

export type CommissionSplit = {
  /** Soma dos percentuais dos grupos, sobre o líquido. */
  percent: string;
  /** O percentual sobre o líquido, em reais. */
  total: string | null;
  /**
   * O que os membros recebem de fato, somados. É o total quando a comissão é
   * válida; difere dele com sobrescritas que não fecham 100% ou grupo sem membros.
   */
  paid: string | null;
  groups: CommissionGroupSplit[];
};

/**
 * Problema de uma comissão, pelo índice do grupo (e do membro, no grupo).
 * `overrides_exceed`: os percentuais próprios passam de 100% do grupo.
 * `overrides_short`: todos têm percentual próprio e a soma não chega a 100% —
 * parte do grupo fica sem dono. `duplicate_member`: o participante já está no
 * grupo, em `firstMember`; em grupos diferentes não é problema (quem capta e
 * também vende). `empty_group`: ninguém recebe a parte do grupo.
 */
export type CommissionIssue =
  | { code: 'overrides_exceed' | 'overrides_short'; group: number; sum: string }
  | { code: 'duplicate_member'; group: number; member: number; firstMember: number; party: CommissionParty }
  | { code: 'empty_group'; group: number };

const HUNDRED = 100n * 10n ** BigInt(PERCENT_SCALE);

/** Decimal canônico em unidades de `scale` casas, arredondado; nulo é zero. */
const toUnits = (value: string | null, scale: number) => (value === null ? 0n : rescale(toScaled(value), scale));

/**
 * Reparte `total` (inteiro) na proporção dos pesos, pelo maior resto: cada um
 * leva o piso da sua parte, e o que falta vai, um a um, às maiores frações —
 * no empate, ao primeiro. A soma é sempre `total`.
 */
function apportion(total: bigint, weights: readonly bigint[]): bigint[] {
  const sum = weights.reduce((acc, weight) => acc + weight, 0n);
  if (sum === 0n) return weights.map(() => 0n);
  const shares = weights.map((weight) => ({ floor: (total * weight) / sum, rest: (total * weight) % sum }));
  let missing = total - shares.reduce((acc, share) => acc + share.floor, 0n);
  const order = shares
    .map((share, index) => ({ ...share, index }))
    .sort((a, b) => (a.rest === b.rest ? a.index - b.index : a.rest > b.rest ? -1 : 1));
  const result = shares.map((share) => share.floor);
  for (const { index } of order) {
    if (missing === 0n) break;
    result[index]! += 1n;
    missing -= 1n;
  }
  return result;
}

/**
 * Pesos dos membros dentro do grupo, em unidades de percentual vezes o número
 * de membros em divisão igual (`equalCount`) — assim a parte igual, `(100 − próprios) / equalCount`,
 * fica inteira. A soma dos pesos é `groupWeight` (`100 × equalCount`) quando há quem divida o resto.
 */
function memberWeights(members: readonly CommissionMember[]) {
  const equal = members.filter((member) => member.percent === null).length;
  const equalCount = BigInt(Math.max(equal, 1));
  const overrides = members.reduce((sum, member) => sum + toUnits(member.percent, PERCENT_SCALE), 0n);
  const rest = overrides < HUNDRED ? HUNDRED - overrides : 0n;
  const weights = members.map((member) =>
    member.percent === null ? rest : toUnits(member.percent, PERCENT_SCALE) * equalCount,
  );
  return { weights, equalCount, groupWeight: HUNDRED * equalCount };
}

/** Percentuais efetivos e valores em reais de cada grupo e membro, sobre o valor líquido. */
export function splitCommission(netValue: string | null, groups: readonly CommissionGroup[]): CommissionSplit {
  const groupPercents = groups.map((group) => toUnits(group.percent, PERCENT_SCALE));
  const percent = groupPercents.reduce((sum, units) => sum + units, 0n);
  // líquido em centavos × percentual em unidades: o total em centavos tem PERCENT_SCALE + 2 casas a mais
  const totalCents =
    netValue === null ? null : divRound(toUnits(netValue, MONEY_SCALE) * percent, HUNDRED);
  const groupCents = totalCents === null ? null : apportion(totalCents, groupPercents);

  let paidCents = 0n;
  const split = groups.map((group, index): CommissionGroupSplit => {
    const { weights, equalCount, groupWeight } = memberWeights(group.members);
    const cents = groupCents?.[index] ?? null;
    const assigned = weights.reduce((sum, weight) => sum + weight, 0n);
    // sem quem divida o resto, os membros levam só o que pediram: menos (ou mais) que o grupo
    const memberCents = cents === null ? null : apportion(divRound(cents * assigned, groupWeight), weights);
    paidCents += memberCents?.reduce((sum, value) => sum + value, 0n) ?? 0n;
    return {
      amount: cents === null ? null : toCanonical(cents, MONEY_SCALE),
      members: group.members.map((member, position) => ({
        percent: toCanonical(divRound(weights[position]!, equalCount), PERCENT_SCALE),
        // do grupo vezes a fração exata do membro (peso / peso do grupo), sem arredondar a parte igual antes
        salePercent: toCanonical(divRound(groupPercents[index]! * weights[position]!, groupWeight), PERCENT_SCALE),
        amount: memberCents === null ? null : toCanonical(memberCents[position]!, MONEY_SCALE),
        overridden: member.percent !== null,
      })),
    };
  });

  return {
    percent: toCanonical(percent, PERCENT_SCALE),
    total: totalCents === null ? null : toCanonical(totalCents, MONEY_SCALE),
    paid: totalCents === null ? null : toCanonical(paidCents, MONEY_SCALE),
    groups: split,
  };
}

/** Problemas da comissão, grupo a grupo; vazia é comissão válida. */
export function validateCommission(groups: readonly CommissionGroup[]): CommissionIssue[] {
  return groups.flatMap((group, index): CommissionIssue[] => {
    if (group.members.length === 0) return [{ code: 'empty_group', group: index }];
    const issues: CommissionIssue[] = [];
    const overridden = group.members.filter((member) => member.percent !== null);
    const sum = toCanonical(
      overridden.reduce((acc, member) => acc + toUnits(member.percent, PERCENT_SCALE), 0n),
      PERCENT_SCALE,
    );
    if (compareDecimal(sum, '100') > 0) issues.push({ code: 'overrides_exceed', group: index, sum });
    else if (overridden.length === group.members.length && compareDecimal(sum, '100') < 0)
      issues.push({ code: 'overrides_short', group: index, sum });

    const seen = new Map<string, number>();
    group.members.forEach(({ party }, position) => {
      const key = referrerKey(party);
      const firstMember = seen.get(key);
      if (firstMember === undefined) seen.set(key, position);
      else issues.push({ code: 'duplicate_member', group: index, member: position, firstMember, party });
    });
    return issues;
  });
}

/** Mensagem do problema, para a tela (junto ao grupo) e para a resposta da API. */
export function describeCommissionIssue(issue: CommissionIssue): string {
  switch (issue.code) {
    case 'overrides_exceed':
      return `Os percentuais próprios somam ${formatPercent(issue.sum)}, acima de 100% do grupo. Reduza-os até fechar 100%.`;
    case 'overrides_short':
      return `Os percentuais próprios somam ${formatPercent(issue.sum)} e não fecham 100% do grupo. Ajuste-os ou deixe um em branco para dividir o resto.`;
    case 'duplicate_member':
      return `${issue.party.name} já está neste grupo. Remova a linha repetida.`;
    case 'empty_group':
      return 'Grupo sem membros: ninguém recebe esta parte. Adicione um membro ou remova o grupo.';
  }
}
