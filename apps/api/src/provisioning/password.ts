// Redefinição de senha pelo CLI: o único caminho, já que não há fluxo de
// "esqueci a senha". Vale para qualquer usuário e nada na saída diz se ele é
// super admin.
import { accounts, auditLog, sessions, users, type Database } from '@crm/db';
import { hashPassword } from 'better-auth/crypto';
import { and, eq } from 'drizzle-orm';
import { generatePassword } from './credentials.js';

export interface PasswordResetTarget {
  id: string;
  name: string;
  email: string;
}

/** O usuário de um e-mail, para o CLI mostrar de quem é a senha antes de confirmar. */
export async function findPasswordResetTarget(db: Database, email: string): Promise<PasswordResetTarget | null> {
  const [user] = await db.semTenant({ reason: 'cli' }, (tx) =>
    tx
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase())),
  );
  return user ?? null;
}

/**
 * Troca a credencial e encerra todas as sessões do usuário, na mesma transação.
 * Devolve a senha nova, que só existe em claro aqui. A auditoria é de
 * plataforma (sem empresa, autor nulo) e registra que a senha mudou — nunca
 * o valor, nem o hash.
 */
export async function resetPassword(db: Database, userId: string): Promise<string> {
  const password = generatePassword();
  const passwordHash = await hashPassword(password);

  await db.semTenant({ reason: 'cli' }, async (tx) => {
    const credential = and(eq(accounts.userId, userId), eq(accounts.providerId, 'credential'))!;
    const updated = await tx
      .update(accounts)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(credential)
      .returning({ id: accounts.id });
    // Usuário sem credencial (nunca teve senha) ganha uma, em vez de falhar.
    if (updated.length === 0) {
      await tx.insert(accounts).values({ userId, accountId: userId, providerId: 'credential', password: passwordHash });
    }

    await tx.delete(sessions).where(eq(sessions.userId, userId));
    await tx.insert(auditLog).values({
      tenantId: null,
      entity: 'users',
      entityId: userId,
      field: 'password',
      oldValue: null,
      newValue: 'redefinida',
      userId: null,
    });
  });
  return password;
}
