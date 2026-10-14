// Contratos das rotas de autenticação: o mesmo schema valida a borda HTTP e
// alimenta o formulário de login.
import { z } from 'zod';
import { userSchema } from './user.js';

export const loginSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe a senha.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** Empresa vinculada ao usuário logado. O slug é o que vai na URL (`/e/<tenant>/...`). */
export const sessionTenantSchema = z.object({
  slug: z.string(),
  name: z.string(),
  /** A empresa pré-selecionada no login. No máximo uma por usuário. */
  isDefault: z.boolean(),
  /** Bloqueada (em geral, assinatura não paga): aparece na lista, mas não abre. */
  blocked: z.boolean(),
});

export type SessionTenant = z.infer<typeof sessionTenantSchema>;

/** Sessão corrente: quem é o usuário e a quais empresas ele tem vínculo. */
export const sessionSchema = z.object({
  user: userSchema,
  tenants: z.array(sessionTenantSchema),
});

export type Session = z.infer<typeof sessionSchema>;

/**
 * Uma mensagem só para "e-mail não existe" e "senha errada": distinguir os
 * dois diria a quem tenta quais e-mails têm conta.
 */
export const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha inválidos.';

/**
 * Uma mensagem só para "a empresa não existe" e "você não tem vínculo com ela":
 * distinguir os dois diria a quem varre slugs quais empresas usam a plataforma.
 */
export const TENANT_NOT_FOUND_MESSAGE = 'Você não tem acesso a esta empresa, ou ela não existe.';

/**
 * Empresa bloqueada, para quem tem vínculo com ela. Não diz o motivo: quem
 * trata da assinatura é o responsável pela empresa, não cada usuário.
 */
export const TENANT_BLOCKED_MESSAGE = 'O acesso a esta empresa está bloqueado. Procure o responsável por ela.';
