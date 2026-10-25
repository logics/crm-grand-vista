import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from '../../src/history/query.js';

describe('cursor do histórico', () => {
  it('volta ao mesmo id', () => {
    expect(decodeCursor(encodeCursor(1))).toBe(1);
    expect(decodeCursor(encodeCursor(9_007_199_254_740_991))).toBe(9_007_199_254_740_991);
  });

  it('é opaco: não expõe o id como número', () => {
    expect(encodeCursor(42)).not.toBe('42');
  });

  it.each([
    ['vazio', ''],
    ['texto qualquer', 'abc'],
    ['zero', encodeCursor(0)],
    ['negativo', Buffer.from('-5').toString('base64url')],
    ['decimal', Buffer.from('1.5').toString('base64url')],
    ['fora do inteiro seguro', Buffer.from('9007199254740993').toString('base64url')],
  ])('recusa cursor %s', (_case, cursor) => {
    expect(decodeCursor(cursor)).toBeNull();
  });
});
