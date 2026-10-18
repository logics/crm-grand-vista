import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// APIs de layout que o jsdom não implementa e que o Radix chama ao abrir
// conteúdo posicionado (Select, Popover) ou ao rolar até o item destacado.
// Ficam vazias: o teste exercita foco e teclado, não geometria.
const element = Element.prototype as Element & Record<string, unknown>;
element.hasPointerCapture ??= () => false;
element.setPointerCapture ??= () => {};
element.releasePointerCapture ??= () => {};
element.scrollIntoView ??= () => {};

// Nem URLs de objeto, que o `MediaUploader` cria para a prévia local. Os testes
// do componente trocam estas por espiãs que contam o que foi criado e revogado.
URL.createObjectURL ??= () => 'blob:previa';
URL.revokeObjectURL ??= () => {};

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Sem `globals` do Vitest, o Testing Library não desmonta sozinho entre testes.
afterEach(cleanup);
