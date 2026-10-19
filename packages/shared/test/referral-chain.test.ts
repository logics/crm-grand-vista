import { describe, expect, it } from 'vitest';
import {
  type ReferralLink,
  type ReferralSubject,
  type Referrer,
  appendReferralLink,
  assembleReferralChain,
  describeReferralChainIssue,
  isEligibleReferrer,
  referrerKey,
  removeReferralLink,
  reorderReferralChain,
  validateReferralChain,
} from '../src/referral-chain.js';

const pedro: ReferralSubject = { kind: 'contact', id: 'c-pedro', name: 'Pedro Almeida' };
const farm: ReferralSubject = { kind: 'farm', id: 'c-pedro', name: 'Fazenda Três Barras' };

const joao: Referrer = { kind: 'contact', id: 'c-joao', name: 'João Batista' };
const sebastiao: Referrer = { kind: 'contact', id: 'c-sebastiao', name: 'Sebastião Ferreira' };
const carlos: Referrer = { kind: 'user', id: 'u-carlos', name: 'Carlos Menezes' };
/** Usuário com o mesmo id de um contato: tipos diferentes não se confundem. */
const carlosContact: Referrer = { kind: 'contact', id: 'u-carlos', name: 'Carlos Menezes' };

const link = (referrer: Referrer, position: number, notes: string | null = null): ReferralLink => ({
  referrer,
  position,
  notes,
});

const names = (links: ReferralLink[]) => links.map((entry) => `${entry.position}:${entry.referrer.name}`);

describe('referrerKey', () => {
  it('distingue usuário e contato de mesmo id', () => {
    expect(referrerKey(carlos)).not.toBe(referrerKey(carlosContact));
  });
});

describe('assembleReferralChain', () => {
  it('ordena pela posição e renumera de 1 em diante', () => {
    const chain = assembleReferralChain([link(sebastiao, 7), link(joao, 3)]);

    expect(names(chain)).toEqual(['1:João Batista', '2:Sebastião Ferreira']);
  });

  it('mantém a ordem de chegada entre posições empatadas', () => {
    const chain = assembleReferralChain([link(joao, 1), link(sebastiao, 1), link(carlos, 1)]);

    expect(names(chain)).toEqual(['1:João Batista', '2:Sebastião Ferreira', '3:Carlos Menezes']);
  });

  it('preserva a nota e não altera a lista recebida', () => {
    const input = [link(joao, 2, 'Vizinho de cerca')];
    const chain = assembleReferralChain(input);

    expect(chain[0]).toEqual(link(joao, 1, 'Vizinho de cerca'));
    expect(input[0]!.position).toBe(2);
  });

  it('devolve vazia para cadeia vazia', () => {
    expect(assembleReferralChain([])).toEqual([]);
  });
});

describe('validateReferralChain', () => {
  it('aceita cadeia sem repetição', () => {
    expect(validateReferralChain(pedro, [link(joao, 1), link(sebastiao, 2), link(carlos, 3)])).toEqual([]);
  });

  it('acusa o indicador que aparece duas vezes, apontando a primeira posição', () => {
    const issues = validateReferralChain(pedro, [link(joao, 1), link(sebastiao, 2), link(joao, 3)]);

    expect(issues).toEqual([{ code: 'duplicate', position: 3, firstPosition: 1, referrer: joao }]);
  });

  it('acusa ciclo quando o próprio sujeito entra na cadeia', () => {
    const self: Referrer = { kind: 'contact', id: pedro.id, name: pedro.name };
    const issues = validateReferralChain(pedro, [link(joao, 1), link(self, 2)]);

    expect(issues).toEqual([{ code: 'cycle', position: 2, referrer: self }]);
  });

  it('não confunde a fazenda com um contato de mesmo id', () => {
    const contact: Referrer = { kind: 'contact', id: farm.id, name: 'Pedro Almeida' };

    expect(validateReferralChain(farm, [link(contact, 1)])).toEqual([]);
  });

  it('não confunde usuário e contato de mesmo id', () => {
    expect(validateReferralChain(pedro, [link(carlos, 1), link(carlosContact, 2)])).toEqual([]);
  });

  it('valida na ordem das posições, não na ordem de chegada', () => {
    const issues = validateReferralChain(pedro, [link(joao, 5), link(joao, 2)]);

    expect(issues).toEqual([{ code: 'duplicate', position: 2, firstPosition: 1, referrer: joao }]);
  });

  it('acusa cada repetição de um indicador que aparece três vezes', () => {
    const issues = validateReferralChain(pedro, [link(joao, 1), link(joao, 2), link(joao, 3)]);

    expect(issues.map((issue) => issue.position)).toEqual([2, 3]);
  });
});

describe('describeReferralChainIssue', () => {
  it('nomeia o indicador repetido e a primeira posição', () => {
    expect(describeReferralChainIssue({ code: 'duplicate', position: 3, firstPosition: 1, referrer: joao })).toBe(
      'João Batista já está na cadeia, na posição 1.',
    );
  });

  it('explica que o indicado não indica a si mesmo', () => {
    expect(describeReferralChainIssue({ code: 'cycle', position: 2, referrer: joao })).toBe(
      'João Batista é quem foi indicado e não pode entrar na própria cadeia.',
    );
  });
});

describe('isEligibleReferrer', () => {
  const chain = [link(joao, 1)];

  it('aceita quem ainda não está na cadeia', () => {
    expect(isEligibleReferrer(pedro, chain, sebastiao)).toBe(true);
  });

  it('recusa quem já está na cadeia', () => {
    expect(isEligibleReferrer(pedro, chain, joao)).toBe(false);
  });

  it('recusa o próprio sujeito', () => {
    expect(isEligibleReferrer(pedro, chain, { kind: 'contact', id: pedro.id, name: pedro.name })).toBe(false);
  });
});

describe('edição da cadeia', () => {
  const chain = [link(joao, 1, 'Vizinho'), link(sebastiao, 2)];

  it('acrescenta o elo ao fim, na posição seguinte, sem nota', () => {
    expect(appendReferralLink(chain, carlos).at(-1)).toEqual(link(carlos, 3));
  });

  it('remove o elo e renumera os que vêm depois', () => {
    const next = removeReferralLink([...chain, link(carlos, 3)], 1);

    expect(names(next)).toEqual(['1:Sebastião Ferreira', '2:Carlos Menezes']);
  });

  it('remove só o elo da posição quando o indicador está repetido', () => {
    const next = removeReferralLink([link(joao, 1), link(sebastiao, 2), link(joao, 3, 'Repetido')], 3);

    expect(next).toEqual([link(joao, 1), link(sebastiao, 2)]);
  });

  it('reordena pelas posições atuais e deriva a posição da nova ordem', () => {
    const next = reorderReferralChain([...chain, link(carlos, 3)], [3, 1, 2]);

    expect(names(next)).toEqual(['1:Carlos Menezes', '2:João Batista', '3:Sebastião Ferreira']);
    expect(next[1]!.notes).toBe('Vizinho');
  });

  it('mantém ao fim, na ordem atual, os elos que a nova ordem não cita', () => {
    const next = reorderReferralChain([...chain, link(carlos, 3)], [3]);

    expect(names(next)).toEqual(['1:Carlos Menezes', '2:João Batista', '3:Sebastião Ferreira']);
  });
});
