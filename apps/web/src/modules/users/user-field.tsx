import type { UserOption } from '@crm/shared';
import { UserPicker, type UserPickerProps } from '@crm/ui';
import { useMemo } from 'react';
import { api } from '../../lib/api.js';
import { useTenantSlug } from '../../shell/tenant-query.js';

// Seletor de usuário (corretor responsável) ligado à equipe da empresa ativa:
// `GET /users` lista quem tem vínculo, sem o super admin. A equipe é pequena,
// então a busca por termo é feita sobre a lista inteira, no cliente.

/** `Omit` que preserva a união entre seleção única e múltipla. */
type WithoutSource<P> = P extends unknown ? Omit<P, 'search' | 'resolve'> : never;

export type UserFieldProps = WithoutSource<UserPickerProps>;

async function fetchTeam(slug: string): Promise<UserOption[]> {
  const response = await api.e[':tenant'].users.$get({ param: { tenant: slug } });
  if (!response.ok) throw new Error(`Falha ao listar os usuários: HTTP ${response.status}.`);
  const { users } = await response.json();
  return users.map(({ id, name, email }) => ({ id, name, email }));
}

const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function UserField(props: UserFieldProps) {
  const slug = useTenantSlug();
  const search = useMemo(
    () => async (term: string) => {
      const needle = fold(term.trim());
      const team = await fetchTeam(slug);
      return { items: needle ? team.filter((user) => fold(`${user.name} ${user.email}`).includes(needle)) : team };
    },
    [slug],
  );
  const resolve = useMemo(
    () => async (ids: string[]) => (await fetchTeam(slug)).filter((user) => ids.includes(user.id)),
    [slug],
  );
  return <UserPicker {...props} search={search} resolve={resolve} />;
}
