-- Acrescentado à mão: o Drizzle não gera funções. Nome de cadastro auxiliar sem
-- caixa nem acento, para o índice de unicidade: o `unaccent` não é imutável e
-- não entra em índice, então esta função o envolve fixando o dicionário.
CREATE FUNCTION normalize_vocabulary_name(value text) RETURNS text
	LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
	RETURN lower(public.unaccent('public.unaccent'::regdictionary, value));--> statement-breakpoint
CREATE TABLE "crops" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crops" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "crops" ADD CONSTRAINT "crops_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crops_tenant_id_name_unique" ON "crops" USING btree ("tenant_id",normalize_vocabulary_name("name"));--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "crops" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
-- Acrescentado à mão: o Drizzle não gera FORCE nem grants.
ALTER TABLE "crops" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "crops" TO crm_app;
