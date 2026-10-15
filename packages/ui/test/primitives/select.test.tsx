// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../src/index.js';

const regions = ['Alto Paranaíba', 'Oeste da Bahia', 'Sul do Piauí'];

function RegionSelect({ onValueChange }: { onValueChange?: (value: string) => void }) {
  return (
    <Select onValueChange={onValueChange}>
      <SelectTrigger aria-label="Região">
        <SelectValue placeholder="Todas as regiões" />
      </SelectTrigger>
      <SelectContent>
        {regions.map((region) => (
          <SelectItem key={region} value={region}>
            {region}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

async function focusTrigger(onValueChange?: (value: string) => void) {
  const user = userEvent.setup();
  render(<RegionSelect onValueChange={onValueChange} />);
  const trigger = screen.getByRole('combobox', { name: 'Região' });
  await user.tab();
  expect(trigger).toHaveFocus();
  return { user, trigger };
}

describe('Select', () => {
  it('mostra o placeholder enquanto nada foi escolhido', async () => {
    const { trigger } = await focusTrigger();
    expect(trigger).toHaveTextContent('Todas as regiões');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it.each(['{Enter}', ' ', '{ArrowDown}'])('abre pelo teclado com %s', async (key) => {
    const { user, trigger } = await focusTrigger();
    await user.keyboard(key);
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(regions);
  });

  it('setas movem o destaque, Enter escolhe, fecha e devolve o foco ao gatilho', async () => {
    const onValueChange = vi.fn();
    const { user, trigger } = await focusTrigger(onValueChange);
    await user.keyboard('{Enter}');
    await screen.findByRole('listbox');
    expect(screen.getByRole('option', { name: 'Alto Paranaíba' })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Oeste da Bahia' })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onValueChange).toHaveBeenCalledWith('Oeste da Bahia');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger).toHaveTextContent('Oeste da Bahia');
    expect(trigger).toHaveFocus();
  });

  it('digitar o início do nome destaca a opção', async () => {
    const { user } = await focusTrigger();
    await user.keyboard('{Enter}');
    await screen.findByRole('listbox');
    await user.keyboard('Sul');
    expect(screen.getByRole('option', { name: 'Sul do Piauí' })).toHaveFocus();
  });

  it('Escape fecha sem escolher e devolve o foco ao gatilho', async () => {
    const onValueChange = vi.fn();
    const { user, trigger } = await focusTrigger(onValueChange);
    await user.keyboard('{Enter}');
    await screen.findByRole('listbox');
    await user.keyboard('{ArrowDown}{Escape}');

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onValueChange).not.toHaveBeenCalled();
    expect(trigger).toHaveTextContent('Todas as regiões');
    expect(trigger).toHaveFocus();
  });

  it('marca a opção escolhida ao reabrir', async () => {
    const { user } = await focusTrigger();
    await user.keyboard('{Enter}');
    await screen.findByRole('listbox');
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}{Enter}');
    expect(await screen.findByRole('option', { name: 'Sul do Piauí' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Sul do Piauí' })).toHaveFocus();
  });
});
