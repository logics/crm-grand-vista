// @vitest-environment jsdom
import '../support/dom.js';
import type { HistoryPage } from '@crm/shared';
import { screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecordHistoryButton } from '../../src/history/record-history-button.js';
import { api } from '../../src/lib/api.js';
import { session, stubFakeApi } from '../support/fake-api.js';
import { renderApp } from '../support/render-app.js';

const userId = '01900000-0000-7000-8000-000000000002';
const historyPath = `/e/grand-vista/users/${userId}/history`;

const history: HistoryPage = {
  entries: [
    {
      changeId: '1',
      at: '2026-07-24T17:30:00.000Z',
      author: 'Rafael Tavares',
      kind: 'updated',
      title: 'Nome alterado',
      changes: [{ field: 'Nome', from: 'Ana', to: 'Ana Ribeiro' }],
      children: [],
    },
  ],
};

function UserHeader() {
  return (
    <RecordHistoryButton
      subject="neste usuário"
      queryKey={['users', userId]}
      fetchPage={(slug, cursor) =>
        api.e[':tenant'].users[':id'].history.$get({ param: { tenant: slug, id: userId }, query: { cursor } })
      }
    />
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('RecordHistoryButton', () => {
  it('só pede o histórico quando a pessoa abre, e o mostra num diálogo', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn();
    stubFakeApi({ session: session(), records: { [historyPath]: () => (fetchSpy(), Response.json(history)) } });
    renderApp(`/e/grand-vista/users/${userId}`, { tenantPages: [{ path: 'users/:id', element: <UserHeader /> }] });

    const button = await screen.findByRole('button', { name: 'Histórico' });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByText('Nome alterado')).not.toBeInTheDocument();

    await user.click(button);
    const dialog = await screen.findByRole('dialog', { name: 'Histórico de alterações' });
    expect(within(dialog).getByText('Quem mudou o quê neste usuário, do mais recente ao mais antigo.')).toBeInTheDocument();
    expect(await within(dialog).findByText('Nome alterado')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});
