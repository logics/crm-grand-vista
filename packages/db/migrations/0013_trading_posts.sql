CREATE TABLE "trading_post_municipalities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"trading_post_id" uuid NOT NULL,
	"municipality_ibge_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trading_post_municipalities_tenant_id_municipality_unique" UNIQUE("tenant_id","municipality_ibge_code")
);
--> statement-breakpoint
ALTER TABLE "trading_post_municipalities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "trading_posts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trading_posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "trading_post_municipalities" ADD CONSTRAINT "trading_post_municipalities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_post_municipalities" ADD CONSTRAINT "trading_post_municipalities_trading_post_id_trading_posts_id_fk" FOREIGN KEY ("trading_post_id") REFERENCES "public"."trading_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_post_municipalities" ADD CONSTRAINT "trading_post_municipalities_municipality_ibge_code_municipalities_ibge_code_fk" FOREIGN KEY ("municipality_ibge_code") REFERENCES "public"."municipalities"("ibge_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_posts" ADD CONSTRAINT "trading_posts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trading_posts_tenant_id_name_unique" ON "trading_posts" USING btree ("tenant_id",normalize_vocabulary_name("name"));--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "trading_post_municipalities" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "trading_posts" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
-- Acrescentado à mão: o Drizzle não gera FORCE nem grants.
ALTER TABLE "trading_posts" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "trading_post_municipalities" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "trading_posts" TO crm_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "trading_post_municipalities" TO crm_app;
