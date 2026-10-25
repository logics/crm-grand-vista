// Usuários da empresa ativa. `users` e `memberships` ficam fora do RLS, então o
// recorte por empresa aqui é explícito, pelo vínculo. Nada sai cru: tudo passa
// pelos serializadores de `@crm/shared`.
import {
  accessProfiles,
  auditedWrites,
  memberships,
  userProfiles,
  users,
  type AuditActor,
  type Transaction,
} from '@crm/db';
import {
  serializeTeamMember,
  serializeUser,
  updateUserSchema,
  type AccessProfileRef,
  type TeamMember,
  type UpdateUserInput,
  type User,
} from '@crm/shared';
import { and, asc, eq, inArray } from 'drizzle-orm';

/** Usuários com vínculo na empresa — é o vínculo que define quem é da equipe. */
const membersOf = (tx: Transaction, tenantId: string, userId?: string) =>
  tx
    .select({ id: memberships.userId })
    .from(memberships)
    .where(and(eq(memberships.tenantId, tenantId), userId ? eq(memberships.userId, userId) : undefined));

/** Se o usuário tem vínculo com a empresa: é o que o torna visível nela. */
export async function isTeamMember(tx: Transaction, tenantId: string, userId: string): Promise<boolean> {
  const [member] = await membersOf(tx, tenantId, userId);
  return member !== undefined;
}

/**
 * Equipe da empresa ativa, por nome, com os perfis de acesso de fato vinculados
 * a cada um. Alimenta a listagem de equipe e o seletor de responsável; o super
 * admin sai como qualquer usuário.
 */
export async function listTeamMembers(tx: Transaction, tenantId: string): Promise<TeamMember[]> {
  const members = await tx
    .select({ id: users.id, name: users.name, email: users.email, image: users.image })
    .from(users)
    .where(inArray(users.id, membersOf(tx, tenantId)))
    .orderBy(asc(users.name), asc(users.id));

  // `user_profiles` e `access_profiles` estão sob RLS: só vêm os da empresa ativa.
  const links = await tx
    .select({ userId: userProfiles.userId, id: accessProfiles.id, name: accessProfiles.name })
    .from(userProfiles)
    .innerJoin(accessProfiles, eq(accessProfiles.id, userProfiles.profileId))
    .orderBy(asc(accessProfiles.name), asc(accessProfiles.id));

  const profilesByUser = new Map<string, AccessProfileRef[]>();
  for (const { userId, ...profile } of links) {
    profilesByUser.set(userId, [...(profilesByUser.get(userId) ?? []), profile]);
  }

  return members.map((member) => serializeTeamMember(member, profilesByUser.get(member.id) ?? []));
}

/**
 * Altera um usuário da empresa do autor e devolve o serializado; nulo se ele
 * não existe ou não tem vínculo com ela. O corpo passa de novo pelo schema: o
 * que não é editável — `is_super_admin` — é descartado aqui, antes do banco,
 * mesmo que quem chamou não tenha validado.
 */
export async function updateUser(
  tx: Transaction,
  actor: AuditActor & { tenantId: string },
  userId: string,
  input: UpdateUserInput,
): Promise<User | null> {
  const changes = updateUserSchema.parse(input);
  const target = inArray(users.id, membersOf(tx, actor.tenantId, userId));

  // Corpo sem campo editável não é escrita: nem `updated_at` muda.
  const [user] =
    Object.keys(changes).length === 0
      ? await tx.select().from(users).where(target)
      : await auditedWrites(tx, actor).update(users, changes, target);

  return user ? serializeUser(user) : null;
}
