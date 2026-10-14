-- Linha de plataforma (`tenant_id` nulo) só existe fora de empresa: sem empresa
-- ativa, a policy enxerga e aceita só ela; com empresa, só as da empresa. Sem
-- isto, o `crm_app` não conseguiria gravar a auditoria do CLI de super admin, e
-- gravá-la sob uma empresa revelaria a flag a quem lê o histórico dela.
ALTER POLICY "tenant_isolation" ON "audit_log" TO public USING (tenant_id is not distinct from nullif(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK (tenant_id is not distinct from nullif(current_setting('app.tenant_id', true), '')::uuid);