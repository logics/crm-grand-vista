import { EmptyState, type EmptyStateProps } from '@crm/ui';

/** Estado de página inteira, fora da casca: o `EmptyState` centrado na tela. */
export function PageState(props: EmptyStateProps) {
  return (
    <main className="grid min-h-dvh place-items-center p-gap-shell">
      <EmptyState {...props} />
    </main>
  );
}
