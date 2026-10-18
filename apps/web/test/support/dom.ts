import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// APIs de layout que o jsdom não implementa e que o Radix chama ao abrir
// conteúdo posicionado (o `Select` do seletor de empresa). Ficam vazias: o
// teste exercita a escolha, não geometria.
const element = Element.prototype as Element & Record<string, unknown>;
element.hasPointerCapture ??= () => false;
element.setPointerCapture ??= () => {};
element.releasePointerCapture ??= () => {};
element.scrollIntoView ??= () => {};

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Sem `globals` do Vitest, o Testing Library não desmonta sozinho entre testes.
afterEach(cleanup);
