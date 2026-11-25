// Registro de uso declarado dos papéis: o ponto de extensão das regras de "em
// uso". Cada spec consumidora declara, por papel, a tabela e a coluna que
// apontam para o contato, e os rótulos da entidade. O serviço conta essas
// linhas antes de retirar o papel (o bloqueio é global) e, se a declaração
// traz `visibleCount`, também as do escopo de quem pede: só a mensagem usa essa
// contagem, para não dizer um número que revele registros fora do acesso. As
// declarações moram nos módulos que criam as tabelas (fazendas, cadeia de
// indicação, oportunidades, comissão), no momento em que as criam.
import type { Transaction } from '@crm/db';
import type { ContactRole } from '@crm/shared';
import { sql } from 'drizzle-orm';
import type { EffectiveAccess } from '../authorization/effective-access.js';

export interface RoleUsage {
  /** Nome da tabela no banco (`farms`). */
  table: string;
  /** Coluna que aponta para o contato (`contact_id`). */
  column: string;
  /** Rótulos da entidade que usa o contato: "fazenda" / "fazendas". */
  label: { singular: string; plural: string; gender?: 'f' | 'm' };
  /** Frase da exclusão barrada pela FK: "é proprietário de fazenda". Sem ela, a mensagem cita o rótulo da entidade. */
  inUsePhrase?: string;
  /** Contagem filtrada pelo escopo de quem pede; só para a mensagem, nunca para o bloqueio. */
  visibleCount?: (tx: Transaction, access: EffectiveAccess, contactId: string) => Promise<number>;
  /** Como a mensagem cita o uso sem número; sem ela, `de <plural>`. */
  uncountedPhrase?: string;
}

const declarations: { role: ContactRole; usage: RoleUsage }[] = [];

/** Declara onde o papel está em uso. Devolve a função que desfaz a declaração (para os testes). */
export function declareRoleUsage(role: ContactRole, usage: RoleUsage): () => void {
  const entry = { role, usage };
  declarations.push(entry);
  return () => {
    const index = declarations.indexOf(entry);
    if (index >= 0) declarations.splice(index, 1);
  };
}

export const roleUsagesOf = (role: ContactRole): RoleUsage[] =>
  declarations.filter((entry) => entry.role === role).map((entry) => entry.usage);

/** Rótulo plural da entidade que declarou a tabela, ou nada se ninguém a declarou. */
export const pluralLabelOfTable = (table: string): string | undefined =>
  declarations.find((entry) => entry.usage.table === table)?.usage.label.plural;

/** A declaração da tabela, ou nada se ninguém a declarou. */
export const usageOfTable = (table: string): RoleUsage | undefined =>
  declarations.find((entry) => entry.usage.table === table)?.usage;

export interface RoleUsageCount {
  usage: RoleUsage;
  count: number;
  /** Linhas dentro do escopo de quem pede; ausente se a declaração não tem `visibleCount`. */
  visible?: number;
}

/** Linhas que usam o contato no papel, por declaração; só as declarações com uso. */
export async function countRoleUsage(
  tx: Transaction,
  access: EffectiveAccess,
  role: ContactRole,
  contactId: string,
): Promise<RoleUsageCount[]> {
  const counts: RoleUsageCount[] = [];
  for (const usage of roleUsagesOf(role)) {
    const result = await tx.execute<{ total: number }>(
      sql`select count(*)::int as total from ${sql.identifier(usage.table)} where ${sql.identifier(usage.column)} = ${contactId}`,
    );
    const count = Number(result.rows[0]?.total ?? 0);
    if (count === 0) continue;
    const visible = usage.visibleCount ? await usage.visibleCount(tx, access, contactId) : undefined;
    counts.push({ usage, count, visible });
  }
  return counts;
}
