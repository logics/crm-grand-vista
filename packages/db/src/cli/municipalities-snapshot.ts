// Ferramenta de desenvolvedor, rodada à mão quando o IBGE publicar mudança:
// baixa a lista, compara com o snapshot do repositório e, havendo diferença,
// regrava o snapshot e gera a migration do delta. O resultado entra por pull request.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MIGRATIONS_FOLDER } from '../migrate.js';
import { buildMunicipalitiesDelta } from '../municipalities/delta.js';
import { IBGE_MUNICIPALITIES_URL, parseIbgeMunicipalities } from '../municipalities/ibge.js';
import type { MunicipalityRecord } from '../municipalities/types.js';

const SNAPSHOT_PATH = fileURLToPath(new URL('../../data/municipalities.json', import.meta.url));
const PACKAGE_DIR = fileURLToPath(new URL('../..', import.meta.url));

const readSnapshot = (): MunicipalityRecord[] => {
  try {
    return JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as MunicipalityRecord[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
};

const response = await fetch(IBGE_MUNICIPALITIES_URL);
if (!response.ok) throw new Error(`IBGE respondeu ${response.status}.`);
const next = parseIbgeMunicipalities(await response.json());

const delta = buildMunicipalitiesDelta(readSnapshot(), next);
if (delta === null) {
  console.warn('Sem diferença entre o snapshot e a lista do IBGE: nada gravado.');
  process.exit(0);
}

const migrationsBefore = new Set(readdirSync(MIGRATIONS_FOLDER));
// Cria o arquivo vazio, a entrada no journal e o snapshot do drizzle-kit.
execFileSync('pnpm', ['exec', 'drizzle-kit', 'generate', '--custom', '--name=municipalities_load'], {
  cwd: PACKAGE_DIR,
  stdio: 'inherit',
});
const created = readdirSync(MIGRATIONS_FOLDER).find((name) => name.endsWith('.sql') && !migrationsBefore.has(name));
if (!created) throw new Error('O drizzle-kit não gerou a migration.');

writeFileSync(`${MIGRATIONS_FOLDER}/${created}`, `-- Carga de municípios do IBGE: delta gerado por \`pnpm municipalities:snapshot\`.\n${delta}`);
writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(next, null, 2)}\n`);
console.log(`Snapshot regravado (${next.length} municípios) e migration ${created} gerada.`);
