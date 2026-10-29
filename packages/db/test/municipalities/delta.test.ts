import { describe, expect, it } from 'vitest';
import { buildMunicipalitiesDelta } from '../../src/municipalities/delta.js';
import type { MunicipalityRecord } from '../../src/municipalities/types.js';

const rioVerde: MunicipalityRecord = { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO', region: 'Centro-Oeste' };
const bomJesus: MunicipalityRecord = { ibgeCode: '5203500', name: 'Bom Jesus de Goiás', uf: 'GO', region: 'Centro-Oeste' };

describe('delta de municípios', () => {
  it('não produz nada quando não há diferença', () => {
    expect(buildMunicipalitiesDelta([rioVerde, bomJesus], [rioVerde, bomJesus])).toBeNull();
  });

  it('carga inicial: INSERT de todos, sem DELETE', () => {
    const sql = buildMunicipalitiesDelta([], [rioVerde, bomJesus])!;

    expect(sql).toContain(`INSERT INTO "municipalities"`);
    expect(sql).toContain(`('5218805', 'Rio Verde', 'GO', 'Centro-Oeste')`);
    expect(sql).toContain(`('5203500', 'Bom Jesus de Goiás', 'GO', 'Centro-Oeste')`);
    expect(sql).not.toMatch(/DELETE/i);
  });

  it('município novo vira INSERT apenas dele', () => {
    const sql = buildMunicipalitiesDelta([rioVerde], [rioVerde, bomJesus])!;

    expect(sql).toContain(`'5203500'`);
    expect(sql).not.toContain(`'5218805'`);
  });

  it('nome alterado vira UPDATE', () => {
    const sql = buildMunicipalitiesDelta([rioVerde], [{ ...rioVerde, name: 'Rio Verde Novo' }])!;

    expect(sql).toContain(`UPDATE "municipalities" SET "name" = 'Rio Verde Novo'`);
    expect(sql).toContain(`WHERE "ibge_code" = '5218805'`);
    expect(sql).not.toContain('INSERT');
  });

  it('UF alterada vira UPDATE com a região nova', () => {
    const moved = { ...rioVerde, uf: 'MT', region: 'Centro-Oeste' };

    expect(buildMunicipalitiesDelta([rioVerde], [moved])!).toContain(`"uf" = 'MT'`);
  });

  it('município que sumiu da lista fica inativo, nunca é apagado', () => {
    const sql = buildMunicipalitiesDelta([rioVerde, bomJesus], [rioVerde])!;

    expect(sql).toContain(`UPDATE "municipalities" SET "active" = false WHERE "ibge_code" IN ('5203500')`);
    expect(sql).not.toMatch(/DELETE|INSERT/i);
  });

  it('escapa aspas no nome', () => {
    const sql = buildMunicipalitiesDelta([], [{ ...rioVerde, name: "Olho d'Água" }])!;

    expect(sql).toContain(`'Olho d''Água'`);
  });

  it('o INSERT reativa município que voltou à lista', () => {
    expect(buildMunicipalitiesDelta([], [rioVerde])!).toContain(`ON CONFLICT ("ibge_code") DO UPDATE`);
  });
});
