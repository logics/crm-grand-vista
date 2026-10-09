#!/usr/bin/env bash
# Inicialização do container de desenvolvimento/CI. Replica o que existe em
# produção: os dois papéis do database, com os mesmos atributos e grants.
#
# Sem isto, os testes de isolamento rodariam como dono do schema — o Postgres
# não aplica RLS ao dono nem a superusuário — e passariam sem provar nada.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-SQL
  -- Dono do schema; roda as migrations. Nunca usado pela aplicação.
  CREATE ROLE crm_owner LOGIN PASSWORD '${CRM_OWNER_PASSWORD}'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

  -- Papel da aplicação: sem superusuário, sem BYPASSRLS, sem posse de tabela.
  CREATE ROLE crm_app LOGIN PASSWORD '${CRM_APP_PASSWORD}'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
SQL

# Banco de desenvolvimento e database de teste: rodar a suíte não apaga o que está na tela.
for database in crm_dev crm_test; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-SQL
    CREATE DATABASE ${database} OWNER crm_owner;
    -- O Postgres concede CONNECT a PUBLIC por padrão; em produção a instância é
    -- compartilhada, e o papel de outra aplicação conseguiria enumerar o schema.
    REVOKE ALL ON DATABASE ${database} FROM PUBLIC;
    GRANT CONNECT, TEMPORARY ON DATABASE ${database} TO crm_owner;
    GRANT CONNECT ON DATABASE ${database} TO crm_app;
SQL
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$database" \
    -f /crm/public-schema.sql
done
