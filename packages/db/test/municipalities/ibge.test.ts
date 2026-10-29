import { describe, expect, it } from 'vitest';
import { parseIbgeMunicipalities } from '../../src/municipalities/ibge.js';

const uf = (sigla: string, regiao: string) => ({ id: 52, sigla, nome: sigla, regiao: { id: 5, sigla: 'CO', nome: regiao } });

const item = (id: number, nome: string, microrregiao: unknown) => ({
  id,
  nome,
  microrregiao,
  'regiao-imediata': {
    id: 520001,
    nome: 'Rio Verde',
    'regiao-intermediaria': { id: 5201, nome: 'Rio Verde', UF: uf('GO', 'Centro-Oeste') },
  },
});

describe('leitura da resposta do IBGE', () => {
  it('tira a UF e a grande região pela região imediata', () => {
    expect(parseIbgeMunicipalities([item(5218805, 'Rio Verde', { UF: uf('XX', 'Sul') })])).toEqual([
      { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO', region: 'Centro-Oeste' },
    ]);
  });

  it('aceita microrregião nula', () => {
    expect(parseIbgeMunicipalities([item(5218805, 'Rio Verde', null)])[0]).toMatchObject({ uf: 'GO' });
  });

  it('ordena por código', () => {
    const codes = parseIbgeMunicipalities([item(5218805, 'B', null), item(5203500, 'A', null)]).map((m) => m.ibgeCode);

    expect(codes).toEqual(['5203500', '5218805']);
  });

  it('recusa município sem região imediata', () => {
    expect(() => parseIbgeMunicipalities([{ id: 5218805, nome: 'Rio Verde', 'regiao-imediata': null }])).toThrow(
      /regiao-imediata/,
    );
  });

  it('recusa resposta que não é lista', () => {
    expect(() => parseIbgeMunicipalities({})).toThrow();
  });
});
