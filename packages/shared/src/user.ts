// Único caminho pelo qual um usuário atravessa a borda HTTP. Nenhuma rota
// devolve a entidade crua do banco: tudo o que não está declarado aqui —
// `is_super_admin` em primeiro lugar — fica para trás.
import { z } from 'zod';

export const userSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  image: z.string().nullable(),
});

export type User = z.infer<typeof userSchema>;

/** Usuário como opção de um seletor: só o que o identifica na lista. */
export type UserOption = Pick<User, 'id' | 'name' | 'email'>;

/** Entrada mínima do serializador: a entidade do banco ou a do Better Auth. */
type UserRecord = { id: string; name: string; email: string; image?: string | null | undefined };

export function serializeUser(user: UserRecord): User {
  return userSchema.parse({ ...user, image: user.image ?? null });
}

/**
 * Corpo de toda rota que altera um usuário: só o que é editável. Chave não
 * declarada — `is_super_admin` em primeiro lugar — é descartada em silêncio,
 * sem erro que revele que o campo existe.
 */
export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1, 'Informe o nome.'),
    image: z.string().nullable(),
  })
  .partial();

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/** Perfil de acesso como aparece ao lado de um usuário: só o que identifica. */
export const accessProfileRefSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

export type AccessProfileRef = z.infer<typeof accessProfileRefSchema>;

/**
 * Usuário na listagem de equipe e no seletor de responsável. Os perfis de
 * acesso são os de fato vinculados: o super admin não ganha marca nem perfil.
 */
export const teamMemberSchema = userSchema.extend({
  accessProfiles: z.array(accessProfileRefSchema),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;

export function serializeTeamMember(user: UserRecord, accessProfiles: AccessProfileRef[]): TeamMember {
  return { ...serializeUser(user), accessProfiles: z.array(accessProfileRefSchema).parse(accessProfiles) };
}
