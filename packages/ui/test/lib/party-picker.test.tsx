// @vitest-environment jsdom
import '../support/dom.js';
import type { ContactOption } from '@crm/shared';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PartyPicker } from '../../src/lib/party-picker.js';

const nobody = async (): Promise<{ items: ContactOption[] }> => ({ items: [] });

describe('PartyPicker — cadastro rápido', () => {
  it('se onCreateContact rejeita, vale como cancelado: ninguém entra por onPick e não sobra rejeição solta', async () => {
    const onPick = vi.fn();
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      const user = userEvent.setup();
      const onCreateContact = vi.fn(() => Promise.reject<null>(new Error('falhou')));
      render(
        <PartyPicker
          searchContacts={nobody}
          onCreateContact={onCreateContact}
          onPick={onPick}
          placeholder="Quem indicou?"
          kindLabel="Tipo de indicador"
        />,
      );

      await user.click(screen.getByRole('combobox'));
      await user.type(screen.getByPlaceholderText('Buscar contato'), 'Sebastiana');
      await user.click(await screen.findByRole('button', { name: 'Cadastrar contato' }));

      await waitFor(() => expect(onCreateContact).toHaveBeenCalledTimes(1));
      await new Promise((done) => setTimeout(done, 20));
      expect(unhandled).not.toHaveBeenCalled();
      expect(onPick).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });
});
