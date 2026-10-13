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

/** Entrada mínima do serializador: a entidade do banco ou a do Better Auth. */
type UserRecord = { id: string; name: string; email: string; image?: string | null | undefined };

export function serializeUser(user: UserRecord): User {
  return userSchema.parse({ ...user, image: user.image ?? null });
}
