// Contrato do histórico de alterações de um registro: a resposta de
// `GET /e/:tenant/<recurso>/:id/history`, montada por cada módulo sob o próprio
// recurso. Os valores chegam prontos para exibir — quem consome a API lê o
// histórico como o usuário o lê; só o instante vai em ISO 8601, para o front o
// formatar no fuso de quem lê.
import { z } from 'zod';

/** Saves por página. A página nunca corta um save ao meio. */
export const HISTORY_PAGE_SIZE = 20;

/** Autor de alteração sem usuário: CLI ou sistema. */
export const SYSTEM_AUTHOR = 'Sistema';

export const HISTORY_KINDS = ['created', 'updated', 'deleted'] as const;

export type HistoryKind = (typeof HISTORY_KINDS)[number];

export const historyChangeSchema = z.object({
  /** Rótulo do campo, nunca o nome da coluna. */
  field: z.string(),
  /** Valor anterior formatado; nulo quando vazio. */
  from: z.string().nullable(),
  /** Valor novo formatado; nulo quando vazio. */
  to: z.string().nullable(),
  /** Texto longo: vem inteiro, e o componente trunca. */
  long: z.literal(true).optional(),
});

export type HistoryChange = z.infer<typeof historyChangeSchema>;

/** Alteração de um filho do registro ("Documento adicionado"), no mesmo save. */
export const historyChildSchema = z.object({
  title: z.string(),
  changes: z.array(historyChangeSchema),
});

export type HistoryChild = z.infer<typeof historyChildSchema>;

export const historyEntrySchema = z.object({
  changeId: z.string(),
  /** Instante do save em ISO 8601, UTC. */
  at: z.iso.datetime(),
  /** Nome de quem salvou, ou "Sistema". */
  author: z.string(),
  kind: z.enum(HISTORY_KINDS),
  title: z.string(),
  /** Na entrada de cadastro, os valores iniciais. */
  changes: z.array(historyChangeSchema),
  children: z.array(historyChildSchema),
});

export type HistoryEntry = z.infer<typeof historyEntrySchema>;

export const historyPageSchema = z.object({
  /** Mais nova primeiro. */
  entries: z.array(historyEntrySchema),
  /** Ausente na última página. */
  nextCursor: z.string().optional(),
});

export type HistoryPage = z.infer<typeof historyPageSchema>;
