// Cadeia de indicação (`referral_links`) de um sujeito (contato ou fazenda):
// leitura, substituição pela diferença e exclusão. Sem rota própria: quem a
// grava é o módulo do sujeito, dentro da transação e do `change_id` do save dele.
// A regra de validade (duplicado, ciclo) é a de `@crm/shared`, a mesma do front.
import {
  referralLinks,
  contacts,
  farms,
  memberships,
  users,
  type AuditActor,
  type AuditedWrites,
  type Transaction,
} from '@crm/db';
import {
  REFERRAL_CONTACT_UNKNOWN_MESSAGE,
  REFERRAL_USER_NOT_IN_TEAM_MESSAGE,
  describeReferralChainIssue,
  referrerKey,
  validateReferralChain,
  type ReferralChainInput,
  type ReferralChainOutput,
  type ReferralLink,
  type ReferralSubject,
} from '@crm/shared';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { ensureContactRole } from '../../contact-roles/ensure.js';

/** Quem é indicado: o tipo (contato ou fazenda) e o id. */
export type ReferralSubjectRef = Pick<ReferralSubject, 'kind' | 'id'>;

/** Por tipo de sujeito: a tabela, o id dela, a coluna do elo que a referencia e o trecho do insert que a preenche. */
const SUBJECTS = {
  contact: {
    table: contacts,
    id: contacts.id,
    link: referralLinks.subjectContactId,
    subjectValues: (id: string) => ({ subjectContactId: id }),
  },
  farm: {
    table: farms,
    id: farms.id,
    link: referralLinks.subjectFarmId,
    subjectValues: (id: string) => ({ subjectFarmId: id }),
  },
} as const;

/** A coluna de `referral_links` que guarda o sujeito, conforme o tipo. */
const subjectColumn = (subject: ReferralSubjectRef) => SUBJECTS[subject.kind].link;

/**
 * Recusa de regra da cadeia (400 no item). É **lançada**, e não devolvida: o
 * `PATCH` já gravou os campos do sujeito antes da cadeia, e só o rollback da
 * transação desfaz isso.
 */
export class ReferralChainRejection extends Error {
  constructor(
    message: string,
    readonly position?: number,
  ) {
    super(message);
    this.name = 'ReferralChainRejection';
  }
}

/** A cadeia do sujeito, na ordem das posições, com nomes; `[]` sem cadeia. Nunca lê `is_super_admin`. */
export async function readReferralChain(
  tx: Transaction,
  tenantId: string,
  subject: ReferralSubjectRef,
): Promise<ReferralChainOutput> {
  const rows = await tx
    .select({
      id: referralLinks.id,
      position: referralLinks.position,
      notes: referralLinks.notes,
      userId: referralLinks.referrerUserId,
      userName: users.name,
      contactId: referralLinks.referrerContactId,
      contactName: contacts.name,
      linked: sql<boolean>`exists (select 1 from ${memberships} where ${memberships.userId} = ${referralLinks.referrerUserId} and ${memberships.tenantId} = ${tenantId})`,
    })
    .from(referralLinks)
    .leftJoin(users, eq(users.id, referralLinks.referrerUserId))
    .leftJoin(contacts, eq(contacts.id, referralLinks.referrerContactId))
    .where(eq(subjectColumn(subject), subject.id))
    .orderBy(asc(referralLinks.position));
  return rows.map((row) => ({
    id: row.id,
    position: row.position,
    referrer: row.userId
      ? { kind: 'user' as const, id: row.userId, name: row.userName ?? '', linked: row.linked }
      : { kind: 'contact' as const, id: row.contactId!, name: row.contactName ?? '' },
    notes: row.notes,
  }));
}

type Entering = ReferralChainInput[number]['referrer'];

/** Quem entra tem de existir na empresa: contato sob o RLS; usuário com vínculo e sem a flag de super admin. */
async function assertEntering(tx: Transaction, tenantId: string, input: ReferralChainInput, entering: Set<string>) {
  const wanted = (kind: Entering['kind']) =>
    input.flatMap((item, index) =>
      item.referrer.kind === kind && entering.has(referrerKey(item.referrer))
        ? [{ id: item.referrer.id, position: index + 1 }]
        : [],
    );

  const contactIds = wanted('contact');
  if (contactIds.length > 0) {
    const found = new Set(
      (
        await tx
          .select({ id: contacts.id })
          .from(contacts)
          .where(
            inArray(
              contacts.id,
              contactIds.map((c) => c.id),
            ),
          )
      ).map((row) => row.id),
    );
    const missing = contactIds.find((c) => !found.has(c.id));
    if (missing) throw new ReferralChainRejection(REFERRAL_CONTACT_UNKNOWN_MESSAGE, missing.position);
  }

  const userIds = wanted('user');
  if (userIds.length > 0) {
    const found = new Set(
      (
        await tx
          .select({ id: users.id })
          .from(users)
          .innerJoin(memberships, and(eq(memberships.userId, users.id), eq(memberships.tenantId, tenantId)))
          .where(
            and(
              inArray(
                users.id,
                userIds.map((u) => u.id),
              ),
              eq(users.isSuperAdmin, false),
            ),
          )
      ).map((row) => row.id),
    );
    const missing = userIds.find((u) => !found.has(u.id));
    if (missing) throw new ReferralChainRejection(REFERRAL_USER_NOT_IN_TEAM_MESSAGE, missing.position);
  }
}

/** Nome de cada indicador da lista, para as mensagens da regra pura. */
async function namesOf(tx: Transaction, input: ReferralChainInput): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const ids = (kind: Entering['kind']) => input.filter((item) => item.referrer.kind === kind).map((item) => item.referrer.id);
  const contactIds = ids('contact');
  const userIds = ids('user');
  if (contactIds.length > 0) {
    for (const row of await tx
      .select({ id: contacts.id, name: contacts.name })
      .from(contacts)
      .where(inArray(contacts.id, contactIds))) {
      names.set(referrerKey({ kind: 'contact', id: row.id }), row.name);
    }
  }
  if (userIds.length > 0) {
    for (const row of await tx.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds))) {
      names.set(referrerKey({ kind: 'user', id: row.id }), row.name);
    }
  }
  return names;
}

/**
 * Substitui a cadeia do sujeito pela lista (a ordem é a posição), gravando só a
 * diferença, pela identidade do indicador: quem saiu é excluído, quem ficou muda
 * de posição ou nota **mantendo o `id`**, quem entrou é inserido. Inverter dois
 * elos vira duas alterações de posição — a restrição de posição é adiável, então
 * não há valor temporário. Recusa (`ReferralChainRejection`) antes de qualquer escrita da cadeia.
 */
export async function replaceReferralChain(
  tx: Transaction,
  writes: AuditedWrites,
  actor: AuditActor,
  subject: ReferralSubject,
  input: ReferralChainInput,
): Promise<void> {
  const tenantId = actor.tenantId!;
  // Serializa dois saves do mesmo sujeito: o segundo lê a cadeia que o primeiro deixou.
  const own = SUBJECTS[subject.kind];
  await tx.execute(sql`select ${own.id} from ${own.table} where ${own.id} = ${subject.id} for update`);
  const current = await tx
    .select()
    .from(referralLinks)
    .where(eq(subjectColumn(subject), subject.id));
  const currentByKey = new Map(
    current.map((row) => [
      referrerKey(
        row.referrerUserId ? { kind: 'user', id: row.referrerUserId } : { kind: 'contact', id: row.referrerContactId! },
      ),
      row,
    ]),
  );

  // O que já estava gravado passa sem checagem: o usuário pode ter perdido o vínculo depois.
  const entering = new Set(input.map((item) => referrerKey(item.referrer)).filter((key) => !currentByKey.has(key)));
  await assertEntering(tx, tenantId, input, entering);

  const names = await namesOf(tx, input);
  const links: ReferralLink[] = input.map((item, index) => ({
    referrer: { ...item.referrer, name: names.get(referrerKey(item.referrer)) ?? '' },
    position: index + 1,
    notes: item.notes,
  }));
  const [issue] = validateReferralChain(subject, links);
  if (issue) throw new ReferralChainRejection(describeReferralChainIssue(issue), issue.position);

  const kept = new Set(links.map((link) => referrerKey(link.referrer)));
  const removed = current.filter((row) => !kept.has(keyOf(row)));
  if (removed.length > 0) {
    await writes.delete(
      referralLinks,
      inArray(
        referralLinks.id,
        removed.map((row) => row.id),
      ),
    );
  }
  for (const link of links) {
    const row = currentByKey.get(referrerKey(link.referrer));
    if (row) {
      if (row.position !== link.position || row.notes !== link.notes) {
        await writes.update(referralLinks, { position: link.position, notes: link.notes }, eq(referralLinks.id, row.id));
      }
    } else {
      await writes.insert(referralLinks, {
        tenantId,
        ...own.subjectValues(subject.id),
        referrerUserId: link.referrer.kind === 'user' ? link.referrer.id : null,
        referrerContactId: link.referrer.kind === 'contact' ? link.referrer.id : null,
        position: link.position,
        notes: link.notes,
      });
    }
  }

  // Quem indica é corretor externo: o papel é garantido (idempotente) e sai no histórico do indicador.
  for (const link of links) {
    if (link.referrer.kind === 'contact') await ensureContactRole(tx, actor, link.referrer.id, 'external_broker');
  }
}

const keyOf = (row: typeof referralLinks.$inferSelect) =>
  referrerKey(row.referrerUserId ? { kind: 'user', id: row.referrerUserId } : { kind: 'contact', id: row.referrerContactId! });

/** Apaga a cadeia do sujeito, auditada: o `CASCADE` do banco não audita, então vem antes da exclusão do sujeito. */
export async function deleteReferralChain(writes: AuditedWrites, subject: ReferralSubjectRef): Promise<void> {
  await writes.delete(referralLinks, eq(subjectColumn(subject), subject.id));
}
