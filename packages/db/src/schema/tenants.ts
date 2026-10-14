import { boolean, pgTable, text } from 'drizzle-orm/pg-core';
import { id, timestamps } from './columns.js';

/**
 * Empresa — a corretora que usa o sistema. Fora do RLS: é a tabela que as
 * policies das demais referenciam, e o login a consulta antes de haver empresa ativa.
 */
export const tenants = pgTable('tenants', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  legalName: text('legal_name'),
  taxId: text('tax_id'),
  /**
   * Bloqueada — em geral, assinatura não paga. Os dados ficam intactos, mas só
   * o super admin entra nela até o desbloqueio.
   */
  blocked: boolean('blocked').notNull().default(false),
  ...timestamps,
});
