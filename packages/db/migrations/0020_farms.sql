CREATE TABLE "farms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"municipality_ibge_code" text NOT NULL,
	"responsible_user_id" uuid NOT NULL,
	"trading_post_id" uuid,
	"total_area_ha" numeric(12, 4) NOT NULL,
	"usable_area_ha" numeric(12, 4),
	"commercial_status_id" uuid NOT NULL,
	"sales_potential" text,
	"priority" text,
	"water_availability" text,
	"irrigation_potential" text,
	"productive_potential" text,
	"soil" text,
	"topography" text,
	"water" text,
	"historical_productivity" text,
	"infrastructure" text,
	"technical_summary" text,
	"differentials" text,
	"distance_to_highway_km" numeric(8, 2),
	"distance_to_warehouse_km" numeric(8, 2),
	"document_status" text,
	"document_notes" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"pricing_mode" text,
	"asking_price" numeric(16, 2),
	"valuation_bags" numeric(14, 4),
	"valuation_bags_unit" text,
	"valuation_bags_alqueire_type" text,
	"valuation_crop_id" uuid,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "farms_total_area_ha_check" CHECK ("farms"."total_area_ha" > 0),
	CONSTRAINT "farms_usable_area_ha_check" CHECK ("farms"."usable_area_ha" is null or ("farms"."usable_area_ha" > 0 and "farms"."usable_area_ha" <= "farms"."total_area_ha")),
	CONSTRAINT "farms_sales_potential_check" CHECK ("farms"."sales_potential" in ('high', 'medium', 'low')),
	CONSTRAINT "farms_priority_check" CHECK ("farms"."priority" in ('high', 'medium', 'low')),
	CONSTRAINT "farms_water_availability_check" CHECK ("farms"."water_availability" in ('high', 'medium', 'low')),
	CONSTRAINT "farms_irrigation_potential_check" CHECK ("farms"."irrigation_potential" in ('high', 'medium', 'low')),
	CONSTRAINT "farms_productive_potential_check" CHECK ("farms"."productive_potential" in ('high', 'medium', 'low')),
	CONSTRAINT "farms_distance_to_highway_km_check" CHECK ("farms"."distance_to_highway_km" >= 0),
	CONSTRAINT "farms_distance_to_warehouse_km_check" CHECK ("farms"."distance_to_warehouse_km" >= 0),
	CONSTRAINT "farms_document_status_check" CHECK ("farms"."document_status" in ('regular', 'pending', 'irregular')),
	CONSTRAINT "farms_coordinates_check" CHECK (("farms"."latitude" is null) = ("farms"."longitude" is null) and ("farms"."latitude" is null or ("farms"."latitude" between -90 and 90 and "farms"."longitude" between -180 and 180))),
	CONSTRAINT "farms_pricing_mode_check" CHECK ("farms"."pricing_mode" in ('brl', 'bags')),
	CONSTRAINT "farms_asking_price_check" CHECK ("farms"."asking_price" > 0),
	CONSTRAINT "farms_valuation_bags_check" CHECK ("farms"."valuation_bags" > 0),
	CONSTRAINT "farms_valuation_bags_unit_check" CHECK ("farms"."valuation_bags_unit" in ('per_hectare', 'per_alqueire')),
	CONSTRAINT "farms_valuation_bags_alqueire_type_check" CHECK ("farms"."valuation_bags_alqueire_type" in ('goiano', 'paulista', 'norte')),
	CONSTRAINT "farms_pricing_check" CHECK ((
        "farms"."pricing_mode" is null
        and "farms"."asking_price" is null and "farms"."valuation_bags" is null and "farms"."valuation_bags_unit" is null
        and "farms"."valuation_bags_alqueire_type" is null and "farms"."valuation_crop_id" is null
      ) or (
        "farms"."pricing_mode" = 'brl'
        and "farms"."asking_price" is not null and "farms"."valuation_bags" is null and "farms"."valuation_bags_unit" is null
        and "farms"."valuation_bags_alqueire_type" is null and "farms"."valuation_crop_id" is null
      ) or (
        "farms"."pricing_mode" = 'bags'
        and "farms"."asking_price" is null and "farms"."valuation_bags" is not null and "farms"."valuation_bags_unit" is not null
        and "farms"."valuation_crop_id" is not null
        and (("farms"."valuation_bags_unit" = 'per_alqueire') = ("farms"."valuation_bags_alqueire_type" is not null))
      ))
);
--> statement-breakpoint
ALTER TABLE "farms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_municipality_ibge_code_municipalities_ibge_code_fk" FOREIGN KEY ("municipality_ibge_code") REFERENCES "public"."municipalities"("ibge_code") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_responsible_user_id_users_id_fk" FOREIGN KEY ("responsible_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_trading_post_id_trading_posts_id_fk" FOREIGN KEY ("trading_post_id") REFERENCES "public"."trading_posts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_commercial_status_id_commercial_statuses_id_fk" FOREIGN KEY ("commercial_status_id") REFERENCES "public"."commercial_statuses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_valuation_crop_id_crops_id_fk" FOREIGN KEY ("valuation_crop_id") REFERENCES "public"."crops"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "farms_tenant_id_responsible_user_id_idx" ON "farms" USING btree ("tenant_id","responsible_user_id");--> statement-breakpoint
CREATE INDEX "farms_tenant_id_commercial_status_id_idx" ON "farms" USING btree ("tenant_id","commercial_status_id");--> statement-breakpoint
CREATE INDEX "farms_tenant_id_municipality_ibge_code_idx" ON "farms" USING btree ("tenant_id","municipality_ibge_code");--> statement-breakpoint
CREATE INDEX "farms_tenant_id_created_at_idx" ON "farms" USING btree ("tenant_id","created_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "farms" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);--> statement-breakpoint
-- Acrescentado à mão: o Drizzle não gera FORCE nem grants.
ALTER TABLE "farms" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "farms" TO crm_app;
