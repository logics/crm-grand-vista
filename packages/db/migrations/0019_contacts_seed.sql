-- Escrito à mão: semente de contatos das empresas que já existiam. As novas
-- recebem a mesma semente no `tenant:provision`; a constante `TENANT_SEED` de
-- `@crm/shared` é a fonte das duas, e `test/contacts-seed-migration.test.ts`
-- confere que os valores aqui são exatamente os dela. Não passa pelo wrapper de
-- auditoria.
--
-- As tabelas estão sob RLS forçada, que vale também para o `crm_owner`: a
-- empresa ativa é aplicada a cada volta do laço. Só entra o nome que a empresa
-- ainda não tem, comparado sem caixa nem acento (a chave do índice único), para
-- não colidir com entrada que um admin já tenha criado à mão.
DO $$
DECLARE
	tenant record;
BEGIN
	FOR tenant IN SELECT "id" FROM "tenants" LOOP
		PERFORM set_config('app.tenant_id', tenant."id"::text, true);

		INSERT INTO "lead_sources" ("id", "tenant_id", "name")
		SELECT uuidv7(), tenant."id", seed."name"
		FROM (VALUES
			('Evento'),
			('Indicação'),
			('Instagram'),
			('Placa na fazenda'),
			('Site'),
			('WhatsApp')
		) AS seed("name")
		WHERE NOT EXISTS (
			SELECT 1 FROM "lead_sources" existing
			WHERE existing."tenant_id" = tenant."id"
				AND normalize_vocabulary_name(existing."name") = normalize_vocabulary_name(seed."name")
		);

		INSERT INTO "contact_classifications" ("id", "tenant_id", "name")
		SELECT uuidv7(), tenant."id", seed."name"
		FROM (VALUES
			('A'),
			('B'),
			('C')
		) AS seed("name")
		WHERE NOT EXISTS (
			SELECT 1 FROM "contact_classifications" existing
			WHERE existing."tenant_id" = tenant."id"
				AND normalize_vocabulary_name(existing."name") = normalize_vocabulary_name(seed."name")
		);
	END LOOP;

	PERFORM set_config('app.tenant_id', '', true);
END $$;
