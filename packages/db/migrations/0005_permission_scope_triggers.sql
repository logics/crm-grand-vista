-- Escrita à mão: o Drizzle não gera função nem trigger.
--
-- Perfil de acesso pertence a uma empresa e não pode conceder poder sobre outra:
-- `profile_permissions` só aceita permissão de escopo `tenant`. Simetricamente,
-- `user_platform_permissions` só aceita escopo `platform`. A regra atravessa duas
-- tabelas, então nenhum CHECK de coluna a expressa — e validar só na aplicação
-- deixaria a porta aberta para qualquer escrita que não passe por ela.
--
-- Um trigger só, parametrizado pelo escopo que a tabela aceita. Permissão
-- inexistente passa daqui e cai na FK, que dá o erro certo para o caso.
CREATE FUNCTION "enforce_permission_scope"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  permission_scope text;
BEGIN
  SELECT scope INTO permission_scope FROM public.permissions WHERE code = NEW.permission_code;
  IF permission_scope IS DISTINCT FROM TG_ARGV[0] AND permission_scope IS NOT NULL THEN
    RAISE EXCEPTION 'A permissão "%" tem escopo "%"; % só aceita escopo "%".',
      NEW.permission_code, permission_scope, TG_TABLE_NAME, TG_ARGV[0]
      USING ERRCODE = 'check_violation', CONSTRAINT = TG_TABLE_NAME || '_permission_scope';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "profile_permissions_permission_scope"
  BEFORE INSERT OR UPDATE OF "permission_code" ON "profile_permissions"
  FOR EACH ROW EXECUTE FUNCTION "enforce_permission_scope"('tenant');
--> statement-breakpoint
CREATE TRIGGER "user_platform_permissions_permission_scope"
  BEFORE INSERT OR UPDATE OF "permission_code" ON "user_platform_permissions"
  FOR EACH ROW EXECUTE FUNCTION "enforce_permission_scope"('platform');
