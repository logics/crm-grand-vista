CREATE TABLE "referral_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"subject_contact_id" uuid,
	"subject_farm_id" uuid,
	"referrer_user_id" uuid,
	"referrer_contact_id" uuid,
	"position" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referral_links_subject_contact_position_unique" UNIQUE("tenant_id","subject_contact_id","position") DEFERRABLE INITIALLY DEFERRED,
	CONSTRAINT "referral_links_subject_farm_position_unique" UNIQUE("tenant_id","subject_farm_id","position") DEFERRABLE INITIALLY DEFERRED,
	CONSTRAINT "referral_links_subject_contact_id_referrer_contact_id_unique" UNIQUE("subject_contact_id","referrer_contact_id"),
	CONSTRAINT "referral_links_subject_contact_id_referrer_user_id_unique" UNIQUE("subject_contact_id","referrer_user_id"),
	CONSTRAINT "referral_links_subject_farm_id_referrer_contact_id_unique" UNIQUE("subject_farm_id","referrer_contact_id"),
	CONSTRAINT "referral_links_subject_farm_id_referrer_user_id_unique" UNIQUE("subject_farm_id","referrer_user_id"),
	CONSTRAINT "referral_links_one_subject_check" CHECK (num_nonnulls("referral_links"."subject_contact_id", "referral_links"."subject_farm_id") = 1),
	CONSTRAINT "referral_links_one_referrer_check" CHECK (num_nonnulls("referral_links"."referrer_user_id", "referral_links"."referrer_contact_id") = 1),
	CONSTRAINT "referral_links_position_check" CHECK ("referral_links"."position" between 1 and 10),
	CONSTRAINT "referral_links_notes_check" CHECK (char_length("referral_links"."notes") <= 500),
	CONSTRAINT "referral_links_not_self_check" CHECK ("referral_links"."subject_contact_id" is null or "referral_links"."referrer_contact_id" is null or "referral_links"."subject_contact_id" <> "referral_links"."referrer_contact_id")
);
--> statement-breakpoint
ALTER TABLE "referral_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_subject_contact_id_contacts_id_fk" FOREIGN KEY ("subject_contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_subject_farm_id_farms_id_fk" FOREIGN KEY ("subject_farm_id") REFERENCES "public"."farms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_referrer_contact_id_contacts_id_fk" FOREIGN KEY ("referrer_contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "referral_links_tenant_id_referrer_contact_id_idx" ON "referral_links" USING btree ("tenant_id","referrer_contact_id");--> statement-breakpoint
CREATE INDEX "referral_links_tenant_id_referrer_user_id_idx" ON "referral_links" USING btree ("tenant_id","referrer_user_id");--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "referral_links" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
--> statement-breakpoint
-- À mão: o Drizzle não gera FORCE nem grants.
ALTER TABLE "referral_links" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "referral_links" TO crm_app;
