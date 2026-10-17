#!/usr/bin/env bash
# Deploy da API em produção, a partir do artefato montado por
# `build-api-artifact.sh`. Nesta ordem, parando no primeiro erro:
#
#   1. migrations, como `crm_owner`, por um túnel SSH até o Postgres do servidor
#      (que só escuta em localhost), executadas a partir do próprio artefato;
#   2. envio do artefato para `releases/<versão>` e troca atômica do link `current`;
#   3. webhook do painel, que reinicia o processo;
#   4. espera o endpoint de saúde responder a versão nova — senão, volta o link
#      para o release anterior e reinicia de novo.
#
# Migration que falha para tudo antes do passo 2: o processo antigo continua
# com o código antigo contra o banco antigo. Enviar o código antes da migration
# abriria a janela em que a aplicação consulta coluna que ainda não existe.
#
# A chave SSH e o known_hosts já estão configurados por quem chama (o workflow).
# Variáveis:
#   ARTIFACT_DIR            artefato local
#   RELEASE                 versão publicada (o commit)
#   DEPLOY_SSH_TARGET       usuário@servidor
#   DEPLOY_PATH             diretório da API no servidor (com releases/ e current)
#   MIGRATION_DATABASE_URL  conexão de crm_owner, do ponto de vista do servidor (localhost)
#   DEPLOY_WEBHOOK_URL      webhook do painel que reinicia o processo (segredo)
#   HEALTH_URL              endpoint de saúde público da API
#   HEALTH_TIMEOUT_SECONDS  opcional, padrão 120
#   HEALTH_INTERVAL_SECONDS opcional, padrão 3
set -euo pipefail

: "${ARTIFACT_DIR:?}" "${RELEASE:?}" "${DEPLOY_SSH_TARGET:?}" "${DEPLOY_PATH:?}"
: "${MIGRATION_DATABASE_URL:?}" "${DEPLOY_WEBHOOK_URL:?}" "${HEALTH_URL:?}"
health_timeout=${HEALTH_TIMEOUT_SECONDS:-120}
health_interval=${HEALTH_INTERVAL_SECONDS:-3}
# Releases mantidos no servidor, contando o atual: são os alvos de rollback manual.
keep_releases=5

step() { echo "==> $*"; }
fail() { echo "Deploy interrompido: $*" >&2; exit 1; }

# --- 1. Migrations -----------------------------------------------------------

# O Postgres de produção escuta só em localhost: o túnel liga a mesma porta
# aqui, e a string de conexão vale sem alteração dos dois lados.
read -r db_host db_port < <(node -e '
  const url = new URL(process.argv[1]);
  console.log(url.hostname, url.port || 5432);
' "$MIGRATION_DATABASE_URL")
case "$db_host" in
  localhost | 127.0.0.1) ;;
  *) fail "MIGRATION_DATABASE_URL deve apontar para o Postgres local do servidor (localhost), não para \"$db_host\"." ;;
esac

control_socket=$(mktemp -u "${TMPDIR:-/tmp}/crm-deploy-tunnel.XXXXXX")
close_tunnel() { ssh -S "$control_socket" -O exit "$DEPLOY_SSH_TARGET" 2>/dev/null || true; }
trap close_tunnel EXIT

step "Abrindo túnel até o Postgres do servidor"
ssh -M -S "$control_socket" -f -N -o ExitOnForwardFailure=yes \
  -L "127.0.0.1:$db_port:$db_host:$db_port" "$DEPLOY_SSH_TARGET"

step "Aplicando migrations ($RELEASE)"
node "$ARTIFACT_DIR/node_modules/@crm/db/dist/cli/migrate.js" ||
  fail "a migration falhou. Nada foi enviado; o processo no ar segue com o release anterior."
close_tunnel
trap - EXIT

# --- 2. Envio e ativação -----------------------------------------------------

release_dir="$DEPLOY_PATH/releases/$RELEASE"

step "Enviando o artefato para $release_dir"
ssh "$DEPLOY_SSH_TARGET" "mkdir -p '$release_dir'"
# Sem copiar dono nem grupo do runner: os arquivos herdam o grupo da pasta
# (setgid, grupo `www`), e o processo da API, que roda como `www`, só lê.
rsync -rlt --delete --chmod=D2750,F640 "$ARTIFACT_DIR/" "$DEPLOY_SSH_TARGET:$release_dir/"

# `ln -sfn` + `mv -T` troca o link de uma vez: não há instante sem `current`.
# O processo que está rodando não percebe — o Node já resolveu os caminhos reais.
step "Ativando o release $RELEASE"
# Re-executar o deploy do mesmo commit não sobrescreve o alvo do rollback com
# o próprio release.
ssh "$DEPLOY_SSH_TARGET" "set -e; cd '$DEPLOY_PATH'
  if [ -L current ] && [ \"\$(readlink current)\" != 'releases/$RELEASE' ]; then
    readlink current > previous_release
  fi
  ln -sfn 'releases/$RELEASE' current.next && mv -T current.next current
  ls -1dt releases/* | tail -n +$((keep_releases + 1)) | xargs -r rm -rf"

# --- 3. Reinício -------------------------------------------------------------

# A URL do webhook carrega a chave de acesso do painel: nunca vai para o log.
restart() { curl -fsS --max-time 30 -X POST "$DEPLOY_WEBHOOK_URL" > /dev/null; }

# Volta `current` para o release anterior. Não deixa o link apontando para um
# release não confirmado: o próximo reinício do painel o ativaria em silêncio.
rollback() {
  step "Voltando ao release anterior (rollback)"
  ssh "$DEPLOY_SSH_TARGET" "set -e; cd '$DEPLOY_PATH'
    [ -s previous_release ] || { echo 'Sem release anterior para voltar.' >&2; exit 1; }
    ln -sfn \"\$(cat previous_release)\" current.next && mv -T current.next current" ||
    fail "$1 Não há release anterior para voltar."
}

step "Reiniciando o processo pelo webhook do painel"
if ! restart; then
  rollback "o webhook do painel não respondeu."
  fail "o webhook do painel não respondeu; o link voltou para o release anterior, e o processo no ar não foi reiniciado."
fi

# --- 4. Confirmação ----------------------------------------------------------

step "Esperando o endpoint de saúde responder $RELEASE"
deadline=$(($(date +%s) + health_timeout))
while true; do
  body=$(curl -fsS --max-time 5 "$HEALTH_URL" 2>/dev/null || true)
  if node -e '
    try {
      const health = JSON.parse(process.argv[1]);
      process.exit(health.status === "ok" && health.version === process.argv[2] ? 0 : 1);
    } catch { process.exit(1); }
  ' "$body" "$RELEASE"; then
    step "Release $RELEASE no ar."
    exit 0
  fi
  [ "$(date +%s)" -ge "$deadline" ] && break
  sleep "$health_interval"
done

step "O release $RELEASE não respondeu em ${health_timeout}s."
rollback "o release $RELEASE não subiu."
restart || fail "o release $RELEASE não subiu; o link voltou para o release anterior, mas o webhook não respondeu ao reiniciar."
fail "o release $RELEASE não subiu; o link voltou para o release anterior e o processo foi reiniciado. As migrations já aplicadas permanecem."
