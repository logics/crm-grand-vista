import { type DragEvent, type KeyboardEvent, useId, useLayoutEffect, useRef, useState } from 'react';

// Reordenação de uma lista por arrastar e pelo teclado, anunciada ao leitor de
// tela. Pelo teclado, a alça de cada item é um botão: Espaço ou Enter pega o
// item, as setas o movem, Espaço ou Enter o solta e Escape desfaz. A ordem só
// é entregue (`onReorder`) ao soltar, e só se mudou.

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

type Moving = { id: string; via: 'keyboard' | 'pointer'; from: number };

const move = (ids: string[], id: string, to: number) => {
  const rest = ids.filter((other) => other !== id);
  return [...rest.slice(0, to), id, ...rest.slice(to)];
};

const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((id, index) => id === b[index]);

export function useReorder<I>({ items, getId, getLabel, onReorder, disabled = false }: ReorderOptions<I>) {
  const instructionsId = useId();
  const ids = items.map(getId);
  const idsKey = ids.join('\n');
  // ordem em edição; depois de solta, vale até `items` chegar com a nova ordem
  const [draft, setDraft] = useState<{ order: string[]; basis: string } | null>(null);
  const [moving, setMoving] = useState<Moving | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const handles = useRef(new Map<string, HTMLButtonElement>());

  const order = draft?.basis === idsKey ? draft.order : ids;
  const byId = new Map(items.map((item) => [getId(item), item]));
  const ordered = order.map((id) => byId.get(id)!);
  const enabled = Boolean(onReorder) && !disabled;

  // `items` mudou por fora (ou chegou na ordem solta): a ordem em edição era de outra lista
  if (draft && draft.basis !== idsKey) setDraft(null);

  // mover o item no DOM tira o foco da alça; ele volta para ela
  useLayoutEffect(() => {
    if (moving?.via === 'keyboard') handles.current.get(moving.id)?.focus();
  }, [moving, order]);

  const position = (list: string[], id: string) => `${list.indexOf(id) + 1} de ${list.length}`;
  const label = (id: string) => getLabel(byId.get(id)!);

  const begin = (id: string, via: Moving['via']) => {
    setDraft({ order, basis: idsKey });
    setMoving({ id, via, from: order.indexOf(id) });
  };
  const moveTo = (id: string, to: number) => {
    const next = move(order, id, Math.max(0, Math.min(order.length - 1, to)));
    setDraft({ order: next, basis: idsKey });
    return next;
  };
  const drop = () => {
    if (!moving) return;
    setMoving(null);
    if (sameOrder(order, ids)) setDraft(null);
    else onReorder?.(order);
    return order;
  };
  const cancel = () => {
    setMoving(null);
    setDraft(null);
  };

  const onHandleKeyDown = (id: string) => (event: KeyboardEvent<HTMLButtonElement>) => {
    const grabbed = moving?.id === id && moving.via === 'keyboard';
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!grabbed) {
        begin(id, 'keyboard');
        setAnnouncement(`${label(id)} pego, na posição ${position(order, id)}. Use as setas para mover.`);
      } else {
        const dropped = drop()!;
        setAnnouncement(`${label(id)} solto na posição ${position(dropped, id)}.`);
      }
      return;
    }
    if (!grabbed) return;
    const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
    if (step) {
      event.preventDefault();
      const next = moveTo(id, order.indexOf(id) + step);
      setAnnouncement(`${label(id)} na posição ${position(next, id)}.`);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
      setAnnouncement(`Movimento cancelado; ${label(id)} voltou à posição ${position(ids, id)}.`);
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
    enabled,
    /** Atributos da alça de teclado (um botão). */
    handleProps: (item: I) => {
      const id = getId(item);
      return {
        ref: (element: HTMLButtonElement | null) => {
          if (element) handles.current.set(id, element);
          else handles.current.delete(id);
        },
        'aria-pressed': moving?.id === id && moving.via === 'keyboard',
        'aria-describedby': instructionsId,
        disabled: !enabled,
        onKeyDown: onHandleKeyDown(id),
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
          begin(id, 'pointer');
        },
        onDragOver(event: DragEvent) {
          if (moving?.via !== 'pointer') return;
          event.preventDefault();
          if (moving.id !== id) moveTo(moving.id, order.indexOf(id));
        },
        onDragEnd() {
          // largado fora da lista: o `drop` não veio e o movimento desfaz
          if (moving?.via === 'pointer') cancel();
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
