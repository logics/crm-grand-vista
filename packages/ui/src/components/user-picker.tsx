import type { UserOption } from '@crm/shared';
import { AsyncCombobox, type AsyncComboboxPickerProps, AsyncComboboxOption } from './async-combobox.js';

// Seletor de usuário da empresa (corretor interno, responsável) sobre o
// `AsyncCombobox`: nome e e-mail.

export type UserPickerProps = AsyncComboboxPickerProps<UserOption>;

const userKey = (user: UserOption) => user.id;
const userName = (user: UserOption) => user.name;

const renderUser = (user: UserOption) => <AsyncComboboxOption title={user.name} detail={user.email} />;

export function UserPicker(props: UserPickerProps) {
  return (
    <AsyncCombobox
      getKey={userKey}
      getLabel={userName}
      renderItem={renderUser}
      placeholder="Escolha o usuário"
      searchPlaceholder="Buscar usuário"
      {...props}
    />
  );
}
