-- Escrita à mão: concede `contatos.ver_dados_financeiros` aos perfis de acesso
-- SEMEADOS Admin e Gestor das empresas que já existiam. As empresas novas a
-- recebem pela regra do `tenant:provision` sobre o catálogo (Admin: tudo;
-- Gestor: tudo menos `perfis_de_acesso`); o Corretor não a recebe.
--
-- A sincronização do catálogo roda DEPOIS das migrations, e num banco zerado a
-- permissão ainda não existe: por isso a migration a insere (a descrição é a do
-- catálogo em `@crm/shared`; se divergir, a sincronização a atualiza). Não passa
-- pelo wrapper de auditoria.
--
-- Perfil semeado que a empresa renomeou não casa com o nome e não recebe: foi
-- decisão dela. As tabelas estão sob RLS forçada, que vale também para o
-- `crm_owner`: a empresa ativa é aplicada a cada volta do laço. Idempotente: a
-- permissão e o vínculo usam `ON CONFLICT DO NOTHING`.
INSERT INTO "permissions" ("code", "module", "action", "scope", "description")
VALUES (
	'contatos.ver_dados_financeiros',
	'contatos',
	'ver_dados_financeiros',
	'tenant',
	'Ver e editar o patrimônio estimado e a capacidade de investimento dos compradores'
)
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
DO $$
DECLARE
	tenant record;
BEGIN
	FOR tenant IN SELECT "id" FROM "tenants" LOOP
		PERFORM set_config('app.tenant_id', tenant."id"::text, true);

		INSERT INTO "profile_permissions" ("tenant_id", "profile_id", "permission_code")
		SELECT tenant."id", profile."id", 'contatos.ver_dados_financeiros'
		FROM "access_profiles" AS profile
		WHERE profile."is_seeded" AND profile."name" IN ('Admin', 'Gestor')
		ON CONFLICT DO NOTHING;
	END LOOP;

	PERFORM set_config('app.tenant_id', '', true);
END $$;
