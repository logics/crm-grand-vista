CREATE TABLE "aptitudes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aptitudes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "contact_classifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_classifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "document_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lead_sources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_methods" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "purchase_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "purchase_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "aptitudes" ADD CONSTRAINT "aptitudes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_classifications" ADD CONSTRAINT "contact_classifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_sources" ADD CONSTRAINT "lead_sources_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_profiles" ADD CONSTRAINT "purchase_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "aptitudes_tenant_id_name_unique" ON "aptitudes" USING btree ("tenant_id",normalize_vocabulary_name("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "contact_classifications_tenant_id_name_unique" ON "contact_classifications" USING btree ("tenant_id",normalize_vocabulary_name("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "document_categories_tenant_id_name_unique" ON "document_categories" USING btree ("tenant_id",normalize_vocabulary_name("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "lead_sources_tenant_id_name_unique" ON "lead_sources" USING btree ("tenant_id",normalize_vocabulary_name("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_tenant_id_name_unique" ON "payment_methods" USING btree ("tenant_id",normalize_vocabulary_name("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_profiles_tenant_id_name_unique" ON "purchase_profiles" USING btree ("tenant_id",normalize_vocabulary_name("name"));--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "aptitudes" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "contact_classifications" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "document_categories" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "lead_sources" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "payment_methods" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "purchase_profiles" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
-- Acrescentado à mão: o Drizzle não gera FORCE nem grants.
ALTER TABLE "aptitudes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "aptitudes" TO crm_app;
--> statement-breakpoint
ALTER TABLE "contact_classifications" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "contact_classifications" TO crm_app;
--> statement-breakpoint
ALTER TABLE "document_categories" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "document_categories" TO crm_app;
--> statement-breakpoint
ALTER TABLE "lead_sources" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "lead_sources" TO crm_app;
--> statement-breakpoint
ALTER TABLE "payment_methods" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "payment_methods" TO crm_app;
--> statement-breakpoint
ALTER TABLE "purchase_profiles" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "purchase_profiles" TO crm_app;
