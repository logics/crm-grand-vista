import { Button, EmptyState, type EmptyStateProps } from '@crm/ui';

/** Estado de página inteira, fora da casca: o `EmptyState` centrado na tela. */
export function PageState(props: EmptyStateProps) {
  return (
    <main className="grid min-h-dvh place-items-center p-gap-shell">
      <EmptyState {...props} />
    </main>
  );
}

/** Falha ao carregar o que a página inteira precisa, com a nova tentativa. */
export function LoadFailedState({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <PageState
      icon="alert-triangle"
      title={title}
      description="Verifique a conexão e tente de novo."
      action={<Button onClick={onRetry}>Tentar de novo</Button>}
    />
  );
}
