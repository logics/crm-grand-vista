import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveMunicipalities, searchMunicipalities } from '../../../src/modules/municipalities/municipality-source.js';

const rioVerde = { ibgeCode: '5218805', name: 'Rio Verde', uf: 'GO', active: true };

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

describe('searchMunicipalities', () => {
  it('repassa o termo e o cursor à rota da empresa', async () => {
    const lastUrl = stubFetch({ items: [rioVerde], nextCursor: 'c2' });

    const page = await searchMunicipalities('grand-vista')('rio', { signal, cursor: 'c1' });

    const url = lastUrl();
    expect(url.pathname).toBe('/e/grand-vista/municipalities');
    expect(url.searchParams.get('q')).toBe('rio');
    expect(url.searchParams.get('cursor')).toBe('c1');
    expect(url.searchParams.has('includeUf')).toBe(false);
    expect(page).toEqual({ items: [rioVerde], nextCursor: 'c2' });
  });

  it('pede as UFs junto com allowUf e as devolve no topo', async () => {
    const lastUrl = stubFetch({ items: [{ uf: 'GO' }, rioVerde] });

    const page = await searchMunicipalities('grand-vista', { allowUf: true })('goias', { signal });

    expect(lastUrl().searchParams.get('includeUf')).toBe('true');
    expect(page.items).toEqual([{ uf: 'GO' }, rioVerde]);
    expect(page.nextCursor).toBeUndefined();
  });

  it('falha quando a rota falha', async () => {
    stubFetch({ error: { code: 'internal', message: 'Erro interno.' } }, 500);

    await expect(searchMunicipalities('grand-vista')('rio', { signal })).rejects.toThrow();
  });
});

describe('resolveMunicipalities', () => {
  it('pede os códigos em ids e devolve inclusive o município inativo', async () => {
    const inactive = { ibgeCode: '1100015', name: 'Alta Floresta', uf: 'RO', active: false };
    const lastUrl = stubFetch({ items: [rioVerde, inactive] });

    const items = await resolveMunicipalities('grand-vista')(['5218805', '1100015']);

    expect(lastUrl().searchParams.get('ids')).toBe('5218805,1100015');
    expect(items).toEqual([rioVerde, inactive]);
  });

  it('hidrata a sigla de UF sem pedir à rota, que só aceita códigos IBGE', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const items = await resolveMunicipalities('grand-vista')(['GO']);

    expect(items).toEqual([{ uf: 'GO' }]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('separa as UFs dos códigos e só manda os códigos', async () => {
    const lastUrl = stubFetch({ items: [rioVerde] });

    const items = await resolveMunicipalities('grand-vista')(['MT', '5218805']);

    expect(lastUrl().searchParams.get('ids')).toBe('5218805');
    expect(items).toEqual([{ uf: 'MT' }, rioVerde]);
  });
});
