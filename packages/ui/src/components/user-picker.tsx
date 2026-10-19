import type { UserOption } from '@crm/shared';
import { AsyncCombobox, type AsyncComboboxProps } from './async-combobox.js';

// Seletor de usuário da empresa (corretor interno, responsável) sobre o
// `AsyncCombobox`: só define rótulo, linha da lista e textos. A busca chega por
// `search`, como no combobox.

/** `Omit` que preserva a união de seleção única e múltipla. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type UserPickerProps = DistributiveOmit<AsyncComboboxProps<UserOption>, 'getKey' | 'getLabel' | 'renderItem'>;

const getKey = (user: UserOption) => user.id;
const getLabel = (user: UserOption) => user.name;

const renderItem = (user: UserOption) => (
  <span className="flex flex-col gap-1">
    <span className="truncate">{user.name}</span>
    <span className="truncate text-xs text-text-faint">{user.email}</span>
  </span>
);

export function UserPicker(props: UserPickerProps) {
  return (
    <AsyncCombobox<UserOption>
      getKey={getKey}
      getLabel={getLabel}
      renderItem={renderItem}
      placeholder="Escolha o usuário"
      searchPlaceholder="Buscar usuário"
      {...props}
    />
  );
}
