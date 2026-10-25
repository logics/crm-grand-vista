import { Button, EmptyState, type EmptyStateProps, Icon } from '@crm/ui';

/** Estado de página inteira, fora da casca: o `EmptyState` centrado na tela. */
export function PageState(props: EmptyStateProps) {
  return (
    <main className="grid min-h-dvh place-items-center p-gap-shell">
      <EmptyState {...props} />
    </main>
  );
}

interface LoadFailedStateProps {
  title: string;
  onRetry: () => void;
  /** Uma região da página, dentro da casca, em vez da página inteira. */
  inline?: boolean;
}

/** Falha ao carregar, com a nova tentativa: o que a página inteira precisa, ou só uma região dela. */
export function LoadFailedState({ title, onRetry, inline = false }: LoadFailedStateProps) {
  const props: EmptyStateProps = {
    icon: 'alert-triangle',
    title,
    description: 'Verifique a conexão e tente de novo.',
    action: <Button onClick={onRetry}>Tentar de novo</Button>,
  };
  return inline ? <EmptyState compact role="alert" {...props} /> : <PageState {...props} />;
}

/** Uma região da página carregando, dentro da casca: o glifo girando, anunciado ao leitor de tela. */
export function LoadingState() {
  return (
    <div role="status" className="flex items-center justify-center gap-3 p-10 text-sm text-text-faint">
      <Icon name="loader" size="md" className="motion-safe:animate-spin" />
      Carregando…
    </div>
  );
}
