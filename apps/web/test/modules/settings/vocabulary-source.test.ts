import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveVocabularyOptions, searchVocabularyOptions } from '../../../src/modules/settings/vocabulary-source.js';

const soja = { id: '0194a000-0000-7000-8000-000000000001', name: 'Soja', active: true };

// Troca só o `fetch`: o cliente RPC de produção monta a URL.
function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return () => {
    const input = fetchMock.mock.calls.at(-1)![0];
    return new URL(input instanceof Request ? input.url : input);
  };
}

const signal = new AbortController().signal;

afterEach(() => vi.unstubAllGlobals());

describe('searchVocabularyOptions', () => {
  it('repassa termo e cursor à rota de opções, sem pedir inativas no formulário', async () => {
    const lastUrl = stubFetch({ items: [soja], nextCursor: '30' });

    const page = await searchVocabularyOptions('grand-vista', 'crops')('so', { signal, cursor: '0' });

    const url = lastUrl();
    expect(url.pathname).toBe('/e/grand-vista/settings/vocabularies/crops/options');
    expect(url.searchParams.get('q')).toBe('so');
    expect(url.searchParams.get('cursor')).toBe('0');
    expect(url.searchParams.has('includeInactive')).toBe(false);
    expect(page).toEqual({ items: [soja], nextCursor: '30' });
  });

  it('pede as inativas no modo filtro', async () => {
    const lastUrl = stubFetch({ items: [] });

    await searchVocabularyOptions('grand-vista', 'crops', 'filter')('', { signal });

    expect(lastUrl().searchParams.get('includeInactive')).toBe('true');
  });

  it('falha quando a rota falha', async () => {
    stubFetch({ error: { code: 'internal', message: 'Erro interno.' } }, 500);

    await expect(searchVocabularyOptions('grand-vista', 'crops')('so', { signal })).rejects.toThrow();
  });
});

describe('resolveVocabularyOptions', () => {
  it('hidrata os ids gravados pela rota, ativos ou não', async () => {
    const lastUrl = stubFetch({ items: [{ ...soja, active: false }] });

    const items = await resolveVocabularyOptions('grand-vista', 'crops')([soja.id]);

    expect(lastUrl().searchParams.get('ids')).toBe(soja.id);
    expect(items).toEqual([{ ...soja, active: false }]);
  });

  it('não chama a rota sem ids', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await resolveVocabularyOptions('grand-vista', 'crops')([])).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
