-- Estado do schema `public` que a aplicação espera encontrar. Executado em dois
-- momentos, e por isso num arquivo só:
--   * pelo init do container (como superusuário), em cada banco criado;
--   * pelo setup da suíte de integração (como crm_owner), depois de zerar o
--     banco de teste.
-- Grants por tabela não ficam aqui: são das migrations, junto da tabela.

CREATE SCHEMA IF NOT EXISTS public;

-- crm_owner é dono do schema e roda as migrations.
ALTER SCHEMA public OWNER TO crm_owner;

-- A instância é compartilhada com outros projetos: nenhum outro papel enxerga o schema.
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- crm_app usa o schema, mas não cria nada nele: não pode ser dono de tabela.
GRANT USAGE ON SCHEMA public TO crm_app;
