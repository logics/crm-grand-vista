import { type RefObject, useLayoutEffect, useRef } from 'react';

// Lista em linha cujos itens trocam de lugar (a janela da paginação): sem
// transição, os itens pulam. A técnica FLIP mede onde cada filho estava e onde
// ficou e o faz deslizar da posição antiga para a nova; o que entrou aparece.
// O React mantém o mesmo elemento para a mesma `key`, então o elemento é a
// identidade do item. Tempo e curva vêm de `tokens/motion.css`; com movimento
// reduzido no sistema, nada anima.

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function motionToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Anima os filhos de `container` quando `trigger` muda. A posição é
 * `offsetLeft`, relativa ao contêiner posicionado: rolar a página ou
 * redimensionar a janela entre uma troca e outra não vira deslizamento.
 */
export function useFlip(container: RefObject<HTMLElement | null>, trigger: unknown) {
  const positions = useRef(new WeakMap<Element, number>());
  const measured = useRef(false);

  useLayoutEffect(() => {
    const list = container.current;
    const children = Array.from(list?.children ?? []) as HTMLElement[];
    const animated = measured.current && !reducedMotion();
    const timing: KeyframeAnimationOptions = {
      duration: Number.parseFloat(motionToken('--dur-normal')) || 0,
      easing: motionToken('--ease-standard') || undefined,
    };
    for (const child of children) {
      const before = positions.current.get(child);
      const after = child.offsetLeft;
      positions.current.set(child, after);
      if (!animated || typeof child.animate !== 'function') continue;
      if (before === undefined) child.animate([{ opacity: 0 }, { opacity: 1 }], timing);
      else if (before !== after) {
        child.animate([{ transform: `translateX(${before - after}px)` }, { transform: 'translateX(0)' }], timing);
      }
    }
    measured.current = true;
  }, [container, trigger]);
}
