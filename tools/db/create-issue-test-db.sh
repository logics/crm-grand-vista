#!/usr/bin/env bash
# Cria (ou reforça) o banco de teste de uma issue: crm_<n>_test.
#
# Uso: tools/db/create-issue-test-db.sh <n>      # ex.: 124 -> crm_124_test
#
# Cada issue testa no seu banco, para que suítes de issues diferentes, rodando
# ao mesmo tempo no mesmo Postgres, não se zerem umas às outras. O sufixo
# `_test` é exigido pela trava de `packages/db/test/support/reset-database.ts`.
#
# Conexão, só pelo ambiente (nenhum valor fica no código; a senha nunca é impressa):
#   SUPERUSER_DATABASE_URL   postgres://usuário:senha@host:porta/qualquer-banco
#   ou PGHOST, PGPORT, PGUSER, PGPASSWORD (padrões do libpq)
# O usuário precisa poder criar bancos e conceder privilégios (superusuário).
# O banco informado na URL é ignorado: o script conecta em `postgres`.
#
# Idempotente: se o banco não existe, cria com dono crm_owner e aplica
# packages/db/sql/public-schema.sql (como o init do container). Se existe, só
# reforça REVOKE/GRANT — nunca apaga o banco nem seus dados. O ACL é o mesmo de
# docker/postgres/init.sh; `roles.integration.test.ts` falha para banco de dono
# crm_owner com ACL padrão (CONNECT para PUBLIC).
set -euo pipefail

if [ "$#" -ne 1 ] || ! [[ "$1" =~ ^[0-9]+$ ]]; then
  echo "Uso: $0 <número-da-issue>   (ex.: $0 124 cria crm_124_test)" >&2
  exit 2
fi

database="crm_${1}_test"
schema_sql="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/packages/db/sql/public-schema.sql"

# Com a URL, tira o banco do caminho (query string preservada) e escolhe o
# banco por PGDATABASE, que vale quando a URL não traz um.
conninfo=()
if [ -n "${SUPERUSER_DATABASE_URL:-}" ]; then
  base="${SUPERUSER_DATABASE_URL%%\?*}"
  query=""
  [ "$base" != "$SUPERUSER_DATABASE_URL" ] && query="?${SUPERUSER_DATABASE_URL#*\?}"
  conninfo=("$(printf '%s' "$base" | sed -E 's#^([A-Za-z]+://[^/]*)/.*$#\1#')${query}")
fi

run_psql() { # run_psql <banco> [args do psql]
  local db="$1"; shift
  PGDATABASE="$db" psql -X -v ON_ERROR_STOP=1 -q "$@" ${conninfo[@]+"${conninfo[0]}"}
}

# `-c` não interpola variáveis do psql; o SQL entra por stdin.
exists="$(run_psql postgres -tA -v "db=$database" <<< "select 1 from pg_database where datname = :'db'")"

if [ "$exists" = "1" ]; then
  echo "Banco $database já existe: reforçando o ACL, sem tocar nos dados."
else
  run_psql postgres -c "CREATE DATABASE \"$database\" OWNER crm_owner"
  echo "Banco $database criado."
fi

run_psql postgres <<SQL
  -- O Postgres concede CONNECT a PUBLIC por padrão.
  REVOKE ALL ON DATABASE "$database" FROM PUBLIC;
  GRANT CONNECT, TEMPORARY ON DATABASE "$database" TO crm_owner;
  GRANT CONNECT ON DATABASE "$database" TO crm_app;
SQL

if [ "$exists" != "1" ]; then
  run_psql "$database" -f "$schema_sql"
fi
echo "Pronto: $database."
