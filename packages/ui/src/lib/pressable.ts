import type { HTMLAttributes, KeyboardEvent } from 'react';

// Cartão e linha de tabela que levam a algum lugar não são `<button>`: têm
// cabeçalho, imagem, células. Estes atributos os deixam acionáveis também pelo
// teclado — focáveis, e Enter ou Espaço disparam o mesmo clique do mouse.

type Handlers<E extends HTMLElement> = Pick<HTMLAttributes<E>, 'onClick' | 'onKeyDown'>;

/**
 * Sem `onClick`, devolve só o `onKeyDown` de quem usa. Com ele, o elemento entra
 * na ordem de tabulação e ganha o papel de botão — `null` mantém a semântica
 * própria do elemento (a linha de uma tabela continua linha).
 */
export function pressable<E extends HTMLElement>(
  { onClick, onKeyDown }: Handlers<E>,
  role: 'button' | null = 'button',
): HTMLAttributes<E> {
  if (!onClick) return { onKeyDown };
  return {
    role: role ?? undefined,
    tabIndex: 0,
    onClick,
    onKeyDown(event: KeyboardEvent<E>) {
      onKeyDown?.(event);
      // tecla num controle de dentro (campo, botão) é dele, não do cartão
      if (event.defaultPrevented || event.target !== event.currentTarget) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.currentTarget.click();
    },
  };
}
