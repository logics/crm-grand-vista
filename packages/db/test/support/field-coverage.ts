// Cobertura dos metadados de campo sobre o schema do Drizzle: toda coluna de
// toda tabela tem rótulo ou é declarada oculta, para que nenhuma apareça crua
// (`water_availability`) num formulário ou no histórico de alterações. O mesmo
// raciocínio da varredura de RLS: falha daqui a seis meses, na coluna esquecida.
import { getTableColumns, getTableName, is } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';

/**
 * Tabelas sem metadados de campo, cada uma com o motivo. NÃO é padrão de nome:
 * tabela nova entra no registro de `@crm/shared` até que alguém a escreva aqui,
 * e escrever aqui é decisão de revisão.
 */
export const TABLES_WITHOUT_FIELD_METADATA: Readonly<Record<string, string>> = {
  sessions: 'da biblioteca de autenticação; nunca é exibida nem auditada',
  accounts: 'da biblioteca de autenticação; guarda credencial',
  verifications: 'da biblioteca de autenticação; tokens de verificação',
  audit_log: 'é o próprio histórico: o que ele exibe são os metadados das outras tabelas',
  permissions: 'catálogo em código; a descrição já é o texto legível',
  profile_permissions: 'junção sem `id`, sincronizada como conjunto',
  profile_data_scopes: 'junção sem `id`, sincronizada como conjunto',
  user_profiles: 'junção sem `id`, sincronizada como conjunto',
  user_platform_permissions: 'junção sem `id`, vazia até o AdminMaster',
  municipalities: 'dado de referência do IBGE, carregado por migration; ninguém o edita nem o audita',
};

/** O que o teste precisa do registro: as colunas declaradas de cada tabela. */
export type RegistryShape = Readonly<Record<string, { fields: Readonly<Record<string, unknown>> }>>;

export interface CoverageInput {
  schema: Readonly<Record<string, unknown>>;
  registry: RegistryShape;
  excluded: Readonly<Record<string, string>>;
  /** Colunas que nunca entram no registro: as só de plataforma do wrapper de auditoria. */
  ignoredColumns: ReadonlySet<string>;
}

/** As tabelas exportadas por um módulo de schema do Drizzle. */
export const tablesOf = (schema: Readonly<Record<string, unknown>>): PgTable[] =>
  Object.values(schema).filter((value): value is PgTable => is(value, PgTable));

/** Uma linha por lacuna, `tabela[.coluna]: motivo`. Vazio é o único resultado aceito. */
export function findFieldCoverageGaps({ schema, registry, excluded, ignoredColumns }: CoverageInput): string[] {
  const tables = new Map(tablesOf(schema).map((table) => [getTableName(table), table]));
  const gaps: string[] = [];

  for (const [name, table] of tables) {
    const entity = registry[name];
    if (name in excluded) {
      if (entity) gaps.push(`${name}: está nas exclusões e no registro`);
      continue;
    }
    if (!entity) {
      gaps.push(`${name}: sem registro de metadados de campo`);
      continue;
    }
    const columns = Object.values(getTableColumns(table)).map((column) => column.name);
    for (const column of columns) {
      if (!ignoredColumns.has(column) && !(column in entity.fields)) {
        gaps.push(`${name}.${column}: sem metadado (coluna que não aparece é declarada como HIDDEN)`);
      }
    }
    for (const column of Object.keys(entity.fields)) {
      if (!columns.includes(column)) gaps.push(`${name}.${column}: metadado de coluna que não existe`);
    }
  }

  for (const name of Object.keys(registry)) {
    if (!tables.has(name)) gaps.push(`${name}: registrada, mas não existe no schema`);
  }
  for (const name of Object.keys(excluded)) {
    if (!tables.has(name)) gaps.push(`${name}: nas exclusões, mas não existe no schema`);
  }

  return gaps;
}
