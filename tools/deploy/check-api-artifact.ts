// Verifica o artefato da API antes de ele sair do CI: só o que produção
// executa — nada de teste, código-fonte, referência visual do Design System
// ou dependência de desenvolvimento. Roda direto no Node, sem compilação:
//   node tools/deploy/check-api-artifact.ts <diretório do artefato>
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** O que pode existir na raiz do artefato. */
const ROOT_ENTRIES = new Set(['dist', 'node_modules', 'package.json', 'release.json']);
/** O que pode existir em cada pacote do workspace copiado para `node_modules/@crm/`. */
const WORKSPACE_PACKAGE_ENTRIES = new Set(['dist', 'migrations', 'package.json']);
/** Sem estes, o processo não sobe ou o deploy não migra. */
const REQUIRED = ['release.json', 'dist', 'node_modules/@crm/db/migrations'];
const WORKSPACE_GLOBS = ['apps', 'packages'];

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function workspaceManifests(workspaceRoot: string): PackageJson[] {
  const packageDirs = WORKSPACE_GLOBS.flatMap((dir) =>
    existsSync(join(workspaceRoot, dir))
      ? readdirSync(join(workspaceRoot, dir)).map((name) => join(workspaceRoot, dir, name))
      : [],
  );
  return [workspaceRoot, ...packageDirs]
    .map((dir) => join(dir, 'package.json'))
    .filter((path) => existsSync(path))
    .map((path) => JSON.parse(readFileSync(path, 'utf8')) as PackageJson);
}

/**
 * Dependência de desenvolvimento de algum pacote do workspace que não é de
 * produção em nenhum outro. `@types/*` fica de fora: só declara tipos, nunca é
 * carregado, e o pnpm o arrasta como peer opcional do drizzle-orm.
 */
function devOnlyDependencies(workspaceRoot: string): Set<string> {
  const manifests = workspaceManifests(workspaceRoot);
  const production = new Set(manifests.flatMap((manifest) => Object.keys(manifest.dependencies ?? {})));
  return new Set(
    manifests
      .flatMap((manifest) => Object.keys(manifest.devDependencies ?? {}))
      .filter((name) => !production.has(name) && !name.startsWith('@types/')),
  );
}

/** `@scope+nome@1.2.3_peer@4` → `@scope/nome`; `nome@1.2.3` → `nome`. */
function packageNameOf(storeEntry: string): string {
  const versionAt = storeEntry.indexOf('@', storeEntry.startsWith('@') ? 1 : 0);
  return (versionAt === -1 ? storeEntry : storeEntry.slice(0, versionAt)).replace('+', '/');
}

export function findArtifactProblems(artifactDir: string, workspaceRoot: string): string[] {
  const missing = REQUIRED.filter((path) => !existsSync(join(artifactDir, path))).map(
    (path) => `falta no artefato: ${path}`,
  );

  const crmDir = join(artifactDir, 'node_modules/@crm');
  const workspacePackages = existsSync(crmDir) ? readdirSync(crmDir) : [];
  const unexpected = [
    ...readdirSync(artifactDir).filter((entry) => !ROOT_ENTRIES.has(entry)),
    ...workspacePackages.flatMap((name) =>
      readdirSync(join(crmDir, name))
        .filter((entry) => !WORKSPACE_PACKAGE_ENTRIES.has(entry))
        .map((entry) => `node_modules/@crm/${name}/${entry}`),
    ),
  ].map((path) => `não deveria estar no artefato: ${path}`);

  const storeDir = join(artifactDir, 'node_modules/.pnpm');
  const forbidden = devOnlyDependencies(workspaceRoot);
  const installed = existsSync(storeDir) ? readdirSync(storeDir).map(packageNameOf) : [];
  const devDependencies = [...new Set(installed.filter((name) => forbidden.has(name)))]
    .sort()
    .map((name) => `dependência de desenvolvimento no artefato: ${name}`);

  return [...missing, ...unexpected, ...devDependencies];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const artifactDir = process.argv[2];
  if (!artifactDir) {
    console.error('Uso: node tools/deploy/check-api-artifact.ts <diretório do artefato>');
    process.exit(2);
  }
  const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));
  const problems = findArtifactProblems(resolve(artifactDir), workspaceRoot);
  if (problems.length > 0) {
    console.error(`Artefato da API recusado:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
    process.exit(1);
  }
  console.log('Artefato da API verificado: só o que produção executa.');
}
