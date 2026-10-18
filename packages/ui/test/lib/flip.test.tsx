// @vitest-environment jsdom
import '../support/dom.js';
import { render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFlip } from '../../src/lib/flip.js';

// O jsdom não faz layout nem tem a Web Animations API: a posição de cada item
// sai do `data-x` e o `animate` é espiado.

/** Itens em linha; cada um ocupa a posição do seu índice, de 10 em 10. */
function Strip({ items, trigger }: { items: number[]; trigger: number }) {
  const ref = useRef<HTMLUListElement>(null);
  useFlip(ref, trigger);
  return (
    <ul ref={ref}>
      {items.map((item, index) => (
        <li key={item} data-x={index * 10}>
          {item}
        </li>
      ))}
    </ul>
  );
}

const animate = vi.fn();
const reduceMotion = (matches: boolean) => {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
};

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
    configurable: true,
    get(this: HTMLElement) {
      return Number(this.dataset.x ?? 0);
    },
  });
  HTMLElement.prototype.animate = animate as unknown as HTMLElement['animate'];
  reduceMotion(false);
});

afterEach(() => {
  animate.mockReset();
});

/** Quadros do deslizamento a partir de `dx` px (medida de layout, não de design). */
const slideFrom = (dx: number) => [{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }];

const animationsBy = (text: string) =>
  animate.mock.contexts.flatMap((element, call) =>
    (element as HTMLElement).textContent === text ? [animate.mock.calls[call]![0]] : [],
  );

describe('useFlip', () => {
  it('na primeira renderização, nada anima', () => {
    render(<Strip items={[6, 7, 8]} trigger={7} />);
    expect(animate).not.toHaveBeenCalled();
  });

  it('item que mudou de lugar desliza da posição antiga; o que entrou aparece', () => {
    const { rerender } = render(<Strip items={[6, 7, 8]} trigger={7} />);
    rerender(<Strip items={[7, 8, 9]} trigger={8} />);
    // o 8 estava em 20 e foi para 10: parte de 10px à direita
    expect(animationsBy('8')).toEqual([slideFrom(10)]);
    expect(animationsBy('7')).toEqual([slideFrom(10)]);
    expect(animationsBy('9')).toEqual([[{ opacity: 0 }, { opacity: 1 }]]);
  });

  it('item que não saiu do lugar não anima', () => {
    const { rerender } = render(<Strip items={[1, 2, 3]} trigger={1} />);
    rerender(<Strip items={[1, 2, 3]} trigger={2} />);
    expect(animate).not.toHaveBeenCalled();
  });

  it('só anima quando o gatilho muda', () => {
    const { rerender } = render(<Strip items={[6, 7, 8]} trigger={7} />);
    rerender(<Strip items={[7, 8, 9]} trigger={7} />);
    expect(animate).not.toHaveBeenCalled();
  });

  it('com movimento reduzido no sistema, nada anima', () => {
    reduceMotion(true);
    const { rerender } = render(<Strip items={[6, 7, 8]} trigger={7} />);
    rerender(<Strip items={[7, 8, 9]} trigger={8} />);
    expect(animate).not.toHaveBeenCalled();
  });
});
