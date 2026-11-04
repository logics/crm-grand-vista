CREATE TABLE "commercial_statuses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"system_meaning" text NOT NULL,
	CONSTRAINT "commercial_statuses_system_meaning_check" CHECK ("commercial_statuses"."system_meaning" in ('available', 'negotiating', 'sold', 'suspended'))
);
--> statement-breakpoint
ALTER TABLE "commercial_statuses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "commercial_statuses" ADD CONSTRAINT "commercial_statuses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_statuses_tenant_id_name_unique" ON "commercial_statuses" USING btree ("tenant_id",normalize_vocabulary_name("name"));--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "commercial_statuses" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
-- Acrescentado à mão: o Drizzle não gera FORCE nem grants.
ALTER TABLE "commercial_statuses" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "commercial_statuses" TO crm_app;
