// Regras da guarda de migrations (`test/migration-safety.test.ts`). Um bloco é
// o trecho entre dois `--> statement-breakpoint`, como o Drizzle gera; em
// migration escrita à mão sem separadores, o arquivo inteiro é um bloco só.

/** Marca a contração como decidida: `-- contração: <motivo>`, no mesmo bloco. */
const REVIEWED_MARKER = /^--[ \t]*contração:[ \t]*\S/m;

const BLOCK_SEPARATOR = '--> statement-breakpoint';

/** Comandos que quebram o código do release anterior, com o que cada um faz. */
const CONTRACTIONS: [problem: string, pattern: RegExp][] = [
  ['apaga tabela', /\bDROP\s+TABLE\b/],
  ['apaga coluna', /\bDROP\s+COLUMN\b/],
  ['apaga tipo', /\bDROP\s+TYPE\b/],
  ['renomeia', /\bRENAME\b/],
  ['muda o tipo de coluna', /\bALTER\s+COLUMN\s+\S+\s+(?:SET\s+DATA\s+)?TYPE\b/],
  ['torna coluna obrigatória', /\bSET\s+NOT\s+NULL\b/],
  ['esvazia tabela', /\bTRUNCATE\b/],
  ['apaga linhas', /\bDELETE\s+FROM\b/],
];

/**
 * Coluna nova `NOT NULL` sem `DEFAULT`: o código anterior não a preenche, e
 * todo INSERT dele passa a falhar.
 */
function addsRequiredColumnWithoutDefault(sql: string): boolean {
  return sql
    .split(/\bADD\s+COLUMN\b/)
    .slice(1)
    .some((column) => /\bNOT\s+NULL\b/.test(column) && !/\b(?:DEFAULT|GENERATED)\b/.test(column));
}

export interface UnreviewedContraction {
  problem: string;
  statement: string;
}

export function findUnreviewedContractions(migrationSql: string): UnreviewedContraction[] {
  return migrationSql.split(BLOCK_SEPARATOR).flatMap((block) => {
    if (REVIEWED_MARKER.test(block)) return [];

    const statement = block
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .trim();
    const normalized = statement.toUpperCase().replace(/\s+/g, ' ');

    const problems = CONTRACTIONS.filter(([, pattern]) => pattern.test(normalized)).map(([problem]) => problem);
    if (addsRequiredColumnWithoutDefault(normalized)) problems.push('cria coluna obrigatória sem valor padrão');
    return problems.map((problem) => ({ problem, statement }));
  });
}
