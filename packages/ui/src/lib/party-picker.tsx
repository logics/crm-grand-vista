import { REFERRER_KIND_LABELS, type Referrer, type ReferrerKind, type UserOption } from '@crm/shared';
import { useState } from 'react';
import type { AsyncComboboxPage, AsyncComboboxSearch } from '../components/async-combobox.js';
import { Button } from '../components/button.js';
import { ContactPicker, type ContactPickerSearch } from '../components/contact-picker.js';
import { UserPicker } from '../components/user-picker.js';
import type { FieldControlProps } from './field-control.js';
import { mobileTouchTarget } from './styles.js';

// Escolha de uma pessoa que pode ser corretor interno (usuário) ou externo
// (contato) — o indicador da cadeia, o participante da comissão: a troca entre
// as duas buscas e o seletor da escolhida. O seletor fica sempre vazio: a
// pessoa escolhida vai para `onPick` e entra na lista de quem usa.

/** As duas buscas de quem pode entrar; os editores que usam o `PartyPicker` as recebem assim. */
export type PartySearches = {
  /** Busca de corretor interno. Sem ela, só entra contato. */
  searchUsers?: AsyncComboboxSearch<UserOption>;
  /** Busca de contato (corretor externo), a do `ContactPicker`. Sem ela, só entra usuário. */
  searchContacts?: ContactPickerSearch;
};

export type PartyPickerProps = FieldControlProps &
  PartySearches & {
    /** A busca escolhida de início, quando as duas existem: o caso mais comum de quem usa. */
    defaultKind?: ReferrerKind;
    /** Só oferece quem pode entrar. */
    isEligible?: (party: Referrer) => boolean;
    onPick: (party: Referrer) => void;
    /** Texto do seletor vazio; também o nomeia, quando o `Field` não o faz. */
    placeholder: string;
    /** Nome do grupo da troca de busca, como "Tipo do indicador". */
    kindLabel: string;
    disabled?: boolean;
  };

/** O que o seletor de usuário e o de contato devolvem em comum. */
type PartyOption = { id: string; name: string };

export function PartyPicker({
  searchUsers,
  searchContacts,
  defaultKind = 'contact',
  isEligible,
  onPick,
  placeholder,
  kindLabel,
  disabled = false,
  ...control
}: PartyPickerProps) {
  const kinds = (['contact', 'user'] as const).filter((kind) => (kind === 'user' ? searchUsers : searchContacts));
  const [chosenKind, setChosenKind] = useState<ReferrerKind>(defaultKind);
  const kind = kinds.includes(chosenKind) ? chosenKind : (kinds[0] ?? 'contact');
  if (kinds.length === 0) return null;

  const eligible =
    <T extends PartyOption, O>(search: (term: string, options: O) => Promise<AsyncComboboxPage<T>>, partyKind: ReferrerKind) =>
    async (term: string, options: O): Promise<AsyncComboboxPage<T>> => {
      const page = await search(term, options);
      if (!isEligible) return page;
      return { ...page, items: page.items.filter(({ id, name }) => isEligible({ kind: partyKind, id, name })) };
    };

  const picker = {
    value: null,
    onChange: (option: PartyOption | null) => option && onPick({ kind, id: option.id, name: option.name }),
    disabled,
    placeholder,
    'aria-label': control.id ? undefined : placeholder,
    ...control,
  };

  // não é o `Tabs` segmentado: não há painel, só a escolha da busca do seletor
  return (
    <div className="flex flex-wrap items-center gap-4">
      {kinds.length > 1 && (
        <div role="group" aria-label={kindLabel} className="inline-flex gap-2">
          {kinds.map((option) => (
            <Button
              key={option}
              size="sm"
              className={mobileTouchTarget.bar}
              variant={option === kind ? 'soft' : 'ghost'}
              aria-pressed={option === kind}
              disabled={disabled}
              onClick={() => setChosenKind(option)}
            >
              {REFERRER_KIND_LABELS[option]}
            </Button>
          ))}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {kind === 'user' && searchUsers ? (
          <UserPicker {...picker} search={eligible(searchUsers, 'user')} />
        ) : (
          searchContacts && <ContactPicker {...picker} search={eligible(searchContacts, 'contact')} />
        )}
      </div>
    </div>
  );
}
