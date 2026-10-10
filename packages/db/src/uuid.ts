import { randomBytes } from 'node:crypto';

/**
 * UUID versão 7 (RFC 9562): 48 bits de instante em milissegundos seguidos de
 * bits aleatórios. Ordenado no tempo, o que preserva a localidade do índice da
 * chave primária, e não sequencial, porque o id aparece na URL.
 */
export function uuidv7(now: number = Date.now()): string {
  const bytes = randomBytes(16);
  bytes.writeUIntBE(now, 0, 6);
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
