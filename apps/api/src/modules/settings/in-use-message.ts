// Mensagem do 409 ao excluir entrada de cadastro auxiliar que outra tabela ainda
// referencia (FK `RESTRICT`). Só as tabelas do perfil de compra levam o rótulo da
// entidade (dos metadados de campo); as demais mantêm a mensagem genérica.
import { FIELD_REGISTRY, VOCABULARY_IN_USE_MESSAGE } from '@crm/shared';

const LABELED_TABLES = ['buyer_profiles', 'buyer_crops', 'buyer_payment_methods'] as const;
type LabeledTable = (typeof LABELED_TABLES)[number];

const isLabeledTable = (table: string | undefined): table is LabeledTable =>
  (LABELED_TABLES as readonly string[]).includes(table ?? '');

/** `table` é a tabela que referencia a entrada (a do erro do driver). */
export function inUseMessageOfReferencingTable(table: string | undefined): string {
  if (!isLabeledTable(table)) return VOCABULARY_IN_USE_MESSAGE;
  const { label, gender } = FIELD_REGISTRY[table];
  const preposition = gender === 'f' ? 'na' : 'no';
  return `Esta entrada está em uso ${preposition} ${label.toLowerCase()} de compradores. Desative-a para que não apareça em novos cadastros.`;
}
