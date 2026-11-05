-- Escrito à mão: semente das empresas que já existiam. As novas recebem a mesma
-- semente no `tenant:provision`; a constante `TENANT_SEED` de `@crm/shared` é a
-- fonte das duas, e `test/tenant-seed-migration.test.ts` confere que os valores
-- aqui são exatamente os dela. Não passa pelo wrapper de auditoria.
--
-- As tabelas estão sob RLS forçada, que vale também para o `crm_owner`: a
-- empresa ativa é aplicada a cada volta do laço. `ON CONFLICT DO NOTHING` poupa o
-- que a empresa já tenha cadastrado com o mesmo nome (ou os parâmetros que já tenha).
DO $$
DECLARE
	tenant record;
BEGIN
	FOR tenant IN SELECT "id" FROM "tenants" LOOP
		PERFORM set_config('app.tenant_id', tenant."id"::text, true);

		INSERT INTO "commercial_statuses" ("id", "tenant_id", "name", "system_meaning", "display_order")
		SELECT uuidv7(), tenant."id", seed."name", seed."system_meaning", seed."display_order"
		FROM (VALUES
			('Disponível', 'available', 0),
			('Em negociação', 'negotiating', 1),
			('Vendida', 'sold', 2),
			('Suspensa', 'suspended', 3)
		) AS seed("name", "system_meaning", "display_order")
		ON CONFLICT DO NOTHING;

		INSERT INTO "document_categories" ("id", "tenant_id", "name")
		SELECT uuidv7(), tenant."id", seed."name"
		FROM (VALUES
			('CAR'),
			('CCIR'),
			('Contratos'),
			('Georreferenciamento'),
			('Laudos'),
			('Licenças'),
			('Mapas'),
			('Matrículas')
		) AS seed("name")
		ON CONFLICT DO NOTHING;

		INSERT INTO "crops" ("id", "tenant_id", "name")
		SELECT uuidv7(), tenant."id", seed."name"
		FROM (VALUES
			('Algodão'),
			('Café'),
			('Cana-de-açúcar'),
			('Milho'),
			('Pecuária'),
			('Soja')
		) AS seed("name")
		ON CONFLICT DO NOTHING;

		INSERT INTO "tenant_settings" ("id", "tenant_id")
		VALUES (uuidv7(), tenant."id")
		ON CONFLICT DO NOTHING;
	END LOOP;

	PERFORM set_config('app.tenant_id', '', true);
END $$;
