import {
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  type UIEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '../lib/cn.js';
import { useFieldControl } from '../lib/field-control.js';
import { type FieldSize, fieldFrameSurface, fieldMinHeight, fieldSize, focusRing } from '../lib/styles.js';
import { Command, CommandInput, CommandItem, CommandList } from '../primitives/command.js';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '../primitives/popover.js';
import { Button } from './button.js';
import { Icon } from './icon.js';
import { Tag } from './tag.js';

// Seletor que busca enquanto o usuário digita (Command + Popover), base de
// `ContactPicker`, `FarmPicker`, `MunicipalityPicker` e de todo seletor de
// vocabulário controlado. Não fala com a API: a busca chega pela prop `search`
// e a hidratação de IDs pela `resolve`. Não guarda cache entre aberturas —
// quem quiser cache passa um `search` com cache (TanStack Query no módulo).
//
// O gatilho é um `<button role="combobox">` que estica por toda a moldura (o
// `::after` cobre a área livre); chips e o botão de limpar ficam por cima dele,
// porque botão não aninha botão. A lista e o campo de busca são do cmdk.

/** Uma página de resultados; `nextCursor` diz que há mais e como pedi-la. */
export type AsyncComboboxPage<T> = { items: T[]; nextCursor?: string };

/**
 * Busca de uma página. `signal` aborta quando outra busca começa ou a lista
 * fecha; `cursor` é o `nextCursor` da página anterior, na paginação incremental.
 */
export type AsyncComboboxSearch<T> = (
  term: string,
  options: { signal: AbortSignal; cursor?: string },
) => Promise<AsyncComboboxPage<T>>;

type AsyncComboboxBaseProps<T> = Pick<
  ComponentProps<'button'>,
  'id' | 'aria-label' | 'aria-labelledby' | 'aria-describedby' | 'aria-invalid' | 'aria-required' | 'onBlur'
> & {
  search: AsyncComboboxSearch<T>;
  /** Identidade do item: é o ID que o formulário guarda e que `resolve` recebe. */
  getKey: (item: T) => string;
  /** Texto do item no gatilho, nos chips e, sem `renderItem`, na lista. */
  getLabel: (item: T) => string;
  /** Conteúdo do item na lista, quando o rótulo não basta (cidade, documento…). */
  renderItem?: (item: T) => ReactNode;
  /**
   * Hidrata os itens de que o valor só tem o ID (string). Até voltar, o
   * valor não muda (não abre, não remove); ID que não volta aparece como
   * travessão e sai do valor na próxima mudança.
   */
  resolve?: (ids: string[]) => Promise<T[]>;
  /** Texto do gatilho sem seleção. */
  placeholder?: string;
  /** Texto do campo de busca, que também o nomeia. */
  searchPlaceholder?: string;
  /** sm 32 · md 40 · lg 48 (lg nos formulários do mobile). */
  size?: FieldSize;
  disabled?: boolean;
  /** Espera, em ms, entre a última tecla e a busca. */
  debounceMs?: number;
  /** Caracteres antes de buscar; até lá, a lista pede que se digite mais. */
  minChars?: number;
  /** Abre já na montagem (vitrine do Storybook). */
  defaultOpen?: boolean;
  /** Vai para a moldura, que é quem ocupa o layout. */
  className?: string;
};

/** Seleção única: `value` é o item, o seu ID (a hidratar por `resolve`) ou `null`. */
type SingleProps<T> = {
  multiple?: false;
  value: T | string | null;
  onChange: (value: T | null) => void;
};

/** Seleção múltipla: cada entrada é o item ou o seu ID; as escolhidas viram chips. */
type MultipleProps<T> = {
  multiple: true;
  value: ReadonlyArray<T | string>;
  onChange: (value: T[]) => void;
};

/** Itens são objetos: uma entrada `string` no valor é sempre um ID a hidratar. */
export type AsyncComboboxProps<T> = AsyncComboboxBaseProps<T> & (SingleProps<T> | MultipleProps<T>);

type SearchState<T> = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  term: string;
  /** Cursor da busca em andamento ou da última; definido, é página seguinte. */
  cursor?: string;
  items: T[];
  nextCursor?: string;
};

const idleSearch: SearchState<never> = { status: 'idle', term: '', items: [] };

/**
 * Ref com o valor do último render. `search`, `resolve` e `getKey` costumam ser
 * funções inline: lidas por aqui, não reiniciam a busca nem a hidratação.
 */
function useLatest<V>(value: V) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * Busca com debounce enquanto `active`: a primeira, ao abrir, sai na hora; a
 * anterior é abortada a cada nova; resposta que não é da busca mais recente é
 * descartada, mesmo que o `search` ignore o `signal`.
 */
function useSearch<T>(
  search: AsyncComboboxSearch<T>,
  getKey: (item: T) => string,
  term: string,
  active: boolean,
  minChars: number,
  debounceMs: number,
) {
  const [state, setState] = useState<SearchState<T>>(idleSearch);
  const latestSearch = useLatest(search);
  const latestGetKey = useLatest(getKey);
  const pending = useRef<AbortController | null>(null);
  const opened = useRef(false);

  const cancel = useCallback(() => {
    pending.current?.abort();
    pending.current = null;
  }, []);

  const run = useCallback(
    (term: string, cursor?: string) => {
      cancel();
      const controller = new AbortController();
      pending.current = controller;
      setState((prev) => ({ ...prev, status: 'loading', term, cursor }));
      latestSearch.current(term, { signal: controller.signal, cursor }).then(
        (page) => {
          if (pending.current !== controller) return;
          pending.current = null;
          setState((prev) => ({
            status: 'ready',
            term,
            items: cursor === undefined ? page.items : appendNew(prev.items, page.items, latestGetKey.current),
            nextCursor: page.nextCursor,
          }));
        },
        () => {
          if (pending.current !== controller) return;
          pending.current = null;
          setState((prev) => ({ ...prev, status: 'error' }));
        },
      );
    },
    [cancel, latestSearch, latestGetKey],
  );

  useEffect(() => {
    if (!active) {
      cancel();
      opened.current = false;
      return;
    }
    const justOpened = !opened.current;
    opened.current = true;
    if (term.length < minChars) {
      cancel();
      return;
    }
    if (justOpened) {
      run(term);
      return;
    }
    const timer = setTimeout(() => run(term), debounceMs);
    return () => clearTimeout(timer);
  }, [active, term, minChars, debounceMs, run, cancel]);

  useEffect(() => cancel, [cancel]);

  /** Esquece os resultados ao fechar: nada de cache entre aberturas. */
  const reset = () => setState(idleSearch);
  const loadMore = () => {
    if (state.status === 'ready' && state.nextCursor !== undefined) run(state.term, state.nextCursor);
  };
  const retry = () => run(state.term, state.cursor);

  // abaixo do mínimo de caracteres, a lista só pede que se digite mais
  return { state: active && term.length < minChars ? idleSearch : state, loadMore, retry, reset };
}

/** Acrescenta a página seguinte sem repetir item que já veio (a lista mudou entre as páginas). */
function appendNew<T>(items: T[], page: T[], getKey: (item: T) => string) {
  const seen = new Set(items.map(getKey));
  return [...items, ...page.filter((item) => !seen.has(getKey(item)))];
}

/** Item hidratado por `resolve`; `null` é ID que não voltou. */
type Known<T> = ReadonlyMap<string, T | null>;

/** Hidrata, uma vez por ID, as entradas do valor que são só o ID. */
function useResolved<T>(ids: string[], resolve: ((ids: string[]) => Promise<T[]>) | undefined, getKey: (item: T) => string) {
  const [known, setKnown] = useState<Known<T>>(new Map());
  const requested = useRef(new Set<string>());
  const latest = useLatest({ resolve, getKey });
  const missingKey = ids.filter((id) => !known.has(id)).join('\n');

  useEffect(() => {
    const { resolve, getKey } = latest.current;
    const ids = missingKey.split('\n').filter((id) => id !== '' && !requested.current.has(id));
    if (!resolve || ids.length === 0) return;
    for (const id of ids) requested.current.add(id);
    const settle = (items: T[]) =>
      setKnown((prev) => {
        const next = new Map(prev);
        for (const id of ids) next.set(id, null);
        for (const item of items) next.set(getKey(item), item);
        return next;
      });
    resolve(ids).then(settle, () => settle([]));
  }, [missingKey, latest]);

  const remember = (item: T) => setKnown((prev) => new Map(prev).set(getKey(item), item));
  return { known, remember };
}

export function AsyncCombobox<T>(props: AsyncComboboxProps<T>) {
  const {
    search,
    getKey,
    getLabel,
    renderItem,
    resolve,
    placeholder,
    searchPlaceholder = 'Buscar',
    size = 'md',
    disabled = false,
    debounceMs = 250,
    minChars = 0,
    defaultOpen = false,
    className,
    multiple: _multiple,
    value: _value,
    onChange: _onChange,
    ...native
  } = props;
  const control = useFieldControl(native);
  const [open, setOpen] = useState(defaultOpen && !disabled);
  const [term, setTerm] = useState('');
  const [highlighted, setHighlighted] = useState('');
  const { state, loadMore, retry, reset } = useSearch(search, getKey, term, open, minChars, debounceMs);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const entries: ReadonlyArray<T | string> = props.multiple ? props.value : props.value === null ? [] : [props.value];
  const keyOf = (entry: T | string) => (typeof entry === 'string' ? entry : getKey(entry));
  const selectedKeys = entries.map(keyOf);
  const { known, remember } = useResolved(
    entries.filter((entry): entry is string => typeof entry === 'string'),
    resolve,
    getKey,
  );
  const itemOf = (entry: T | string) => (typeof entry === 'string' ? known.get(entry) : entry);
  /** Rótulo da entrada: o item, "Carregando…" enquanto `resolve` não volta, travessão se não voltou. */
  const labelOf = (entry: T | string) => {
    const item = itemOf(entry);
    if (item) return getLabel(item);
    return typeof entry === 'string' && resolve && !known.has(entry) ? 'Carregando…' : '—';
  };
  const selectedItems = entries.map(itemOf).filter((item): item is T => item != null);
  // enquanto `resolve` não volta, o valor fica parado: mudar agora perderia os IDs ainda sem item
  const hydrating = resolve !== undefined && entries.some((entry) => typeof entry === 'string' && !known.has(entry));
  const locked = disabled || hydrating;

  const change = (items: T[]) => {
    if (props.multiple) props.onChange(items);
    else props.onChange(items[0] ?? null);
  };

  const changeOpen = (next: boolean) => {
    if (next && locked) return;
    setOpen(next);
    if (!next) {
      setTerm('');
      setHighlighted('');
      reset();
    }
  };

  const toggle = (item: T) => {
    const key = getKey(item);
    remember(item);
    if (props.multiple) {
      change(selectedKeys.includes(key) ? selectedItems.filter((chosen) => getKey(chosen) !== key) : [...selectedItems, item]);
    } else {
      change(selectedKeys[0] === key ? [] : [item]);
      changeOpen(false);
    }
  };

  const removeLast = () => {
    if (props.multiple && entries.length > 0 && !locked) {
      const last = keyOf(entries[entries.length - 1]!);
      change(selectedItems.filter((item) => getKey(item) !== last));
    }
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      changeOpen(true);
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      removeLast();
    }
  };

  /** Remoção pelo chip ou pelo limpar: o botão clicado some, o foco volta ao gatilho. */
  const removeAndRefocus = (items: T[]) => {
    change(items);
    triggerRef.current?.focus();
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && term === '') removeLast();
  };

  const { items } = state;
  const lastKey = items.length > 0 ? getKey(items[items.length - 1]!) : undefined;

  // chegar pelo teclado ao último item pede a página seguinte
  const onHighlight = (key: string) => {
    setHighlighted(key);
    if (key !== '' && key === lastKey) loadMore();
  };

  // primeira página que não enche a lista não tem rolagem: pede a seguinte já
  const latestLoadMore = useLatest(loadMore);
  useEffect(() => {
    const list = listRef.current;
    if (list && list.clientHeight > 0 && list.scrollHeight <= list.clientHeight) latestLoadMore.current();
  }, [state.items, latestLoadMore]);

  // rolar até perto do fim (um quarto da altura visível) também
  const onListScroll = (event: UIEvent<HTMLDivElement>) => {
    const list = event.currentTarget;
    if (list.scrollHeight - list.scrollTop - list.clientHeight <= list.clientHeight / 4) loadMore();
  };

  const firstPage = state.cursor === undefined;
  const status = (() => {
    if (state.status === 'idle' && minChars > 0) return <StatusRow>Digite ao menos {minChars} caracteres</StatusRow>;
    if (state.status === 'loading' && firstPage && items.length === 0) return <StatusRow loading>Buscando…</StatusRow>;
    if (state.status === 'loading' && !firstPage) return <StatusRow loading>Carregando mais…</StatusRow>;
    if (state.status === 'error')
      return (
        <StatusRow
          action={
            <Button variant="soft" size="sm" icon="refresh-cw" onClick={retry}>
              Tentar de novo
            </Button>
          }
        >
          Não foi possível buscar.
        </StatusRow>
      );
    if (state.status === 'ready' && items.length === 0)
      return <StatusRow>{state.term ? `Nenhum resultado para “${state.term}”` : 'Nenhum resultado'}</StatusRow>;
    return null;
  })();

  const hasValue = entries.length > 0;
  /** Chips e limpar ficam acima do `::after` do gatilho, que cobre a moldura. */
  const aboveTrigger = 'relative z-10';

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverAnchor asChild>
        <div
          data-slot="async-combobox"
          className={cn(
            fieldFrameSurface,
            fieldSize[size],
            'relative flex w-full items-center gap-3 rounded-input pr-4 pl-5',
            props.multiple && hasValue && ['h-auto flex-wrap py-2', fieldMinHeight[size]],
            className,
          )}
        >
          {props.multiple &&
            entries.map((entry) => {
              const label = labelOf(entry);
              const item = itemOf(entry);
              return (
                <Tag
                  key={keyOf(entry)}
                  className={aboveTrigger}
                  onRemove={
                    locked || !item
                      ? undefined
                      : () => removeAndRefocus(selectedItems.filter((chosen) => getKey(chosen) !== getKey(item)))
                  }
                >
                  {label}
                </Tag>
              );
            })}
          <PopoverTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              role="combobox"
              disabled={disabled}
              aria-busy={hydrating || undefined}
              onKeyDown={onTriggerKeyDown}
              className={cn(
                'h-full min-w-0 flex-1 cursor-pointer truncate text-left outline-none focus-visible:shadow-none',
                "after:absolute after:inset-0 after:rounded-input after:content-['']",
                'disabled:cursor-not-allowed',
                // na múltipla com chips, o placeholder sai e o botão vira só área de clique;
                // sem eles, 120px (3 × --space-10) bastam para o placeholder
                (!hasValue || !props.multiple) && 'min-w-[calc(3*var(--space-10))]',
                !hasValue && 'text-text-faint',
              )}
              {...control}
            >
              {!hasValue ? (
                placeholder
              ) : props.multiple ? (
                // os chips mostram a seleção; o leitor de tela a ouve no gatilho
                <span className="sr-only">{entries.map(labelOf).join(', ')}</span>
              ) : (
                labelOf(entries[0]!)
              )}
            </button>
          </PopoverTrigger>
          {hasValue && !locked && (
            <button
              type="button"
              aria-label="Limpar seleção"
              onClick={() => removeAndRefocus([])}
              className={cn(
                aboveTrigger,
                'inline-flex cursor-pointer rounded-pill p-1 text-text-faint transition-control hover:text-text-body',
                focusRing,
              )}
            >
              <Icon name="x" size="sm" />
            </button>
          )}
          <Icon name="chevron-down" size="md" className="pointer-events-none text-text-faint" />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        aria-label={searchPlaceholder}
        // a largura da moldura, nunca menos que 280px (7 × --space-10), a de um campo do kit crm-v2
        className="w-(--radix-popover-trigger-width) min-w-[calc(7*var(--space-10))] p-0"
      >
        <Command shouldFilter={false} value={highlighted} onValueChange={onHighlight} label={searchPlaceholder}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={term}
            onValueChange={setTerm}
            onKeyDown={onSearchKeyDown}
          />
          <CommandList
            ref={listRef}
            aria-multiselectable={props.multiple || undefined}
            aria-busy={state.status === 'loading' || undefined}
            onScroll={onListScroll}
            className={cn(
              'transition-opacity duration-fast',
              items.length === 0 && 'hidden',
              // nova busca sobre a lista anterior: esmaece sem trocar de altura
              state.status === 'loading' && firstPage && 'opacity-60',
            )}
          >
            {items.map((item) => {
              const key = getKey(item);
              const checked = selectedKeys.includes(key);
              return (
                <CommandItem
                  key={key}
                  value={key}
                  aria-checked={checked}
                  data-checked={checked || undefined}
                  onSelect={() => toggle(item)}
                  className="pr-10 data-checked:font-medium"
                >
                  <span className="min-w-0 flex-1 truncate">{renderItem ? renderItem(item) : getLabel(item)}</span>
                  {checked && <Icon name="check" size="md" className="absolute right-4 text-brand-primary" />}
                </CommandItem>
              );
            })}
          </CommandList>
          <div role="status">{status}</div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Linha de estado sob a lista (carregando, vazio, erro), na altura do vazio do `Command`. */
function StatusRow({ loading = false, action, children }: { loading?: boolean; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-8 text-center text-sm text-text-muted">
      <span className="inline-flex items-center gap-3">
        {loading && <Icon name="loader" size="md" className="motion-safe:animate-spin" />}
        {children}
      </span>
      {action}
    </div>
  );
}
