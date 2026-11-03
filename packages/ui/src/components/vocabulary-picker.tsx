import type { VocabularyOption } from '@crm/shared';
import { AsyncCombobox, type AsyncComboboxPickerProps, type AsyncComboboxSearch } from './async-combobox.js';
import { Badge } from './badge.js';

// Seletor de entrada de um cadastro auxiliar (cultura, praça, origem do lead…)
// sobre o `AsyncCombobox`. Quem o usa fornece `search` e `resolve` sobre
// `GET /settings/vocabularies/:vocabulary/options`; nenhum módulo escreve o seu.
//
// Dois modos:
//  - `form` (padrão): entrada nova só com ativas — o seletor descarta inativa que
//    a busca devolva — e o valor já gravado continua exibido pela hidratação
//    (`resolve` com `ids`), ativo ou não.
//  - `filter`: filtro de listagem; a busca traz as inativas (`includeInactive`),
//    que aparecem marcadas "inativa", depois das ativas.

export type VocabularyPickerMode = 'form' | 'filter';

export type VocabularyPickerProps = AsyncComboboxPickerProps<VocabularyOption> & {
  mode?: VocabularyPickerMode;
};

const optionKey = (option: VocabularyOption) => option.id;
const optionName = (option: VocabularyOption) => option.name;

const renderOption = (option: VocabularyOption) => (
  <span className="flex min-w-0 items-center gap-3">
    <span className="truncate">{option.name}</span>
    {!option.active && (
      <Badge size="sm" tone="neutral">
        inativa
      </Badge>
    )}
  </span>
);

const onlyActive =
  (search: AsyncComboboxSearch<VocabularyOption>): AsyncComboboxSearch<VocabularyOption> =>
  async (term, options) => {
    const page = await search(term, options);
    return { ...page, items: page.items.filter((option) => option.active) };
  };

export function VocabularyPicker({ mode = 'form', search, ...props }: VocabularyPickerProps) {
  const filter = mode === 'filter';
  return (
    <AsyncCombobox
      getKey={optionKey}
      getLabel={optionName}
      renderItem={filter ? renderOption : undefined}
      placeholder={filter ? 'Todas' : 'Escolha uma opção'}
      searchPlaceholder="Buscar"
      search={filter ? search : onlyActive(search)}
      {...props}
    />
  );
}
