// Guarda das migrations: toda migration precisa funcionar também com o código
// do release anterior, porque o rollback do deploy volta o código e nunca o
// banco. Comando que quebra o código anterior (apagar, renomear, mudar tipo,
// tornar obrigatório) só passa com a marcação `-- contração: <motivo>` no
// mesmo bloco — a decisão de contrair vira linha revisável no pull request.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_FOLDER } from '../src/migrate.js';
import { findUnreviewedContractions } from './support/migration-safety.js';

const migrationFiles = readdirSync(MIGRATIONS_FOLDER).filter((name) => name.endsWith('.sql'));

describe('migrations compatíveis com o release anterior', () => {
  it('encontra as migrations', () => {
    expect(migrationFiles.length).toBeGreaterThan(0);
  });

  it.each(migrationFiles)('%s não contrai o schema sem marcação', (name) => {
    expect(findUnreviewedContractions(readFileSync(join(MIGRATIONS_FOLDER, name), 'utf8'))).toEqual([]);
  });
});

describe('detecção de contração', () => {
  it.each([
    ['DROP TABLE "farms";', 'apaga tabela'],
    ['ALTER TABLE "farms" DROP COLUMN "area";', 'apaga coluna'],
    ['ALTER TABLE "farms" RENAME COLUMN "area" TO "area_ha";', 'renomeia'],
    ['ALTER TABLE "farms" RENAME TO "properties";', 'renomeia'],
    ['ALTER TABLE "farms" ALTER COLUMN "area" SET DATA TYPE numeric;', 'muda o tipo de coluna'],
    ['ALTER TABLE "farms" ALTER COLUMN "area" TYPE numeric USING area::numeric;', 'muda o tipo de coluna'],
    ['ALTER TABLE "farms" ALTER COLUMN "area" SET NOT NULL;', 'torna coluna obrigatória'],
    ['ALTER TABLE "farms" ADD COLUMN "area" numeric NOT NULL;', 'cria coluna obrigatória sem valor padrão'],
    ['TRUNCATE "farms";', 'esvazia tabela'],
    ['DELETE FROM "farms" WHERE true;', 'apaga linhas'],
    ['DROP TYPE "farm_status";', 'apaga tipo'],
  ])('acusa %s', (sql, problem) => {
    expect(findUnreviewedContractions(sql)).toEqual([{ problem, statement: sql }]);
  });

  it.each([
    'CREATE TABLE "farms" ("id" uuid PRIMARY KEY, "area" numeric NOT NULL);',
    'ALTER TABLE "farms" ADD COLUMN "notes" text;',
    'ALTER TABLE "farms" ADD COLUMN "blocked" boolean DEFAULT false NOT NULL;',
    'ALTER TABLE "farms" ADD COLUMN "id2" uuid NOT NULL DEFAULT gen_random_uuid();',
    'ALTER TABLE "farms" ALTER COLUMN "area" DROP NOT NULL;',
    'UPDATE "farms" SET "blocked" = NOT "active";',
    'DROP POLICY "tenant_isolation" ON "farms";',
    'DROP INDEX "farms_area_idx";',
    '-- DROP TABLE "farms" foi considerado e descartado\nSELECT 1;',
  ])('aceita %s', (sql) => {
    expect(findUnreviewedContractions(sql)).toEqual([]);
  });

  it('aceita a contração marcada no próprio bloco, com motivo', () => {
    const sql = [
      'ALTER TABLE "farms" ADD COLUMN "area_ha" numeric;',
      '--> statement-breakpoint',
      '-- contração: o release anterior já lê só area_ha (issue 123)',
      'ALTER TABLE "farms" DROP COLUMN "area";',
    ].join('\n');

    expect(findUnreviewedContractions(sql)).toEqual([]);
  });

  it('a marcação vale só para o bloco dela', () => {
    const sql = [
      '-- contração: o release anterior já lê só area_ha (issue 123)',
      'ALTER TABLE "farms" DROP COLUMN "area";',
      '--> statement-breakpoint',
      'ALTER TABLE "farms" DROP COLUMN "notes";',
    ].join('\n');

    expect(findUnreviewedContractions(sql)).toEqual([
      { problem: 'apaga coluna', statement: 'ALTER TABLE "farms" DROP COLUMN "notes";' },
    ]);
  });

  it('recusa marcação sem motivo', () => {
    const sql = '-- contração:\nALTER TABLE "farms" DROP COLUMN "area";';

    expect(findUnreviewedContractions(sql)).toHaveLength(1);
  });
});
