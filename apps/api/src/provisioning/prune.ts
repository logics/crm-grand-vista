// Manutenção das tabelas do Better Auth: a sessão que expira sem logout e a
// verificação vencida não se apagam sozinhas. Uma linha vencida já não
// autentica; apagar só evita o acúmulo.
import { sessions, verifications, type Database } from '@crm/db';
import { lt } from 'drizzle-orm';

export interface PruneResult {
  sessions: number;
  verifications: number;
}

/** Apaga `sessions` e `verifications` com `expires_at` no passado e conta o que saiu de cada uma. */
export async function pruneExpired(db: Database): Promise<PruneResult> {
  return db.semTenant({ reason: 'cli' }, async (tx) => {
    const now = new Date();
    const removedSessions = await tx.delete(sessions).where(lt(sessions.expiresAt, now)).returning({ id: sessions.id });
    const removedVerifications = await tx
      .delete(verifications)
      .where(lt(verifications.expiresAt, now))
      .returning({ id: verifications.id });
    return { sessions: removedSessions.length, verifications: removedVerifications.length };
  });
}
