import type pg from 'pg';

/**
 * O Postgres não aplica RLS a superusuário, a papel com BYPASSRLS nem ao dono
 * da tabela. Se a aplicação conectar como qualquer um deles, o isolamento entre
 * empresas some sem nenhum erro — por isso a API recusa subir.
 */
export class UnsafeApplicationRoleError extends Error {
  constructor(readonly role: string, readonly problems: string[]) {
    super(
      `O papel do banco "${role}" não pode ser o da aplicação, porque o RLS não vale para ele: ${problems.join('; ')}. ` +
        'A string de conexão da API (DATABASE_URL) deve usar o papel crm_app.',
    );
    this.name = 'UnsafeApplicationRoleError';
  }
}

interface RoleInspection {
  role: string;
  superuser: boolean;
  bypass_rls: boolean;
  owned_relations: string[];
}

/** Quantas relações citar pelo nome na mensagem; o resto vira contagem. */
const LISTED_RELATIONS = 5;

/**
 * Inspeciona o papel da conexão e estoura `UnsafeApplicationRoleError` se ele
 * escapar do RLS. Vale também o que o papel herda como membro de outro: quem é
 * membro do dono da tabela age como dono.
 */
export async function assertApplicationRole(pool: pg.Pool): Promise<void> {
  const { rows } = await pool.query<RoleInspection>(`
    select current_user as role,
           exists (select 1 from pg_roles r
                    where pg_has_role(current_user, r.oid, 'member') and r.rolsuper) as superuser,
           exists (select 1 from pg_roles r
                    where pg_has_role(current_user, r.oid, 'member') and r.rolbypassrls) as bypass_rls,
           array(select c.oid::regclass::text
                   from pg_class c
                   join pg_namespace n on n.oid = c.relnamespace
                  where c.relkind in ('r', 'p')
                    and n.nspname not in ('pg_catalog', 'information_schema')
                    and n.nspname not like 'pg\\_toast%'
                    and pg_has_role(current_user, c.relowner, 'member')
                  order by 1) as owned_relations
  `);
  const inspection = rows[0];
  if (!inspection) throw new Error('A inspeção do papel do banco não devolveu linha.');

  const problems: string[] = [];
  if (inspection.superuser) problems.push('é superusuário');
  if (inspection.bypass_rls) problems.push('tem BYPASSRLS');
  if (inspection.owned_relations.length > 0) problems.push(`é dono de ${describeRelations(inspection.owned_relations)}`);

  if (problems.length > 0) throw new UnsafeApplicationRoleError(inspection.role, problems);
}

function describeRelations(relations: string[]): string {
  const listed = relations.slice(0, LISTED_RELATIONS).join(', ');
  const rest = relations.length - LISTED_RELATIONS;
  const count = `${relations.length} tabela${relations.length === 1 ? '' : 's'}`;
  return rest > 0 ? `${count} (${listed} e mais ${rest})` : `${count} (${listed})`;
}
