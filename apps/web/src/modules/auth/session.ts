// Sessão do front: lida de `/auth/session`, guardada no cache do TanStack
// Query, e reescrita por login e logout — que a devolvem ou a encerram — sem
// uma segunda ida à API.
import type { LoginInput, Session } from '@crm/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';

const sessionQueryKey = ['session'] as const;

/** Resposta fora do contrato (5xx, rede no meio do caminho) é falha, não recusa. */
function assertOk<R extends { ok: boolean; status: number }>(
  response: R,
  operation: string,
): asserts response is Extract<R, { ok: true }> {
  if (!response.ok) throw new Error(`Falha ${operation}: HTTP ${response.status}.`);
}

/** Recusa do login: a API não diz se foi o e-mail ou a senha, e o front também não. */
export class InvalidCredentialsError extends Error {
  constructor() {
    super('Credencial inválida.');
    this.name = 'InvalidCredentialsError';
  }
}

/** A sessão corrente, ou `null` sem sessão válida (401). */
export function useSession() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: async (): Promise<Session | null> => {
      const response = await api.auth.session.$get();
      if (response.status === 401) return null;
      assertOk(response, 'ao ler a sessão');
      return response.json();
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: LoginInput): Promise<Session> => {
      const response = await api.auth.login.$post({ json: input });
      if (response.status === 401) throw new InvalidCredentialsError();
      assertOk(response, 'no login');
      return response.json();
    },
    onSuccess: (session) => queryClient.setQueryData(sessionQueryKey, session),
  });
}

/** Logout que falhou: a sessão continua aberta, e o usuário precisa saber. */
export const LOGOUT_FAILED_MESSAGE = 'Não foi possível sair agora. Tente de novo em instantes.';

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await api.auth.logout.$post();
      assertOk(response, 'no logout');
    },
    onSuccess: () => {
      // A sessão vira `null` no lugar (quem a observa leva ao login), e nada
      // mais do usuário anterior fica no cache para o próximo que entrar.
      // `clear()` não serve: tiraria a sessão de baixo de quem a observa.
      queryClient.setQueryData(sessionQueryKey, null);
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== sessionQueryKey[0] });
    },
  });
}
