import { describe, expect, it } from 'vitest';
import { databaseError, isForeignKeyInUse, SQLSTATE } from '../src/database-error.js';

const driverError = (fields: Record<string, string>) => Object.assign(new Error('falha'), fields);
const wrapped = (inner: Error) => new Error('Failed query', { cause: inner });

describe('databaseError', () => {
  it('lê código, tabela e constraint do erro do driver embrulhado em cause', () => {
    const error = wrapped(driverError({ code: '23505', table: 'contacts', constraint: 'contacts_pkey' }));
    expect(databaseError(error)).toEqual({ code: '23505', table: 'contacts', constraint: 'contacts_pkey' });
  });

  it('omite o que o driver não informou', () => {
    expect(databaseError(driverError({ code: '22P02' }))).toEqual({ code: '22P02' });
  });

  it('devolve vazio quando não há SQLSTATE na cadeia', () => {
    expect(databaseError(new Error('x'))).toEqual({});
    expect(databaseError(driverError({ code: 'ECONNRESET' }))).toEqual({});
    expect(databaseError('texto')).toEqual({});
  });
});

describe('isForeignKeyInUse', () => {
  it('trata RESTRICT (23001) e NO ACTION (23503) como "em uso"', () => {
    expect(isForeignKeyInUse(SQLSTATE.restrictViolation)).toBe(true);
    expect(isForeignKeyInUse(SQLSTATE.foreignKeyViolation)).toBe(true);
    expect(isForeignKeyInUse(SQLSTATE.uniqueViolation)).toBe(false);
    expect(isForeignKeyInUse(undefined)).toBe(false);
  });
});
