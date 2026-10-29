CREATE TABLE "municipalities" (
	"ibge_code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"uf" char(2) NOT NULL,
	"region" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "municipalities_region_check" CHECK ("municipalities"."region" in ('Norte','Nordeste','Centro-Oeste','Sudeste','Sul'))
);
--> statement-breakpoint
-- Acrescentado à mão: o Drizzle não gera grants. Dado de referência, só leitura para a aplicação.
GRANT SELECT ON "municipalities" TO crm_app;
