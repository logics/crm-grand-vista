#!/usr/bin/env bash
# Monta o artefato de produção da API a partir do workspace já compilado
# (`pnpm build`): `dist/` da API, os pacotes do workspace de que ela depende
# (só `dist/` e, do `@crm/db`, as migrations) e as dependências de produção.
# O servidor recebe isto pronto; nada é instalado nem compilado lá.
#
#   tools/deploy/build-api-artifact.sh <diretório de saída> <versão>
set -euo pipefail

out=${1:?informe o diretório de saída}
version=${2:?informe a versão (o commit publicado)}
root=$(cd "$(dirname "$0")/../.." && pwd)

rm -rf "$out"
# Sem `auto-install-peers` e sem resolver peer pela raiz do workspace: os peers
# opcionais do Better Auth (vitest, drizzle-kit, react…) existem no workspace
# como dependência de desenvolvimento e entrariam no artefato.
pnpm --dir "$root" --filter @crm/api deploy --prod --legacy \
  --config.auto-install-peers=false \
  --config.resolve-peers-from-workspace-root=false \
  "$out"

# Lido pelo endpoint de saúde (`apps/api/src/release.ts`): é como o deploy
# confirma que o processo no ar é o que acabou de enviar.
printf '{"version":"%s"}\n' "$version" > "$out/release.json"

node "$root/tools/deploy/check-api-artifact.ts" "$out"
