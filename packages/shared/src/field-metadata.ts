// Metadados de campo: o único lugar que diz o rótulo, o tipo e a formatação de
// cada campo de cada entidade. Formulários, cabeçalhos de tabela, filtros e o
// histórico de alterações leem daqui — o usuário nunca vê nome de coluna.
//
// A chave é a do banco (tabela + coluna), exatamente o que o `audit_log` grava
// em `entity` e `field`; o nome camelCase das respostas da API e dos
// formulários é derivado dela, nunca declarado de novo.
import { AREA_FORMAT, type AlqueireType, formatDecimal, formatMoney, formatPercent } from './decimal.js';
import { formatAlqueires, formatHectares } from './farm.js';

/** Gênero gramatical da entidade: "Fazenda cadastrad**a**", "Contato cadastrad**o**". */
export type GrammaticalGender = 'f' | 'm';

/** Campos que se formatam sozinhos, a partir do valor gravado. */
export type ScalarField =
  | { type: 'text' | 'long_text' | 'number' | 'money' | 'area' | 'percent' | 'date' | 'boolean'; label: string }
  /** Lista fechada: o rótulo de cada valor gravado (`high` → "Alto"). */
  | { type: 'enum'; label: string; options: Readonly<Record<string, string>> };

/**
 * Referência a outro registro, exibida pelo nome atual dele. Aqui só se declara
 * de onde vem o nome; resolvê-lo é do histórico, que lê o banco.
 */
export interface ReferenceField {
  type: 'reference';
  label: string;
  references: { table: string; nameColumn: string };
}

/** Uma alteração de chave de um jsonb expandido, já rotulada e formatada. */
export interface ExpandedChange {
  /** Rótulo da chave, resolvido pelo `expand` (não a chave crua do JSON). */
  label: string;
  from: string | null;
  to: string | null;
}

/**
 * Ponto de extensão para jsonb cujas chaves têm rótulo fora do código
 * (`custom_fields`, rotulado por `custom_field_defs`): dado o JSON anterior e o
 * novo, devolve uma alteração por chave.
 */
export interface ExpandedJsonbField {
  type: 'jsonb';
  label: string;
  expand: (
    previous: Readonly<Record<string, unknown>> | null,
    next: Readonly<Record<string, unknown>> | null,
    context: DisplayContext,
  ) => ExpandedChange[];
}

/** Coluna que não aparece ao usuário (`id`, `tenant_id`, `r2_key`…). */
export interface HiddenField {
  type: 'hidden';
}

export type FieldMeta = ScalarField | ReferenceField | ExpandedJsonbField | HiddenField;
export type FieldType = FieldMeta['type'];

export interface EntityMeta {
  /** Rótulo no singular. */
  label: string;
  gender: GrammaticalGender;
  /** Por coluna do banco, na ordem do formulário — a mesma do histórico. */
  fields: Readonly<Record<string, FieldMeta>>;
}

export const HIDDEN: HiddenField = { type: 'hidden' };

/** As colunas de `id()` e `timestamps` (`packages/db/src/schema/columns.ts`), que nunca aparecem. */
export const RECORD_COLUMNS: Readonly<Record<'id' | 'created_at' | 'updated_at', HiddenField>> = {
  id: HIDDEN,
  created_at: HIDDEN,
  updated_at: HIDDEN,
};

/** Unidade em que a área aparece. No banco ela é sempre hectare. */
export type AreaUnit = 'ha' | 'alqueire';

/** Como exibir o que depende da empresa: hoje, a unidade de área. */
export interface DisplayContext {
  areaUnit: AreaUnit;
  /** Qual alqueire, quando a unidade é alqueire. */
  alqueireType: AlqueireType;
}

/** Até `fase-1-configuracoes` preenchê-lo a partir de `tenant_settings`, é sempre hectare. */
export const DEFAULT_DISPLAY_CONTEXT: DisplayContext = { areaUnit: 'ha', alqueireType: 'goiano' };

const formatArea = (hectares: string, { areaUnit, alqueireType }: DisplayContext) =>
  areaUnit === 'ha' ? formatHectares(hectares) : formatAlqueires(hectares, alqueireType);

/** `aaaa-mm-dd` para `dd/mm/aaaa`, sem passar por `Date`: é data, não instante, e não tem fuso. */
function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Exibe um valor como gravado no banco (o texto do `audit_log`, ou o decimal
 * canônico que o `numeric` devolve) em pt-BR. Nulo continua nulo: "vazio" é
 * decisão de quem exibe.
 */
export function formatFieldValue(
  field: ScalarField,
  value: string | null,
  context: DisplayContext = DEFAULT_DISPLAY_CONTEXT,
): string | null {
  if (value === null) return null;
  switch (field.type) {
    case 'text':
    case 'long_text':
      return value;
    case 'number':
      return formatDecimal(value, AREA_FORMAT);
    case 'money':
      return formatMoney(value);
    case 'area':
      return formatArea(value, context);
    case 'percent':
      return formatPercent(value);
    case 'date':
      return formatDate(value);
    case 'boolean':
      return value === 'true' ? 'Sim' : 'Não';
    case 'enum':
      // Valor que saiu da lista aparece como gravado, em vez de sumir.
      return field.options[value] ?? value;
  }
}

/**
 * Nome camelCase de uma coluna, pela mesma conversão do `casing: 'camelCase'`
 * do Drizzle (`total_area_ha` → `totalAreaHa`). Reescrita aqui porque este
 * pacote não depende do Drizzle; `packages/db` prova que coincide com o schema.
 */
export function columnToProperty(column: string): string {
  const words = column.replace(/['’]/g, '').match(/[\da-z]+|[A-Z]+(?![a-z])|[A-Z][\da-z]+/g) ?? [];
  return words
    .map((word, index) => (index === 0 ? word.toLowerCase() : `${word[0]?.toUpperCase()}${word.slice(1)}`))
    .join('');
}
