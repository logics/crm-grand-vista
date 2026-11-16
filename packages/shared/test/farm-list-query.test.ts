import { describe, expect, it } from 'vitest';
import {
  FARM_NO_PRICE_WITH_PRICE_MESSAGE,
  farmListQuerySchema,
  farmOptionsQuerySchema,
  farmPriceSummary,
  type Farm,
} from '../src/index.js';

const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';

describe('farmListQuerySchema', () => {
  it('lista de ids vira conjunto sem repetição', () => {
    const query = farmListQuerySchema.parse({ aptitudeId: `${ID_A},${ID_B},${ID_A}` });
    expect(query.aptitudeId).toEqual([ID_A, ID_B]);
  });

  it('região aceita código IBGE e UF na mesma lista', () => {
    expect(farmListQuerySchema.parse({ region: '5208707,MG' }).region).toEqual(['5208707', 'MG']);
  });

  it('região com token que não é IBGE nem UF é recusada', () => {
    expect(farmListQuerySchema.safeParse({ region: 'XX' }).success).toBe(false);
    expect(farmListQuerySchema.safeParse({ region: '123' }).success).toBe(false);
    expect(farmListQuerySchema.safeParse({ region: 'GO,' }).success).toBe(false);
  });

  it('uuid malformado, nível e situação documental inválidos são recusados', () => {
    expect(farmListQuerySchema.safeParse({ tradingPostId: 'abc' }).success).toBe(false);
    expect(farmListQuerySchema.safeParse({ priority: 'huge' }).success).toBe(false);
    expect(farmListQuerySchema.safeParse({ documentStatus: 'ok' }).success).toBe(false);
    expect(farmListQuerySchema.parse({ salesPotential: 'high,low', documentStatus: 'regular' })).toMatchObject({
      salesPotential: ['high', 'low'],
      documentStatus: ['regular'],
    });
  });

  it('decimais de área, valor e distância ficam como texto; vírgula e negativo são recusados', () => {
    expect(farmListQuerySchema.parse({ areaMin: '500', priceMax: '50000000.50', maxDistanceToWarehouseKm: '20' })).toMatchObject({
      areaMin: '500',
      priceMax: '50000000.50',
      maxDistanceToWarehouseKm: '20',
    });
    expect(farmListQuerySchema.safeParse({ areaMin: '1,5' }).success).toBe(false);
    expect(farmListQuerySchema.safeParse({ priceMin: '-1' }).success).toBe(false);
    expect(farmListQuerySchema.safeParse({ areaMax: '0' }).success).toBe(false);
    expect(farmListQuerySchema.safeParse({ maxDistanceToHighwayKm: '-2' }).success).toBe(false);
    expect(farmListQuerySchema.parse({ maxDistanceToHighwayKm: '0' }).maxDistanceToHighwayKm).toBe('0');
  });

  it('proprietário é um uuid só', () => {
    expect(farmListQuerySchema.parse({ ownerContactId: ID_A }).ownerContactId).toBe(ID_A);
    expect(farmListQuerySchema.safeParse({ ownerContactId: `${ID_A},${ID_B}` }).success).toBe(false);
  });

  it('ordena por preço', () => {
    expect(farmListQuerySchema.parse({ sort: '-askingPrice' }).sort).toBe('-askingPrice');
  });

  it('"sem preço" com valor mínimo ou máximo é recusado no campo noPrice', () => {
    for (const price of [{ priceMin: '10' }, { priceMax: '10' }]) {
      const result = farmListQuerySchema.safeParse({ noPrice: 'true', ...price });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]).toMatchObject({ path: ['noPrice'], message: FARM_NO_PRICE_WITH_PRICE_MESSAGE });
      }
    }
    expect(farmListQuerySchema.parse({ noPrice: 'true' }).noPrice).toBe(true);
    expect(farmListQuerySchema.safeParse({ noPrice: 'false' }).success).toBe(false);
  });
});

describe('farmOptionsQuerySchema', () => {
  it('limite padrão 20, máximo 50, ids em lista', () => {
    expect(farmOptionsQuerySchema.parse({}).limit).toBe(20);
    expect(farmOptionsQuerySchema.safeParse({ limit: '51' }).success).toBe(false);
    expect(farmOptionsQuerySchema.parse({ ids: `${ID_A},${ID_B}` }).ids).toEqual([ID_A, ID_B]);
    expect(farmOptionsQuerySchema.safeParse({ ids: 'x' }).success).toBe(false);
    expect(farmOptionsQuerySchema.safeParse({ cursor: 'abc' }).success).toBe(false);
  });
});

describe('farmPriceSummary', () => {
  const base = { pricingMode: null, askingPrice: null, valuationBags: null, valuationBagsUnit: null, valuationBagsAlqueireType: null, valuationCrop: null };

  it('em reais mostra o valor', () => {
    expect(farmPriceSummary({ ...base, pricingMode: 'brl', askingPrice: '12000000.00' } as Farm)).toBe('R$ 12.000.000,00');
  });

  it('em sacas mostra a avaliação com a unidade e a cultura', () => {
    expect(
      farmPriceSummary({ ...base, pricingMode: 'bags', valuationBags: '85', valuationBagsUnit: 'per_hectare', valuationCrop: { id: ID_A, name: 'Soja' } } as Farm),
    ).toBe('85 sacas por hectare · Soja');
  });

  it('sem preço diz "Preço não informado"', () => {
    expect(farmPriceSummary(base as Farm)).toBe('Preço não informado');
  });
});
