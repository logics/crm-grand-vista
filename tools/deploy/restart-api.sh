#!/bin/bash
# Reinício da API em produção. Não roda daqui: o conteúdo vai colado na aba
# Script do projeto CRMGrandVistaAPI no aaPanel, ligada ao webhook que
# `deploy-api.sh` chama depois de trocar o link `current` (docs/deploy.md).
# Fica versionado para sobreviver a uma troca de servidor.
#
# O painel o executa como root. O PM2 da API é do usuário crmgv
# (PM2_HOME=/home/crmgv/.pm2), que o usuário de deploy não alcança — por isso
# o reinício passa pelo painel e não pelo SSH do deploy.
#
# delete + start, e não `pm2 restart`: o PM2 guarda o diretório de trabalho já
# resolvido (releases/<commit>), e um restart seguiria no release antigo até
# ele ser apagado pela limpeza dos 5 últimos. Subir de novo de dentro de
# `current` lê o release recém-ativado.
set -eu

APP_DIR=/www/wwwroot/api.crmgv.logics.com.br
NODE_BIN=/www/server/nodejs/v22.18.0/bin
NAME=CRMGrandVistaAPI

pm2_as_app() {
  sudo -u crmgv env HOME=/home/crmgv PM2_HOME=/home/crmgv/.pm2 PATH="$NODE_BIN:/usr/bin:/bin" \
    "$NODE_BIN/pm2" "$@"
}

cd "$APP_DIR/current"
pm2_as_app delete "$NAME" > /dev/null 2>&1 || true
pm2_as_app start "$APP_DIR/current/dist/index.js" --name "$NAME"
