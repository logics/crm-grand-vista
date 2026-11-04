import { type ComponentProps, type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn.js';
import { useReorder } from '../lib/reorder.js';
import { ReorderStatus } from '../lib/reorder-status.js';
import { IconButton } from './icon-button.js';

// Lista cuja ordem o usuário muda: etapas do funil, status, qualquer cadastro
// de ordem manual. Três caminhos para o mesmo resultado: arrastar a linha, a
// alça (Espaço pega, setas movem, Espaço solta) e os botões "Mover para
// cima / para baixo". A ordem é de quem usa: `onReorder` recebe os ids na
// nova ordem e a lista volta a mostrar `items`, que quem usa atualiza.

export type ReorderableListProps<I> = Omit<ComponentProps<'ol'>, 'children' | 'onReset'> & {
  items: I[];
  getId: (item: I) => string;
  /** Nome do item nos rótulos e anúncios: "Em negociação". */
  getLabel: (item: I) => string;
  /** Conteúdo da linha, entre a alça e os botões de mover. */
  renderItem: (item: I, index: number) => ReactNode;
  onReorder?: (ids: string[]) => void;
  disabled?: boolean;
};

type Direction = 'up' | 'down';

export function ReorderableList<I>({
  items,
  getId,
  getLabel,
  renderItem,
  onReorder,
  disabled = false,
  className,
  ...props
}: ReorderableListProps<I>) {
  const reorder = useReorder({ items, getId, getLabel, onReorder, disabled });
  const [announcement, setAnnouncement] = useState('');
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<{ id: string; direction: Direction } | null>(null);
  const editable = Boolean(onReorder) && !disabled;

  // mudar a linha de lugar no DOM tira o foco do botão; ele volta, ou vai ao
  // outro botão quando chegou à ponta e o seu ficou desabilitado
  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const same = buttons.current.get(`${target.id}:${target.direction}`);
    const other = buttons.current.get(`${target.id}:${target.direction === 'up' ? 'down' : 'up'}`);
    (same && !same.disabled ? same : other)?.focus();
  });

  const ids = items.map(getId);
  const step = (item: I, direction: Direction) => {
    const id = getId(item);
    const from = ids.indexOf(id);
    const to = from + (direction === 'up' ? -1 : 1);
    if (to < 0 || to >= ids.length) return;
    const next = ids.filter((other) => other !== id);
    next.splice(to, 0, id);
    pendingFocus.current = { id, direction };
    setAnnouncement(`${getLabel(item)} movido para a posição ${to + 1} de ${ids.length}.`);
    onReorder?.(next);
  };

  const button = (item: I, direction: Direction, index: number) => {
    const id = getId(item);
    const atEnd = direction === 'up' ? index === 0 : index === items.length - 1;
    return (
      <IconButton
        ref={(element) => {
          if (element) buttons.current.set(`${id}:${direction}`, element);
          else buttons.current.delete(`${id}:${direction}`);
        }}
        icon={direction === 'up' ? 'arrow-up' : 'arrow-down'}
        label={`Mover ${getLabel(item)} para ${direction === 'up' ? 'cima' : 'baixo'}`}
        size="sm"
        disabled={atEnd}
        onClick={() => step(item, direction)}
      />
    );
  };

  return (
    <>
      <ol
        data-slot="reorderable-list"
        className={cn('m-0 flex list-none flex-col p-0', className)}
        {...reorder.listProps}
        {...props}
      >
        {reorder.ordered.map((item, index) => (
          <li
            key={getId(item)}
            data-moving={reorder.movingId === getId(item) || undefined}
            // linha com filete, como as do `DocumentManager`; a que se move ganha o fundo de pedra
            className="flex items-center gap-4 border-b border-border-subtle py-4 transition-control last:border-b-0 data-moving:bg-surface-sunken"
            {...reorder.itemProps(item)}
          >
            {editable && (
              <IconButton
                icon="grip-vertical"
                label={`Mover ${getLabel(item)}`}
                size="sm"
                className="cursor-grab"
                {...reorder.handleProps(item)}
              />
            )}
            <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
            {editable && (
              <div className="flex items-center gap-1">
                {button(item, 'up', index)}
                {button(item, 'down', index)}
              </div>
            )}
          </li>
        ))}
      </ol>
      <ReorderStatus reorder={reorder} />
      <div role="status" className="sr-only">
        {announcement}
      </div>
    </>
  );
}
