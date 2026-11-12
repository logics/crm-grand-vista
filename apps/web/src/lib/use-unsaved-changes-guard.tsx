import { ConfirmDialog } from '@crm/ui';
import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router';

/**
 * Avisa antes de perder o que foi digitado e não salvo. Depende do roteador
 * (`useBlocker` exige o data router), por isso mora em `apps/web` e não no `EntityForm`.
 *
 * - Navegação interna com o formulário sujo abre o diálogo "Sair sem salvar?":
 *   confirmar sai; cancelar fica com o digitado. Formulário limpo sai sem perguntar.
 * - Fechar ou recarregar a aba usa o aviso nativo do navegador, sem texto próprio.
 *
 * Quem usa renderiza `dialog` e chama `release()` no save bem-sucedido (e ao sair
 * por um caminho já confirmado), logo antes de navegar: o guarda deixa de valer
 * e o redirecionamento não dispara o aviso.
 */
export function useUnsavedChangesGuard(isDirty: boolean): { dialog: ReactNode; release: () => void } {
  const released = useRef(false);
  const release = useCallback(() => {
    released.current = true;
  }, []);

  const blocker = useBlocker(() => isDirty && !released.current);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (released.current) return;
      // O navegador mostra o próprio aviso; o texto não é configurável.
      event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const blocked = blocker.state === 'blocked';
  const decided = useRef(false);
  const dialog = (
    <ConfirmDialog
      open={blocked}
      onOpenChange={(open) => {
        if (open) return;
        // Confirmar já seguiu a navegação; fechar de qualquer outro jeito é ficar.
        if (decided.current) decided.current = false;
        else if (blocker.state === 'blocked') blocker.reset();
      }}
      title="Sair sem salvar?"
      description="O que foi preenchido e não foi salvo se perde."
      confirmLabel="Sair sem salvar"
      cancelLabel="Continuar editando"
      onConfirm={() => {
        decided.current = true;
        if (blocker.state === 'blocked') blocker.proceed();
      }}
    />
  );
  return { dialog, release };
}
