// `referral_links` no banco real, como `crm_app` com empresa ativa: as garantias
// que o schema dá sozinho, sem o serviço (spec fase-1-cadeia-de-indicacao,
// critérios 4 e 8).
import { loadApiEnv } from '@crm/shared/env';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTenant, createUser } from './support/fixtures.js';
import { createDatabase, type Transaction } from '../src/database.js';
import { createPool } from '../src/pool.js';
import { commercialStatuses, contacts, farms, memberships, referralLinks } from '../src/schema/index.js';

const CHECK_VIOLATION = '23514';
const UNIQUE_VIOLATION = '23505';

type NewLink = Omit<typeof referralLinks.$inferInsert, 'tenantId'>;

describe('referral_links no banco', () => {
  const pool = createPool(loadApiEnv().DATABASE_URL);
  const db = createDatabase(pool);

  let tenantId: string;
  let userId: string;
  let statusId: string;
  // Sujeitos e indicadores gravados de verdade (committed) uma vez; os testes de CHECK
  // inserem elos entre eles e desfazem a transação.
  let subject: string;
  let a: string;
  let b: string;
  let farmId: string;

  const insertContact = async (tx: Transaction, name: string) => {
    const [row] = await tx.insert(contacts).values({ tenantId, personType: 'pf', name }).returning();
    return row!.id;
  };
  const insertFarm = async (tx: Transaction, name: string) => {
    const [row] = await tx
      .insert(farms)
      .values({
        tenantId,
        name,
        municipalityIbgeCode: '5218805',
        responsibleUserId: userId,
        commercialStatusId: statusId,
        totalAreaHa: '100',
      })
      .returning();
    return row!.id;
  };
  const insertLink = (tx: Transaction, row: NewLink) => tx.insert(referralLinks).values({ tenantId, ...row });

  /** Roda `fn` numa transação da empresa e a desfaz sempre; devolve o erro lançado, ou `undefined`. */
  const rolledBack = async (fn: (tx: Transaction) => Promise<unknown>): Promise<unknown> => {
    const rollback = new Error('rollback');
    try {
      await db.withTenant(tenantId, async (tx) => {
        await fn(tx);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) return error;
    }
    return undefined;
  };

  const rejects = async (row: NewLink, code: string, constraint: string) => {
    const error = await rolledBack((tx) => insertLink(tx, row));
    expect(error).toMatchObject({ cause: { code, constraint } });
  };

  beforeAll(async () => {
    tenantId = await createTenant(db, 'referral-links');
    userId = await createUser(db, 'Indicador interno');
    await db.semTenant({ reason: 'cli' }, (tx) => tx.insert(memberships).values({ userId, tenantId, isDefault: false }));
    await db.withTenant(tenantId, async (tx) => {
      const [status] = await tx
        .insert(commercialStatuses)
        .values({ tenantId, name: 'Disponível', systemMeaning: 'available' })
        .returning();
      statusId = status!.id;
      subject = await insertContact(tx, 'Pedro');
      a = await insertContact(tx, 'João');
      b = await insertContact(tx, 'Sebastião');
      farmId = await insertFarm(tx, 'Fazenda Três Barras');
    });
  });

  afterAll(() => pool.end());

  describe('CHECKs de polimorfismo, posição, nota e auto-indicação (8)', () => {
    it('recusa dois sujeitos', async () => {
      await rejects(
        { subjectContactId: subject, subjectFarmId: farmId, referrerContactId: a, position: 1 },
        CHECK_VIOLATION,
        'referral_links_one_subject_check',
      );
    });

    it('recusa nenhum sujeito', async () => {
      await rejects({ referrerContactId: a, position: 1 }, CHECK_VIOLATION, 'referral_links_one_subject_check');
    });

    it('recusa dois indicadores', async () => {
      await rejects(
        { subjectContactId: subject, referrerContactId: a, referrerUserId: userId, position: 1 },
        CHECK_VIOLATION,
        'referral_links_one_referrer_check',
      );
    });

    it('recusa nenhum indicador', async () => {
      await rejects({ subjectContactId: subject, position: 1 }, CHECK_VIOLATION, 'referral_links_one_referrer_check');
    });

    it.each([0, 11])('recusa a posição %i', async (position) => {
      await rejects(
        { subjectContactId: subject, referrerContactId: a, position },
        CHECK_VIOLATION,
        'referral_links_position_check',
      );
    });

    it('recusa o contato na própria cadeia', async () => {
      await rejects(
        { subjectContactId: subject, referrerContactId: subject, position: 1 },
        CHECK_VIOLATION,
        'referral_links_not_self_check',
      );
    });

    it('recusa nota de 501 caracteres e aceita 500', async () => {
      await rejects(
        { subjectContactId: subject, referrerContactId: a, position: 1, notes: 'x'.repeat(501) },
        CHECK_VIOLATION,
        'referral_links_notes_check',
      );
      const error = await rolledBack((tx) =>
        insertLink(tx, { subjectContactId: subject, referrerContactId: a, position: 1, notes: 'x'.repeat(500) }),
      );
      expect(error).toBeUndefined();
    });
  });

  describe('indicador único por sujeito (8)', () => {
    it.each([
      ['contato indicado por contato', 'contact', 'contact', 'referral_links_subject_contact_id_referrer_contact_id_unique'],
      ['contato indicado por usuário', 'contact', 'user', 'referral_links_subject_contact_id_referrer_user_id_unique'],
      ['fazenda indicada por contato', 'farm', 'contact', 'referral_links_subject_farm_id_referrer_contact_id_unique'],
      ['fazenda indicada por usuário', 'farm', 'user', 'referral_links_subject_farm_id_referrer_user_id_unique'],
    ] as const)('recusa o mesmo indicador duas vezes: %s', async (_name, subjectKind, referrerKind, constraint) => {
      const link = (position: number): NewLink => ({
        ...(subjectKind === 'contact' ? { subjectContactId: subject } : { subjectFarmId: farmId }),
        ...(referrerKind === 'contact' ? { referrerContactId: a } : { referrerUserId: userId }),
        position,
      });
      const error = await rolledBack(async (tx) => {
        await insertLink(tx, link(1));
        await insertLink(tx, link(2));
      });
      expect(error).toMatchObject({ cause: { code: UNIQUE_VIOLATION, constraint } });
    });
  });

  it('uma linha de fazenda e uma de contato com a mesma posição não colidem', async () => {
    const error = await rolledBack(async (tx) => {
      await insertLink(tx, { subjectContactId: subject, referrerContactId: a, position: 1 });
      await insertLink(tx, { subjectFarmId: farmId, referrerContactId: a, position: 1 });
      await tx.execute(sql`set constraints all immediate`);
    });
    expect(error).toBeUndefined();
  });

  describe.each([
    ['contato', 'subject_contact'],
    ['fazenda', 'subject_farm'],
  ] as const)('posição única adiável, sujeito %s (4)', (kind, constraintPart) => {
    const newSubject = (tx: Transaction) => (kind === 'contato' ? insertContact(tx, 'Sujeito') : insertFarm(tx, 'Sujeito'));
    const ref = (subjectId: string): Pick<NewLink, 'subjectContactId' | 'subjectFarmId'> =>
      kind === 'contato' ? { subjectContactId: subjectId } : { subjectFarmId: subjectId };

    it('trocar dois elos, uma linha por vez, passa no COMMIT', async () => {
      const { subjectId, first, second } = await db.withTenant(tenantId, async (tx) => {
        const subjectId = await newSubject(tx);
        await insertLink(tx, { ...ref(subjectId), referrerContactId: a, position: 1 });
        await insertLink(tx, { ...ref(subjectId), referrerContactId: b, position: 2 });
        return { subjectId, first: a, second: b };
      });

      // Numa só transação: o 1º UPDATE deixa duas linhas na posição 2, o 2º desfaz.
      await db.withTenant(tenantId, async (tx) => {
        await tx
          .update(referralLinks)
          .set({ position: 2 })
          .where(sql`referrer_contact_id = ${first} and ${sql.raw(constraintPart + '_id')} = ${subjectId}`);
        await tx
          .update(referralLinks)
          .set({ position: 1 })
          .where(sql`referrer_contact_id = ${second} and ${sql.raw(constraintPart + '_id')} = ${subjectId}`);
      });

      const { rows } = await db.withTenant(tenantId, (tx) =>
        tx.execute<{ referrer_contact_id: string }>(
          sql`select referrer_contact_id from referral_links where ${sql.raw(constraintPart + '_id')} = ${subjectId} order by position`,
        ),
      );
      expect(rows.map((row) => row.referrer_contact_id)).toEqual([b, a]);
    });

    it(`duas linhas na mesma posição no COMMIT são recusadas em referral_links_${constraintPart}_position_unique`, async () => {
      const subjectId = await db.withTenant(tenantId, async (tx) => {
        const id = await newSubject(tx);
        await insertLink(tx, { ...ref(id), referrerContactId: a, position: 1 });
        await insertLink(tx, { ...ref(id), referrerContactId: b, position: 2 });
        return id;
      });

      const error = await db
        .withTenant(tenantId, async (tx) => {
          await tx
            .update(referralLinks)
            .set({ position: 2 })
            .where(sql`referrer_contact_id = ${a} and ${sql.raw(constraintPart + '_id')} = ${subjectId}`);
        })
        .catch((e: unknown) => e);

      expect(error).toMatchObject({
        cause: { code: UNIQUE_VIOLATION, constraint: `referral_links_${constraintPart}_position_unique` },
      });
    });
  });

  it('as duas restrições de posição são DEFERRABLE INITIALLY DEFERRED (guarda contra regeneração do Drizzle)', async () => {
    const { rows } = await pool.query(
      `select conname, condeferrable, condeferred from pg_constraint
        where conrelid = 'referral_links'::regclass and conname like '%_position_unique' order by conname`,
    );
    expect(rows).toEqual([
      { conname: 'referral_links_subject_contact_position_unique', condeferrable: true, condeferred: true },
      { conname: 'referral_links_subject_farm_position_unique', condeferrable: true, condeferred: true },
    ]);
  });
});
