// A config de lint (`.oxlintrc.json`) carrega as regras de aderência ao Design
// System vindas do export. Cada caso abaixo é um arquivo lintado de verdade,
// pelo mesmo binário e pela mesma config do `pnpm lint`: o que deve ser barrado
// tem de gerar o aviso esperado, e o uso correto não pode gerar nenhum.
// Os casos contêm as violações como texto: por isso o `.oxlintrc.json` desliga
// `crm/no-restricted-syntax` só para este arquivo.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const ADHERENCE_RULE_CODES = /^(?:crm\(no-restricted-syntax\)|eslint\(no-restricted-imports\))$/;

type Diagnostic = { message: string; code: string; help?: string; filename: string };

const violations: Record<string, { source: string; expected: RegExp }> = {
  'cor hex crua': { source: `export const color = '#1f3d2b';`, expected: /hex/i },
  'paleta crua --gv-*': { source: `export const color = 'var(--gv-green-700)';`, expected: /paleta crua/i },
  'px cru': { source: `export const padding = '12px';`, expected: /px/i },
  'fonte fora do DS': { source: `export const css = 'font-family: Arial';`, expected: /fonte/i },
  'variante inexistente de Button': {
    source: `export const el = <Button variant="huge">Salvar</Button>;`,
    expected: /<Button> variant/,
  },
  'tom inexistente de Badge': { source: `export const el = <Badge tone="purple">Nova</Badge>;`, expected: /<Badge> tone/ },
  'tamanho inexistente de CompatibilityGauge': {
    source: `export const el = <CompatibilityGauge value={80} size="xl" />;`,
    expected: /<CompatibilityGauge> size/,
  },
  'tom inexistente de Wordmark': { source: `export const el = <Wordmark tone="gold" />;`, expected: /<Wordmark> tone/ },
  'glifo direto do lucide-react': {
    source: `import { Tractor } from 'lucide-react';\nexport const glyph = Tractor;`,
    expected: /Icon/,
  },
  'import da referência visual': {
    source: `import { Button } from '../../design-system/referencia/componentes/core/Button.jsx';\nexport { Button };`,
    expected: /referência visual/i,
  },
};

const conforming: Record<string, string> = {
  'componente com variantes válidas e atributos nativos': `export const el = (
  <>
    <Button variant="accent" size="lg" type="submit" onClick={() => {}} aria-label="Salvar">Salvar</Button>
    <Badge tone="gold" size="sm">Destaque</Badge>
    <CompatibilityGauge value={80} size="lg" />
    <Wordmark tone="light" />
  </>
);`,
  'Textarea e Toast com atributos nativos': `export const el = (
  <>
    <Textarea placeholder="Observações" aria-invalid rows={4} />
    <Toast tone="success" title="Fazenda salva" role="status" />
  </>
);`,
  'cores e medidas pelos tokens': `export const el = <div className="bg-surface-card p-6 text-text-body" />;`,
};

const cases = { ...Object.fromEntries(Object.entries(violations).map(([name, { source }]) => [name, source])), ...conforming };
let workDir: string;
let diagnosticsByCase: Map<string, Diagnostic[]>;

const fileFor = (name: string) => join(workDir, `${name.replace(/[^\w]+/g, '-')}.tsx`);

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), 'crm-lint-'));
  for (const [name, source] of Object.entries(cases)) writeFileSync(fileFor(name), source);

  const result = spawnSync(
    join(rootDir, 'node_modules/.bin/oxlint'),
    ['-c', join(rootDir, '.oxlintrc.json'), '-f', 'json', workDir],
    { cwd: rootDir, encoding: 'utf8' },
  );
  const { diagnostics } = JSON.parse(result.stdout) as { diagnostics: Diagnostic[] };

  diagnosticsByCase = new Map(
    Object.keys(cases).map((name) => [
      name,
      diagnostics.filter((diagnostic) => diagnostic.filename === fileFor(name) && ADHERENCE_RULE_CODES.test(diagnostic.code)),
    ]),
  );
});

afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const describeDiagnostic = ({ message, help }: Diagnostic) => [message, help].filter(Boolean).join(' — ');

describe('lint de aderência ao Design System', () => {
  it.each(Object.entries(violations))('barra %s', (name, { expected }) => {
    const messages = diagnosticsByCase.get(name)!.map(describeDiagnostic);
    expect(messages).toContainEqual(expect.stringMatching(expected));
  });

  it.each(Object.keys(conforming))('aceita %s', (name) => {
    expect(diagnosticsByCase.get(name)!.map(describeDiagnostic)).toEqual([]);
  });
});
