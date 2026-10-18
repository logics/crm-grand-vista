import { type DragEvent, type FocusEvent, type KeyboardEvent, useId, useLayoutEffect, useRef, useState } from 'react';

// Reordenação de uma lista por arrastar e pelo teclado, anunciada ao leitor de
// tela. Pelo teclado, a alça de cada item é um botão: Espaço ou Enter pega o
// item, as setas o movem, Espaço ou Enter o solta, Escape (ou sair da alça)
// desfaz. A ordem é de quem usa: durante o movimento vale um rascunho; ao
// soltar, a nova ordem vai para `onReorder` (só se mudou) e a lista volta a
// mostrar `items` — que quem usa atualiza.

export type ReorderOptions<I> = {
  items: I[];
  getId: (item: I) => string;
  /** Nome do item nos anúncios, como "sede.jpg". */
  getLabel: (item: I) => string;
  onReorder?: (ids: string[]) => void;
  disabled?: boolean;
};

/** Instruções da alça, ligadas a ela por `aria-describedby`. */
export const reorderInstructions = 'Espaço para pegar e soltar, setas para mover, Escape para cancelar.';

/** Item em movimento, por onde foi pego e a ordem em rascunho (`basis` é a de `items` quando ele foi pego). */
type Moving = { id: string; via: 'keyboard' | 'pointer'; order: string[]; basis: string };

const move = (ids: string[], id: string, to: number) => {
  const rest = ids.filter((other) => other !== id);
  return [...rest.slice(0, to), id, ...rest.slice(to)];
};

const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((id, index) => id === b[index]);

const steps: Record<string, number> = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };

export function useReorder<I>({ items, getId, getLabel, onReorder, disabled = false }: ReorderOptions<I>) {
  const instructionsId = useId();
  const ids = items.map(getId);
  const idsKey = ids.join('\n');
  const [moving, setMoving] = useState<Moving | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const handles = useRef(new Map<string, HTMLButtonElement>());

  // `items` mudou por fora no meio do movimento: o rascunho era de outra lista
  if (moving && moving.basis !== idsKey) setMoving(null);

  const order = moving?.basis === idsKey ? moving.order : ids;
  const byId = new Map(items.map((item) => [getId(item), item]));
  const ordered = order.map((id) => byId.get(id)!);
  const enabled = Boolean(onReorder) && !disabled;

  // mover o item no DOM tira o foco da alça; ele volta para ela
  useLayoutEffect(() => {
    if (moving?.via === 'keyboard') handles.current.get(moving.id)?.focus();
  }, [moving]);

  const position = (list: string[], id: string) => `${list.indexOf(id) + 1} de ${list.length}`;
  const label = (id: string) => getLabel(byId.get(id)!);

  const grab = (id: string, via: Moving['via']) => setMoving({ id, via, order, basis: idsKey });
  const moveTo = (id: string, to: number) => {
    const next = move(order, id, to);
    setMoving((current) => current && { ...current, order: next });
    return next;
  };
  /** Solta o item: entrega a ordem, se mudou, e a devolve para o anúncio. */
  const drop = (): string[] => {
    setMoving(null);
    if (!sameOrder(order, ids)) onReorder?.(order);
    return order;
  };
  const cancel = (id: string) => {
    setMoving(null);
    setAnnouncement(`Movimento cancelado; ${label(id)} voltou à posição ${position(ids, id)}.`);
  };
  const grabbedByKeyboard = (id: string) => moving?.id === id && moving.via === 'keyboard';

  const onHandleKeyDown = (id: string) => (event: KeyboardEvent<HTMLButtonElement>) => {
    const grabbed = grabbedByKeyboard(id);
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (grabbed) {
        setAnnouncement(`${label(id)} solto na posição ${position(drop(), id)}.`);
      } else {
        grab(id, 'keyboard');
        setAnnouncement(`${label(id)} pego, na posição ${position(order, id)}. Use as setas para mover.`);
      }
      return;
    }
    if (!grabbed) return;
    const step = steps[event.key];
    if (step) {
      event.preventDefault();
      const to = order.indexOf(id) + step;
      // na ponta, o anúncio muda: repetir a posição não seria lido de novo
      if (to < 0) setAnnouncement(`${label(id)} já está na primeira posição.`);
      else if (to >= order.length) setAnnouncement(`${label(id)} já está na última posição.`);
      else setAnnouncement(`${label(id)} na posição ${position(moveTo(id, to), id)}.`);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancel(id);
    }
  };

  return {
    /** Os itens na ordem em exibição, com o movimento em curso aplicado. */
    ordered,
    /** Texto da região viva (`role="status"`). */
    announcement,
    instructionsId,
    /** Id do item sendo movido. */
    movingId: moving?.id,
    /** Atributos da alça de teclado (um botão). */
    handleProps: (item: I) => {
      const id = getId(item);
      return {
        ref: (element: HTMLButtonElement | null) => {
          if (element) handles.current.set(id, element);
          else handles.current.delete(id);
        },
        'aria-pressed': grabbedByKeyboard(id),
        'aria-describedby': instructionsId,
        disabled: !enabled,
        onKeyDown: onHandleKeyDown(id),
        onBlur(event: FocusEvent<HTMLButtonElement>) {
          // o item mudar de lugar no DOM também tira o foco, mas sem destino: só o
          // foco que vai para outro elemento (Tab, clique) desfaz o movimento
          if (grabbedByKeyboard(id) && event.relatedTarget) cancel(id);
        },
      };
    },
    /** Atributos do item: arrastar com o mouse. */
    itemProps: (item: I) => {
      const id = getId(item);
      if (!enabled) return {};
      return {
        draggable: true,
        onDragStart(event: DragEvent) {
          event.dataTransfer.effectAllowed = 'move';
          // o Firefox só começa a arrastar com algum dado
          event.dataTransfer.setData('text/plain', id);
          grab(id, 'pointer');
        },
        onDragOver(event: DragEvent) {
          if (moving?.via !== 'pointer') return;
          event.preventDefault();
          if (moving.id !== id) moveTo(moving.id, order.indexOf(id));
        },
        onDragEnd() {
          // largado fora da lista: o `drop` não veio e o movimento desfaz
          if (moving?.via === 'pointer') setMoving(null);
        },
      };
    },
    /** Atributos da lista: recebe o item largado. */
    listProps: {
      onDragOver(event: DragEvent) {
        if (moving?.via === 'pointer') event.preventDefault();
      },
      onDrop(event: DragEvent) {
        if (moving?.via !== 'pointer') return;
        event.preventDefault();
        drop();
      },
    },
  };
}
