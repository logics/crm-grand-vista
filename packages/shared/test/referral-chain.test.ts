import { describe, expect, it } from 'vitest';
import {
  MAX_REFERRAL_CHAIN_LENGTH,
  REFERRAL_CHAIN_LIMIT_REACHED_MESSAGE,
  REFERRAL_CHAIN_TOO_LONG_MESSAGE,
  REFERRAL_NOTES_MAX_LENGTH,
  REFERRER_UNLINKED_LABEL,
  referralChainInputOf,
  referralChainInputSchema,
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

const uuidOf = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const contactItem = (n: number) => ({ referrer: { kind: 'contact' as const, id: uuidOf(n) } });

describe('referralChainInputSchema', () => {
  it('aceita 10 indicadores e recusa 11 com a mensagem do limite', () => {
    expect(MAX_REFERRAL_CHAIN_LENGTH).toBe(10);
    const ten = Array.from({ length: 10 }, (_, i) => contactItem(i + 1));
    expect(referralChainInputSchema.safeParse(ten).success).toBe(true);
    const eleven = referralChainInputSchema.safeParse([...ten, contactItem(11)]);
    expect(eleven.success).toBe(false);
    expect(eleven.error?.issues[0]?.message).toBe(REFERRAL_CHAIN_TOO_LONG_MESSAGE);
    expect(REFERRAL_CHAIN_TOO_LONG_MESSAGE).toBe('A cadeia de indicação aceita até 10 indicadores.');
  });

  it('aceita nota de 500 caracteres e recusa 501', () => {
    expect(REFERRAL_NOTES_MAX_LENGTH).toBe(500);
    const withNotes = (notes: string) => [{ ...contactItem(1), notes }];
    expect(referralChainInputSchema.safeParse(withNotes('a'.repeat(500))).success).toBe(true);
    expect(referralChainInputSchema.safeParse(withNotes('a'.repeat(501))).success).toBe(false);
  });

  it('nota vazia ou ausente vira null', () => {
    const [blank, none, kept] = referralChainInputSchema.parse([
      { ...contactItem(1), notes: '   ' },
      contactItem(2),
      { ...contactItem(3), notes: ' via fulano ' },
    ]);
    expect(blank?.notes).toBeNull();
    expect(none?.notes).toBeNull();
    expect(kept?.notes).toBe('via fulano');
  });

  it('descarta a posição enviada e chaves desconhecidas', () => {
    const [item] = referralChainInputSchema.parse([{ ...contactItem(1), position: 9, name: 'x' }]);
    expect(item).toEqual({ referrer: { kind: 'contact', id: uuidOf(1) }, notes: null });
  });

  it('recusa indicador de tipo ou id inválido', () => {
    expect(referralChainInputSchema.safeParse([{ referrer: { kind: 'farm', id: uuidOf(1) } }]).success).toBe(false);
    expect(referralChainInputSchema.safeParse([{ referrer: { kind: 'user', id: 'não-uuid' } }]).success).toBe(false);
  });
});

describe('referralChainInputOf', () => {
  it('sai na ordem da posição, sem position nem name', () => {
    const links: ReferralLink[] = [
      { referrer: sebastiao, position: 2, notes: null },
      { referrer: joao, position: 1, notes: 'trouxe direto' },
    ];
    expect(referralChainInputOf(links)).toEqual([
      { referrer: { kind: 'contact', id: 'c-joao' }, notes: 'trouxe direto' },
      { referrer: { kind: 'contact', id: 'c-sebastiao' }, notes: null },
    ]);
  });
});

describe('limite e vínculo do indicador', () => {
  it('a mensagem de limite cita MAX_REFERRAL_CHAIN_LENGTH', () => {
    expect(REFERRAL_CHAIN_LIMIT_REACHED_MESSAGE).toBe(`Limite de ${MAX_REFERRAL_CHAIN_LENGTH} indicadores atingido.`);
  });

  it('o rótulo de quem perdeu o vínculo é "Sem acesso"', () => {
    expect(REFERRER_UNLINKED_LABEL).toBe('Sem acesso');
  });

  it('referralChainInputOf não leva linked', () => {
    const unlinked: Referrer = { ...carlos, linked: false };
    expect(referralChainInputOf([link(unlinked, 1)])).toEqual([{ referrer: { kind: 'user', id: 'u-carlos' }, notes: null }]);
  });
});
