import type { ReactNode } from 'react';

/** Falha de uma ação, anunciada a quem usa leitor de tela no momento em que aparece. */
export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm text-status-danger-fg">
      {children}
    </p>
  );
}
