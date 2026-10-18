import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

export function createQueryClient() {
  // Recusa da API (401, 404) é resposta, não falha passageira: repetir só
  // atrasa a tela que precisa mostrá-la.
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

// Provedores que valem para a aplicação inteira, por fora do roteador.
export function AppProviders({ queryClient, children }: { queryClient: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
