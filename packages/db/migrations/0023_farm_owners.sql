CREATE TABLE "farm_owners" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"farm_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"is_primary" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "farm_owners_farm_id_contact_id_unique" UNIQUE("farm_id","contact_id")
);
--> statement-breakpoint
ALTER TABLE "farm_owners" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "farm_owners" ADD CONSTRAINT "farm_owners_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_owners" ADD CONSTRAINT "farm_owners_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_owners" ADD CONSTRAINT "farm_owners_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "farm_owners_farm_id_primary_unique" ON "farm_owners" USING btree ("farm_id") WHERE "farm_owners"."is_primary";--> statement-breakpoint
CREATE INDEX "farm_owners_tenant_id_contact_id_idx" ON "farm_owners" USING btree ("tenant_id","contact_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "farm_owners" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
-- Acrescentado à mão: o Drizzle não gera FORCE nem grants.
ALTER TABLE "farm_owners" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "farm_owners" TO crm_app;
