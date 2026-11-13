CREATE TABLE "farm_aptitudes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"farm_id" uuid NOT NULL,
	"aptitude_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "farm_aptitudes_farm_id_aptitude_id_unique" UNIQUE("farm_id","aptitude_id")
);
--> statement-breakpoint
ALTER TABLE "farm_aptitudes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "farm_crops" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"farm_id" uuid NOT NULL,
	"crop_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "farm_crops_farm_id_crop_id_unique" UNIQUE("farm_id","crop_id")
);
--> statement-breakpoint
ALTER TABLE "farm_crops" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "farm_aptitudes" ADD CONSTRAINT "farm_aptitudes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_aptitudes" ADD CONSTRAINT "farm_aptitudes_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_aptitudes" ADD CONSTRAINT "farm_aptitudes_aptitude_id_aptitudes_id_fk" FOREIGN KEY ("aptitude_id") REFERENCES "public"."aptitudes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_crops" ADD CONSTRAINT "farm_crops_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_crops" ADD CONSTRAINT "farm_crops_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farm_crops" ADD CONSTRAINT "farm_crops_crop_id_crops_id_fk" FOREIGN KEY ("crop_id") REFERENCES "public"."crops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "farm_aptitudes_tenant_id_aptitude_id_idx" ON "farm_aptitudes" USING btree ("tenant_id","aptitude_id");--> statement-breakpoint
CREATE INDEX "farm_crops_tenant_id_crop_id_idx" ON "farm_crops" USING btree ("tenant_id","crop_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "farm_aptitudes" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "farm_crops" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
-- Acrescentado à mão: o Drizzle não gera FORCE nem grants.
ALTER TABLE "farm_aptitudes" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "farm_crops" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "farm_aptitudes" TO crm_app;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "farm_crops" TO crm_app;
