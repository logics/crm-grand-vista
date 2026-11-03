import type { ReactNode } from 'react';

/** Cabeçalho de página: o título à esquerda e, se houver, a ação principal à direita. */
export function PageHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-lg font-semibold text-text-heading">{title}</h1>
      {action}
    </div>
  );
}
