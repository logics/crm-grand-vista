// @vitest-environment jsdom
import '../support/dom.js';
import type { VocabularyOption } from '@crm/shared';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Field, VocabularyPicker } from '../../src/index.js';

const options: VocabularyOption[] = [
  { id: 'a', name: 'Soja', active: true },
  { id: 'b', name: 'Trigo', active: false },
];
const search = async () => ({ items: options });
const resolve = async (ids: string[]) => options.filter((option) => ids.includes(option.id));

const renderPicker = (props: { mode?: 'form' | 'filter'; value?: string | null }) =>
  render(
    <Field label="Cultura">
      <VocabularyPicker search={search} resolve={resolve} debounceMs={0} value={props.value ?? null} onChange={() => {}} mode={props.mode} />
    </Field>,
  );

const open = async () => {
  screen.getByRole('combobox', { name: 'Cultura' }).focus();
  await userEvent.setup().keyboard('{ArrowDown}');
};

describe('VocabularyPicker', () => {
  it('no formulário, não oferece entrada inativa', async () => {
    renderPicker({});
    await open();

    expect(await screen.findByRole('option', { name: /Soja/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Trigo/ })).not.toBeInTheDocument();
  });

  it('no filtro, marca a inativa', async () => {
    renderPicker({ mode: 'filter' });
    await open();

    expect(await screen.findByRole('option', { name: /Trigo/ })).toHaveTextContent('inativa');
    expect(screen.getByRole('option', { name: /Soja/ })).not.toHaveTextContent('inativa');
  });

  it('no formulário, mostra o valor gravado inativo', async () => {
    renderPicker({ value: 'b' });

    expect(await screen.findByRole('combobox', { name: 'Cultura' })).toHaveTextContent('Trigo');
  });
});
