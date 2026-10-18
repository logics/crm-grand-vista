import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sem `globals` do Vitest, o Testing Library não desmonta sozinho entre testes.
afterEach(cleanup);
