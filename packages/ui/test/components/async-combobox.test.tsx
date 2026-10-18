// @vitest-environment jsdom
import '../support/dom.js';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AsyncCombobox, type AsyncComboboxPage, Field } from '../../src/index.js';

type Farm = { id: string; name: string };

const farms: Farm[] = [
  { id: 'f1', name: 'Fazenda Três Barras' },
  { id: 'f2', name: 'Fazenda Boa Esperança' },
  { id: 'f3', name: 'Fazenda Santa Helena' },
];

type Call = {
  term: string;
  cursor: string | undefined;
  signal: AbortSignal;
  resolve: (page: AsyncComboboxPage<Farm>) => void;
  reject: (error: Error) => void;
};

/** `search` falso: cada chamada fica pendente até o teste resolvê-la ou rejeitá-la. */
function fakeSearch() {
  const calls: Call[] = [];
  const search = vi.fn(
    (term: string, { signal, cursor }: { signal: AbortSignal; cursor?: string }) =>
      new Promise<AsyncComboboxPage<Farm>>((resolve, reject) => {
        calls.push({ term, cursor, signal, resolve, reject });
      }),
  );
  return { search, calls };
}

const getKey = (farm: Farm) => farm.id;
const getLabel = (farm: Farm) => farm.name;

type Search = ReturnType<typeof fakeSearch>['search'];

type HarnessProps = {
  search: Search;
  initial?: Farm | string | null;
  onChange?: (value: Farm | null) => void;
  resolve?: (ids: string[]) => Promise<Farm[]>;
  minChars?: number;
  debounceMs?: number;
  disabled?: boolean;
  error?: string;
};

function Single({ search, initial = null, onChange, error, ...props }: HarnessProps) {
  const [value, setValue] = useState<Farm | string | null>(initial);
  return (
    <Field label="Fazenda" hint="Busque pelo nome" error={error}>
      <AsyncCombobox
        search={search}
        getKey={getKey}
        getLabel={getLabel}
        placeholder="Escolha a fazenda"
        value={value}
        onChange={(farm) => {
          setValue(farm);
          onChange?.(farm);
        }}
        {...props}
      />
    </Field>
  );
}

type MultipleProps = Omit<HarnessProps, 'initial' | 'onChange'> & {
  initial?: Array<Farm | string>;
  onChange?: (value: Farm[]) => void;
};

function Multiple({ search, initial = [], onChange, ...props }: MultipleProps) {
  const [value, setValue] = useState<Array<Farm | string>>(initial);
  return (
    <Field label="Fazendas">
      <AsyncCombobox
        multiple
        search={search}
        getKey={getKey}
        getLabel={getLabel}
        placeholder="Escolha as fazendas"
        value={value}
        onChange={(selected) => {
          setValue(selected);
          onChange?.(selected);
        }}
        {...props}
      />
    </Field>
  );
}

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

async function answer(call: Call | undefined, page: AsyncComboboxPage<Farm>) {
  await act(async () => call!.resolve(page));
}

function setup() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

/** Chega ao gatilho pelo Tab (depois dos chips, que vêm antes) e abre a lista com a seta para baixo. */
async function open(user: ReturnType<typeof setup>, name = 'Fazenda') {
  const trigger = screen.getByRole('combobox', { name });
  for (let i = 0; i < 5 && document.activeElement !== trigger; i++) await user.tab();
  expect(trigger).toHaveFocus();
  await user.keyboard('{ArrowDown}');
  return trigger;
}

const searchInput = () => screen.getByPlaceholderText('Buscar');
const optionNames = () => screen.queryAllByRole('option').map((option) => option.textContent);

beforeEach(() => {
  // o Radix e o cmdk precisam do relógio andando; o teste avança o debounce à mão
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AsyncCombobox', () => {
  describe('com o Field', () => {
    it('o rótulo nomeia o gatilho e a dica o descreve', () => {
      render(<Single search={fakeSearch().search} />);
      const trigger = screen.getByRole('combobox', { name: 'Fazenda' });
      expect(trigger).toHaveAccessibleDescription('Busque pelo nome');
      expect(trigger).toHaveTextContent('Escolha a fazenda');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).not.toHaveAttribute('aria-invalid');
    });

    it('o erro marca o gatilho como inválido', () => {
      render(<Single search={fakeSearch().search} error="Escolha uma fazenda" />);
      const trigger = screen.getByRole('combobox', { name: 'Fazenda' });
      expect(trigger).toHaveAttribute('aria-invalid', 'true');
      expect(trigger).toHaveAccessibleDescription('Escolha uma fazenda');
    });
  });

  describe('busca', () => {
    it('abrir leva o foco ao campo de busca e busca na hora, sem esperar o debounce', async () => {
      const user = setup();
      const { search } = fakeSearch();
      render(<Single search={search} />);
      const trigger = await open(user);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(searchInput()).toHaveFocus();
      expect(search).toHaveBeenCalledTimes(1);
      expect(search).toHaveBeenLastCalledWith('', expect.objectContaining({ cursor: undefined }));
    });

    it('espera o debounce e busca só o termo final', async () => {
      const user = setup();
      const { search } = fakeSearch();
      render(<Single search={search} debounceMs={1000} />);
      await open(user);

      await user.type(searchInput(), 'san');
      expect(search).toHaveBeenCalledTimes(1);
      await advance(1000);
      expect(search.mock.calls.map(([term]) => term)).toEqual(['', 'san']);
    });

    it('cancela a busca anterior pelo AbortSignal', async () => {
      const user = setup();
      const { search, calls } = fakeSearch();
      render(<Single search={search} />);
      await open(user);
      await user.type(searchInput(), 'boa');
      await advance(250);

      expect(calls[0]!.signal.aborted).toBe(true);
      expect(calls[1]!.signal.aborted).toBe(false);
    });

    it('descarta a resposta que chega fora de ordem', async () => {
      const user = setup();
      const { search, calls } = fakeSearch();
      render(<Single search={search} />);
      await open(user);
      await user.type(searchInput(), 'santa');
      await advance(250);

      await answer(calls[1], { items: [farms[2]!] });
      await answer(calls[0], { items: farms });
      expect(optionNames()).toEqual(['Fazenda Santa Helena']);
    });

    it('fechar cancela a busca em andamento', async () => {
      const user = setup();
      const { search, calls } = fakeSearch();
      render(<Single search={search} />);
      await open(user);
      await user.keyboard('{Escape}');
      expect(calls[0]!.signal.aborted).toBe(true);
    });

    it('mostra o carregando enquanto a primeira página não chega', async () => {
      const user = setup();
      const { search, calls } = fakeSearch();
      render(<Single search={search} />);
      await open(user);

      expect(screen.getByRole('status')).toHaveTextContent('Buscando…');
      await answer(calls[0], { items: farms });
      expect(screen.queryByText('Buscando…')).toBeNull();
      expect(optionNames()).toEqual(farms.map((farm) => farm.name));
    });

    it('sem resultado, diz para qual termo', async () => {
      const user = setup();
      const { search, calls } = fakeSearch();
      render(<Single search={search} />);
      await open(user);
      await user.type(searchInput(), 'xyz');
      await advance(250);
      await answer(calls[1], { items: [] });

      expect(screen.getByRole('status')).toHaveTextContent('Nenhum resultado para “xyz”');
      expect(optionNames()).toEqual([]);
    });

    it('no erro, "Tentar de novo" repete a mesma busca', async () => {
      const user = setup();
      const { search, calls } = fakeSearch();
      render(<Single search={search} />);
      await open(user);
      await user.type(searchInput(), 'boa');
      await advance(250);
      await act(async () => calls[1]!.reject(new Error('rede')));

      expect(screen.getByRole('status')).toHaveTextContent('Não foi possível buscar.');
      await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
      expect(search).toHaveBeenCalledTimes(3);
      expect(search).toHaveBeenLastCalledWith('boa', expect.objectContaining({ cursor: undefined }));
      await answer(calls[2], { items: [farms[1]!] });
      expect(optionNames()).toEqual(['Fazenda Boa Esperança']);
    });

    it('com mínimo de caracteres, pede mais antes de buscar', async () => {
      const user = setup();
      const { search } = fakeSearch();
      render(<Single search={search} minChars={3} />);
      await open(user);

      expect(screen.getByRole('status')).toHaveTextContent('Digite ao menos 3 caracteres');
      await user.type(searchInput(), 'sa');
      await advance(250);
      expect(search).not.toHaveBeenCalled();
      await user.type(searchInput(), 'n');
      expect(search).not.toHaveBeenCalled();
      await advance(250);
      expect(search).toHaveBeenCalledWith('san', expect.anything());
    });

    it('não guarda cache entre aberturas', async () => {
      const user = setup();
      const { search, calls } = fakeSearch();
      render(<Single search={search} />);
      await open(user);
      await answer(calls[0], { items: farms });
      await user.keyboard('{Escape}');
      await user.keyboard('{ArrowDown}');

      expect(search).toHaveBeenCalledTimes(2);
      expect(optionNames()).toEqual([]);
    });
  });

  describe('paginação incremental', () => {
    it('ao chegar pelo teclado ao fim da lista, busca a página seguinte e a acrescenta', async () => {
      const user = setup();
      const { search, calls } = fakeSearch();
      render(<Single search={search} />);
      await open(user);
      await answer(calls[0], { items: farms.slice(0, 2), nextCursor: 'p2' });

      await user.keyboard('{ArrowDown}');
      expect(search).toHaveBeenCalledTimes(2);
      expect(search).toHaveBeenLastCalledWith('', expect.objectContaining({ cursor: 'p2' }));
      expect(screen.getByRole('status')).toHaveTextContent('Carregando mais…');

      await answer(calls[1], { items: [farms[2]!] });
      expect(optionNames()).toEqual(farms.map((farm) => farm.name));
      await user.keyboard('{ArrowDown}');
      expect(search).toHaveBeenCalledTimes(2);
    });

    it('ao rolar até o fim da lista, busca a página seguinte', async () => {
      const user = setup();
      const { search, calls } = fakeSearch();
      render(<Single search={search} />);
      await open(user);
      await answer(calls[0], { items: farms, nextCursor: 'p2' });

      const list = screen.getByRole('listbox');
      Object.defineProperties(list, {
        scrollHeight: { configurable: true, value: 400 },
        clientHeight: { configurable: true, value: 200 },
        scrollTop: { configurable: true, value: 200 },
      });
      fireEvent.scroll(list);
      expect(search).toHaveBeenLastCalledWith('', expect.objectContaining({ cursor: 'p2' }));
    });
  });

  describe('seleção única', () => {
    it('Enter escolhe, entrega o item inteiro, fecha e devolve o foco ao gatilho', async () => {
      const user = setup();
      const onChange = vi.fn();
      const { search, calls } = fakeSearch();
      render(<Single search={search} onChange={onChange} />);
      const trigger = await open(user);
      await answer(calls[0], { items: farms });

      await user.keyboard('{ArrowDown}{Enter}');
      expect(onChange).toHaveBeenCalledWith(farms[1]);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(trigger).toHaveFocus();
      expect(trigger).toHaveTextContent('Fazenda Boa Esperança');
    });

    it('marca o item escolhido e escolhê-lo de novo o desmarca', async () => {
      const user = setup();
      const onChange = vi.fn();
      const { search, calls } = fakeSearch();
      render(<Single search={search} initial={farms[0]!} onChange={onChange} />);
      await open(user);
      await answer(calls[0], { items: farms });

      const chosen = screen.getByRole('option', { name: 'Fazenda Três Barras' });
      expect(chosen).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('option', { name: 'Fazenda Santa Helena' })).toHaveAttribute('aria-checked', 'false');
      await user.click(chosen);
      expect(onChange).toHaveBeenCalledWith(null);
      expect(screen.getByRole('combobox', { name: 'Fazenda' })).toHaveTextContent('Escolha a fazenda');
    });

    it('Escape fecha sem escolher e devolve o foco ao gatilho', async () => {
      const user = setup();
      const onChange = vi.fn();
      const { search, calls } = fakeSearch();
      render(<Single search={search} onChange={onChange} />);
      const trigger = await open(user);
      await answer(calls[0], { items: farms });

      await user.keyboard('{ArrowDown}{Escape}');
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
      expect(trigger).toHaveFocus();
    });

    it('o botão de limpar tira a seleção', async () => {
      const user = setup();
      const onChange = vi.fn();
      render(<Single search={fakeSearch().search} initial={farms[0]!} onChange={onChange} />);

      await user.click(screen.getByRole('button', { name: 'Limpar seleção' }));
      expect(onChange).toHaveBeenCalledWith(null);
      expect(screen.queryByRole('button', { name: 'Limpar seleção' })).toBeNull();
    });

    it('hidrata o rótulo do valor inicial por ID com o resolve', async () => {
      const resolve = vi.fn(async (ids: string[]) => farms.filter((farm) => ids.includes(farm.id)));
      render(<Single search={fakeSearch().search} initial="f2" resolve={resolve} />);

      const trigger = screen.getByRole('combobox', { name: 'Fazenda' });
      expect(trigger).toHaveTextContent('Carregando…');
      await act(async () => {});
      expect(resolve).toHaveBeenCalledWith(['f2']);
      expect(trigger).toHaveTextContent('Fazenda Boa Esperança');
    });

    it('ID que o resolve não encontra aparece como travessão', async () => {
      const resolve = vi.fn(async () => []);
      render(<Single search={fakeSearch().search} initial="f9" resolve={resolve} />);
      await act(async () => {});
      expect(screen.getByRole('combobox', { name: 'Fazenda' })).toHaveTextContent('—');
    });

    it('desabilitado, não abre nem limpa', async () => {
      const user = setup();
      const { search } = fakeSearch();
      render(<Single search={search} initial={farms[0]!} disabled />);
      const trigger = screen.getByRole('combobox', { name: 'Fazenda' });

      expect(trigger).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Limpar seleção' })).toBeNull();
      await user.click(trigger);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(search).not.toHaveBeenCalled();
    });
  });

  describe('seleção múltipla', () => {
    it('escolher acrescenta um chip e mantém a lista aberta; escolher de novo desmarca', async () => {
      const user = setup();
      const onChange = vi.fn();
      const { search, calls } = fakeSearch();
      render(<Multiple search={search} onChange={onChange} />);
      await open(user, 'Fazendas');
      await answer(calls[0], { items: farms });

      await user.keyboard('{Enter}{ArrowDown}{Enter}');
      expect(onChange).toHaveBeenLastCalledWith([farms[0], farms[1]]);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Fazenda Três Barras' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('button', { name: 'Remover Fazenda Boa Esperança' })).toBeInTheDocument();

      await user.click(screen.getByRole('option', { name: 'Fazenda Três Barras' }));
      expect(onChange).toHaveBeenLastCalledWith([farms[1]]);
    });

    it('Backspace no campo de busca vazio remove o último chip', async () => {
      const user = setup();
      const onChange = vi.fn();
      const { search } = fakeSearch();
      render(<Multiple search={search} initial={[farms[0]!, farms[1]!]} onChange={onChange} />);
      await open(user, 'Fazendas');

      await user.type(searchInput(), 'a');
      await user.keyboard('{Backspace}');
      expect(onChange).not.toHaveBeenCalled();
      await user.keyboard('{Backspace}');
      expect(onChange).toHaveBeenLastCalledWith([farms[0]]);
    });

    it('Backspace no gatilho remove o último chip', async () => {
      const user = setup();
      const onChange = vi.fn();
      render(<Multiple search={fakeSearch().search} initial={[farms[0]!, farms[1]!]} onChange={onChange} />);
      const trigger = screen.getByRole('combobox', { name: 'Fazendas' });
      trigger.focus();

      await user.keyboard('{Backspace}');
      expect(onChange).toHaveBeenLastCalledWith([farms[0]]);
      expect(screen.queryByRole('button', { name: 'Remover Fazenda Boa Esperança' })).toBeNull();
    });

    it('o chip remove o seu item e o botão de limpar tira todos', async () => {
      const user = setup();
      const onChange = vi.fn();
      render(<Multiple search={fakeSearch().search} initial={farms} onChange={onChange} />);

      await user.click(screen.getByRole('button', { name: 'Remover Fazenda Boa Esperança' }));
      expect(onChange).toHaveBeenLastCalledWith([farms[0], farms[2]]);
      await user.click(screen.getByRole('button', { name: 'Limpar seleção' }));
      expect(onChange).toHaveBeenLastCalledWith([]);
      expect(screen.getByRole('combobox', { name: 'Fazendas' })).toHaveTextContent('Escolha as fazendas');
    });

    it('hidrata os chips por ID e não resolve de novo o que já conhece', async () => {
      const user = setup();
      const resolve = vi.fn(async (ids: string[]) => farms.filter((farm) => ids.includes(farm.id)));
      const { search, calls } = fakeSearch();
      render(<Multiple search={search} initial={['f1', 'f3']} resolve={resolve} />);
      await act(async () => {});

      expect(resolve).toHaveBeenCalledWith(['f1', 'f3']);
      expect(screen.getByRole('button', { name: 'Remover Fazenda Três Barras' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Remover Fazenda Santa Helena' })).toBeInTheDocument();

      await open(user, 'Fazendas');
      await answer(calls[0], { items: farms });
      expect(screen.getByRole('option', { name: 'Fazenda Santa Helena' })).toHaveAttribute('aria-checked', 'true');
      await user.click(screen.getByRole('option', { name: 'Fazenda Boa Esperança' }));
      expect(resolve).toHaveBeenCalledTimes(1);
    });

    it('desabilitado, os chips não têm botão de remover', () => {
      render(<Multiple search={fakeSearch().search} initial={farms} disabled />);
      const field = screen.getByRole('combobox', { name: 'Fazendas' }).parentElement!;
      expect(within(field).getByText('Fazenda Três Barras')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /^Remover/ })).toBeNull();
    });
  });
});
