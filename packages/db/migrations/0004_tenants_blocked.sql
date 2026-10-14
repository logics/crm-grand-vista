-- Empresa bloqueada (assinatura não paga) substitui empresa inativa: o sentido
-- inverte, e o valor de cada empresa é preservado antes de a coluna sair.
ALTER TABLE "tenants" ADD COLUMN "blocked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "tenants" SET "blocked" = NOT "active";--> statement-breakpoint
ALTER TABLE "tenants" DROP COLUMN "active";
