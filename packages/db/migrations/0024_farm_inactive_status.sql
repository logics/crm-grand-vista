ALTER TABLE "commercial_statuses" DROP CONSTRAINT "commercial_statuses_system_meaning_check";--> statement-breakpoint
ALTER TABLE "commercial_statuses" ADD CONSTRAINT "commercial_statuses_system_meaning_check" CHECK ("commercial_statuses"."system_meaning" in ('available', 'negotiating', 'sold', 'suspended', 'inactive'));--> statement-breakpoint
-- Escrito à mão: semente da entrada "Desativada" (significado `inactive`) nas
-- empresas que já existiam. As novas a recebem no `tenant:provision`
-- (`TENANT_SEED`, de `@crm/shared`). Não passa pelo wrapper de auditoria.
--
-- As tabelas estão sob RLS forçada, que vale também para o `crm_owner`: a
-- empresa ativa é aplicada a cada volta do laço. Só entra se a empresa ainda
-- não tem entrada ativa com o significado. Se o nome "Desativada" já está
-- ocupado (comparado sem caixa nem acento, a chave do índice único), usa
-- "Fazenda desativada". Reexecutável: a segunda passada não encontra nada a fazer.
DO $$
DECLARE
	tenant record;
	chosen text;
BEGIN
	FOR tenant IN SELECT "id" FROM "tenants" LOOP
		PERFORM set_config('app.tenant_id', tenant."id"::text, true);

		IF NOT EXISTS (
			SELECT 1 FROM "commercial_statuses" existing
			WHERE existing."tenant_id" = tenant."id"
				AND existing."system_meaning" = 'inactive'
				AND existing."active"
		) THEN
			IF EXISTS (
				SELECT 1 FROM "commercial_statuses" existing
				WHERE existing."tenant_id" = tenant."id"
					AND normalize_text(existing."name") = normalize_text('Desativada')
			) THEN
				chosen := 'Fazenda desativada';
			ELSE
				chosen := 'Desativada';
			END IF;

			INSERT INTO "commercial_statuses" ("id", "tenant_id", "name", "system_meaning", "display_order")
			SELECT uuidv7(), tenant."id", chosen, 'inactive',
				COALESCE(MAX(existing."display_order"), -1) + 1
			FROM "commercial_statuses" existing
			WHERE existing."tenant_id" = tenant."id";
		END IF;
	END LOOP;

	PERFORM set_config('app.tenant_id', '', true);
END $$;
