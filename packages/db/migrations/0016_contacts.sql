CREATE TABLE "contact_roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contact_roles_contact_id_role_unique" UNIQUE("contact_id","role"),
	CONSTRAINT "contact_roles_role_check" CHECK ("contact_roles"."role" in ('buyer', 'owner', 'external_broker'))
);
--> statement-breakpoint
ALTER TABLE "contact_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"person_type" text NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"tax_id" text,
	"email" text,
	"phone" text,
	"whatsapp" text,
	"classification_id" uuid,
	"lead_source_id" uuid,
	"relationship_origin" text,
	"strategic_notes" text,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_person_type_check" CHECK ("contacts"."person_type" in ('pf', 'pj'))
);
--> statement-breakpoint
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contact_roles" ADD CONSTRAINT "contact_roles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_roles" ADD CONSTRAINT "contact_roles_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_classification_id_contact_classifications_id_fk" FOREIGN KEY ("classification_id") REFERENCES "public"."contact_classifications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_lead_source_id_lead_sources_id_fk" FOREIGN KEY ("lead_source_id") REFERENCES "public"."lead_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_tenant_id_tax_id_unique" ON "contacts" USING btree ("tenant_id","tax_id") WHERE "contacts"."tax_id" is not null;--> statement-breakpoint
CREATE INDEX "contacts_tenant_id_name_idx" ON "contacts" USING btree ("tenant_id","name" collate "pt-BR-x-icu");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "contact_roles" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "contacts" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
-- Acrescentado à mão: o Drizzle não gera FORCE nem grants.
ALTER TABLE "contacts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "contact_roles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "contacts" TO crm_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "contact_roles" TO crm_app;
