// Registro de uso declarado dos papéis: o ponto de extensão das regras de "em
// uso". Cada spec consumidora declara, por papel, a tabela e a coluna que
// apontam para o contato, e os rótulos da entidade. O serviço conta essas
// linhas antes de retirar o papel. Nasce vazio: as declarações moram nos
// módulos que criam as tabelas (fazendas, cadeia de indicação, oportunidades,
// comissão), no momento em que as criam.
import type { Transaction } from '@crm/db';
import type { ContactRole } from '@crm/shared';
import { sql } from 'drizzle-orm';

export interface RoleUsage {
  /** Nome da tabela no banco (`farms`). */
  table: string;
  /** Coluna que aponta para o contato (`owner_contact_id`). */
  column: string;
  /** Rótulos da entidade que usa o contato: "fazenda" / "fazendas". */
  label: { singular: string; plural: string };
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

export interface RoleUsageCount {
  usage: RoleUsage;
  count: number;
}

/** Linhas que usam o contato no papel, por declaração; só as declarações com uso. */
export async function countRoleUsage(tx: Transaction, role: ContactRole, contactId: string): Promise<RoleUsageCount[]> {
  const counts: RoleUsageCount[] = [];
  for (const usage of roleUsagesOf(role)) {
    const result = await tx.execute<{ total: number }>(
      sql`select count(*)::int as total from ${sql.identifier(usage.table)} where ${sql.identifier(usage.column)} = ${contactId}`,
    );
    const count = Number(result.rows[0]?.total ?? 0);
    if (count > 0) counts.push({ usage, count });
  }
  return counts;
}
