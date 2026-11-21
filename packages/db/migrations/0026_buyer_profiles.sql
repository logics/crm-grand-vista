CREATE TABLE "buyer_crops" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"crop_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buyer_crops_contact_id_crop_id_unique" UNIQUE("contact_id","crop_id")
);
--> statement-breakpoint
ALTER TABLE "buyer_crops" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "buyer_payment_methods" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"payment_method_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buyer_payment_methods_contact_id_payment_method_id_unique" UNIQUE("contact_id","payment_method_id")
);
--> statement-breakpoint
ALTER TABLE "buyer_payment_methods" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "buyer_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"purchase_profile_id" uuid,
	"avg_ticket" numeric(16, 2),
	"max_ticket" numeric(16, 2),
	"min_area_ha" numeric(12, 4),
	"max_area_ha" numeric(12, 4),
	"estimated_net_worth" numeric(16, 2),
	"investment_capacity" numeric(16, 2),
	"urgency" text,
	"qualification_level" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buyer_profiles_contact_id_unique" UNIQUE("contact_id"),
	CONSTRAINT "buyer_profiles_avg_ticket_check" CHECK ("buyer_profiles"."avg_ticket" > 0),
	CONSTRAINT "buyer_profiles_max_ticket_check" CHECK ("buyer_profiles"."max_ticket" > 0),
	CONSTRAINT "buyer_profiles_min_area_ha_check" CHECK ("buyer_profiles"."min_area_ha" > 0),
	CONSTRAINT "buyer_profiles_max_area_ha_check" CHECK ("buyer_profiles"."max_area_ha" > 0),
	CONSTRAINT "buyer_profiles_estimated_net_worth_check" CHECK ("buyer_profiles"."estimated_net_worth" > 0),
	CONSTRAINT "buyer_profiles_investment_capacity_check" CHECK ("buyer_profiles"."investment_capacity" > 0),
	CONSTRAINT "buyer_profiles_ticket_order_check" CHECK ("buyer_profiles"."avg_ticket" <= "buyer_profiles"."max_ticket"),
	CONSTRAINT "buyer_profiles_area_order_check" CHECK ("buyer_profiles"."min_area_ha" <= "buyer_profiles"."max_area_ha"),
	CONSTRAINT "buyer_profiles_urgency_check" CHECK ("buyer_profiles"."urgency" in ('high', 'medium', 'low')),
	CONSTRAINT "buyer_profiles_qualification_level_check" CHECK ("buyer_profiles"."qualification_level" in ('cold', 'warm', 'hot', 'qualified'))
);
--> statement-breakpoint
ALTER TABLE "buyer_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "buyer_regions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"municipality_ibge_code" text,
	"uf" char(2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buyer_regions_uf_check" CHECK ("buyer_regions"."uf" in ('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO')),
	CONSTRAINT "buyer_regions_municipality_or_uf_check" CHECK (num_nonnulls("buyer_regions"."municipality_ibge_code", "buyer_regions"."uf") = 1)
);
--> statement-breakpoint
ALTER TABLE "buyer_regions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "buyer_crops" ADD CONSTRAINT "buyer_crops_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_crops" ADD CONSTRAINT "buyer_crops_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_crops" ADD CONSTRAINT "buyer_crops_crop_id_crops_id_fk" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_payment_methods" ADD CONSTRAINT "buyer_payment_methods_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_payment_methods" ADD CONSTRAINT "buyer_payment_methods_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_payment_methods" ADD CONSTRAINT "buyer_payment_methods_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD CONSTRAINT "buyer_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD CONSTRAINT "buyer_profiles_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD CONSTRAINT "buyer_profiles_purchase_profile_id_purchase_profiles_id_fk" FOREIGN KEY ("purchase_profile_id") REFERENCES "public"."purchase_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_regions" ADD CONSTRAINT "buyer_regions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_regions" ADD CONSTRAINT "buyer_regions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_regions" ADD CONSTRAINT "buyer_regions_municipality_ibge_code_municipalities_ibge_code_fk" FOREIGN KEY ("municipality_ibge_code") REFERENCES "public"."municipalities"("ibge_code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "buyer_crops_tenant_id_crop_id_idx" ON "buyer_crops" USING btree ("tenant_id","crop_id");--> statement-breakpoint
CREATE INDEX "buyer_payment_methods_tenant_id_payment_method_id_idx" ON "buyer_payment_methods" USING btree ("tenant_id","payment_method_id");--> statement-breakpoint
CREATE INDEX "buyer_profiles_tenant_id_purchase_profile_id_idx" ON "buyer_profiles" USING btree ("tenant_id","purchase_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "buyer_regions_contact_id_municipality_unique" ON "buyer_regions" USING btree ("contact_id","municipality_ibge_code") WHERE "buyer_regions"."municipality_ibge_code" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "buyer_regions_contact_id_uf_unique" ON "buyer_regions" USING btree ("contact_id","uf") WHERE "buyer_regions"."uf" is not null;--> statement-breakpoint
CREATE INDEX "buyer_regions_tenant_id_municipality_ibge_code_idx" ON "buyer_regions" USING btree ("tenant_id","municipality_ibge_code");--> statement-breakpoint
CREATE INDEX "buyer_regions_tenant_id_uf_idx" ON "buyer_regions" USING btree ("tenant_id","uf");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "buyer_crops" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "buyer_payment_methods" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "buyer_profiles" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "buyer_regions" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
-- Acrescentado à mão: o Drizzle não gera FORCE nem grants.
ALTER TABLE "buyer_profiles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "buyer_regions" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "buyer_crops" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "buyer_payment_methods" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "buyer_profiles" TO crm_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "buyer_regions" TO crm_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "buyer_crops" TO crm_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "buyer_payment_methods" TO crm_app;--> statement-breakpoint
-- Semente escrita à mão das empresas que já existiam (Perfis de compra e Formas
-- de pagamento). As novas recebem a mesma semente no `tenant:provision`; a
-- constante `TENANT_SEED` de `@crm/shared` é a fonte das duas, e
-- `test/buyer-profiles-seed-migration.test.ts` confere que os valores aqui são
-- exatamente os dela. Não passa pelo wrapper de auditoria.
--
-- As tabelas estão sob RLS forçada, que vale também para o `crm_owner`: a empresa
-- ativa é aplicada a cada volta do laço. `ON CONFLICT DO NOTHING` age sobre o
-- índice único do nome (`normalize_text`, sem caixa nem acento): poupa a entrada
-- que um admin criou à mão e a semente aplicada antes.
DO $$
DECLARE
	tenant record;
BEGIN
	FOR tenant IN SELECT "id" FROM "tenants" LOOP
		PERFORM set_config('app.tenant_id', tenant."id"::text, true);

		INSERT INTO "purchase_profiles" ("id", "tenant_id", "name")
		SELECT uuidv7(), tenant."id", seed."name"
		FROM (VALUES
			('Especulador'),
			('Investidor'),
			('Produtor')
		) AS seed("name")
		ON CONFLICT DO NOTHING;

		INSERT INTO "payment_methods" ("id", "tenant_id", "name")
		SELECT uuidv7(), tenant."id", seed."name"
		FROM (VALUES
			('À vista'),
			('Financiamento'),
			('Parcelado'),
			('Permuta')
		) AS seed("name")
		ON CONFLICT DO NOTHING;
	END LOOP;

	PERFORM set_config('app.tenant_id', '', true);
END $$;
