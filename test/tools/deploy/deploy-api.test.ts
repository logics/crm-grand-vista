// O script de deploy de verdade, com `ssh`, `rsync` e `curl` substituídos por
// registradores no PATH. A migration é um `migrate.js` de mentira dentro de um
// artefato de mentira, executado pelo Node real — o mesmo caminho do artefato.
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('../../../tools/deploy/deploy-api.sh', import.meta.url));

const RELEASE = '4f1c2ab';
const WEBHOOK_URL = 'https://painel.test/webhook?access_key=segredo';
const HEALTH_URL = 'https://api.test/health';

/** Registrador: anota o comando e os argumentos, uma linha por chamada. */
const recorder = (name: string, body = '') => `#!/bin/bash
echo "${name} $*" | tr '\\n' ' ' >> "$CALLS_LOG"
echo >> "$CALLS_LOG"
${body}
`;

interface Scenario {
  migrateExit?: number;
  webhookFails?: boolean;
  /** Versão que o endpoint de saúde responde depois do reinício. */
  healthVersion?: string;
  migrationUrl?: string;
}

function runDeploy({ migrateExit = 0, webhookFails = false, healthVersion = RELEASE, migrationUrl }: Scenario = {}) {
  const base = mkdtempSync(join(tmpdir(), 'deploy-'));
  const bin = join(base, 'bin');
  const artifact = join(base, 'artifact');
  const log = join(base, 'calls.log');
  writeFileSync(log, '');

  const stubs = {
    ssh: recorder('ssh'),
    rsync: recorder('rsync'),
    curl: recorder(
      'curl',
      // Chaves fora da ordem do endpoint: a confirmação lê o JSON, não o texto.
      `case "$*" in
        *health*) echo '{"database":"ok","version":"${healthVersion}","status":"ok"}' ;;
        *webhook*) exit ${webhookFails ? 22 : 0} ;;
      esac`,
    ),
  };
  mkdirSync(bin);
  for (const [name, content] of Object.entries(stubs)) {
    writeFileSync(join(bin, name), content);
    chmodSync(join(bin, name), 0o755);
  }

  const migrate = join(artifact, 'node_modules/@crm/db/dist/cli/migrate.js');
  mkdirSync(dirname(migrate), { recursive: true });
  writeFileSync(
    migrate,
    `require('node:fs').appendFileSync(${JSON.stringify(log)}, 'migrate\\n'); process.exit(${migrateExit});`,
  );
  writeFileSync(join(artifact, 'package.json'), '{}');

  const result = spawnSync('bash', [script], {
    encoding: 'utf8',
    timeout: 20_000,
    env: {
      PATH: [bin, dirname(process.execPath), '/usr/bin', '/bin'].join(':'),
      CALLS_LOG: log,
      ARTIFACT_DIR: artifact,
      RELEASE,
      DEPLOY_SSH_TARGET: 'deploy@servidor.test',
      DEPLOY_PATH: '/www/crm-api',
      MIGRATION_DATABASE_URL: migrationUrl ?? 'postgres://crm_owner:senha@localhost:5432/crm',
      DEPLOY_WEBHOOK_URL: WEBHOOK_URL,
      HEALTH_URL,
      HEALTH_TIMEOUT_SECONDS: '1',
      HEALTH_INTERVAL_SECONDS: '0.2',
    },
  });

  const calls = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean) : [];
  return { ...result, calls, output: `${result.stdout}${result.stderr}` };
}

/** Traduz cada chamada registrada no passo do deploy que ela representa. */
function steps(calls: string[]): string[] {
  const patterns: [string, RegExp][] = [
    ['tunnel', /^ssh -M .* -L 127\.0\.0\.1:5432:localhost:5432 /],
    ['close-tunnel', /^ssh .* -O exit/],
    ['migrate', /^migrate$/],
    ['upload', /^rsync /],
    ['rollback', /^ssh .*cat previous_release/],
    ['activate', /^ssh .*releases\/4f1c2ab.*current/],
    ['webhook', /^curl .*webhook/],
    ['health', /^curl .*health/],
  ];
  return calls.flatMap((call) => patterns.filter(([, pattern]) => pattern.test(call)).slice(0, 1).map(([step]) => step));
}

const unique = (list: string[]) => list.filter((step, index) => step !== list[index - 1]);

describe('deploy da API', () => {
  it('migra, envia o artefato, ativa e só então reinicia', () => {
    const { status, calls, output } = runDeploy();

    expect(status, output).toBe(0);
    expect(unique(steps(calls))).toEqual(['tunnel', 'migrate', 'close-tunnel', 'upload', 'activate', 'webhook', 'health']);
  });

  it('para na migration que falha, sem enviar nem reiniciar nada', () => {
    const { status, calls, output } = runDeploy({ migrateExit: 1 });

    expect(status).not.toBe(0);
    expect(unique(steps(calls))).toEqual(['tunnel', 'migrate', 'close-tunnel']);
    expect(output).toContain('migration falhou');
  });

  it('volta ao release anterior quando o novo processo não responde', () => {
    const { status, calls, output } = runDeploy({ healthVersion: 'release-antigo' });

    expect(status).not.toBe(0);
    expect(unique(steps(calls))).toEqual([
      'tunnel', 'migrate', 'close-tunnel', 'upload', 'activate', 'webhook', 'health', 'rollback', 'webhook',
    ]);
    expect(output).toContain(RELEASE);
  });

  it('volta ao release anterior quando o webhook do painel falha', () => {
    const { status, calls, output } = runDeploy({ webhookFails: true });

    expect(status).not.toBe(0);
    expect(unique(steps(calls))).toEqual(['tunnel', 'migrate', 'close-tunnel', 'upload', 'activate', 'webhook', 'rollback']);
    expect(output).toContain('webhook');
  });

  it('recusa migration que não aponte para o Postgres local do servidor', () => {
    const { status, calls, output } = runDeploy({ migrationUrl: 'postgres://crm_owner:senha@db.externo.test:5432/crm' });

    expect(status).not.toBe(0);
    expect(calls).toEqual([]);
    expect(output).toContain('localhost');
  });

  it('não escreve no log a URL do webhook nem a string de migration', () => {
    const { output } = runDeploy();

    expect(output).not.toContain('access_key');
    expect(output).not.toContain('senha');
  });
});
