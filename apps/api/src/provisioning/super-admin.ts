// Marcação da flag de super admin: o único caminho que a altera. Não há rota,
// tela nem payload que chegue aqui — só o CLI. E não há função que liste quem
// a tem: a listagem é o que tornaria a flag descobrível.
import { auditedWrites, users, type Database } from '@crm/db';
import { and, eq, ne } from 'drizzle-orm';

export interface SuperAdminTarget {
  id: string;
  name: string;
  email: string;
}

/** O usuário de um e-mail, para o CLI mostrar quem será alterado antes de confirmar. */
export async function findSuperAdminTarget(db: Database, email: string): Promise<SuperAdminTarget | null> {
  const [user] = await db.semTenant({ reason: 'cli' }, (tx) =>
    tx
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase())),
  );
  return user ?? null;
}

/**
 * Marca ou desmarca a flag do usuário. Devolve se algo mudou: pedir o estado em
 * que ele já está não grava nada, nem no log. A auditoria é de plataforma —
 * sem empresa, autor nulo —, fora do histórico de qualquer empresa.
 */
export async function setSuperAdmin(db: Database, userId: string, enabled: boolean): Promise<boolean> {
  const changed = await db.semTenant({ reason: 'cli' }, (tx) =>
    auditedWrites(tx, { tenantId: null, userId: null }).update(
      users,
      { isSuperAdmin: enabled },
      and(eq(users.id, userId), ne(users.isSuperAdmin, enabled))!,
    ),
  );
  return changed.length > 0;
}
