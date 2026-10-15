// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../src/index.js';
import { classSelector, compileStyles } from '../support/tailwind.js';

const farms = ['Santa Helena', 'Boa Vista', 'Santa Rita'];

function FarmSearch({ onSelect }: { onSelect: (farm: string) => void }) {
  return (
    <Command label="Buscar fazenda">
      <CommandInput placeholder="Buscar fazenda" />
      <CommandList>
        <CommandEmpty>Nenhuma fazenda encontrada.</CommandEmpty>
        <CommandGroup heading="Fazendas">
          {farms.map((farm) => (
            <CommandItem key={farm} onSelect={() => onSelect(farm)}>
              {farm}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

describe('Command', () => {
  it('digitar filtra, setas movem o destaque e Enter escolhe', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<FarmSearch onSelect={onSelect} />);

    await user.type(screen.getByPlaceholderText('Buscar fazenda'), 'santa');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Santa Helena', 'Santa Rita']);

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('Santa Rita');
  });

  it('sem resultado, mostra o vazio', async () => {
    const user = userEvent.setup();
    render(<FarmSearch onSelect={() => {}} />);
    await user.type(screen.getByPlaceholderText('Buscar fazenda'), 'xyz');
    expect(screen.queryAllByRole('option')).toEqual([]);
    expect(screen.getByText('Nenhuma fazenda encontrada.')).toBeInTheDocument();
  });

  it('o campo de busca não leva o anel global de foco, que sairia cortado pelas bordas do painel', async () => {
    // `base.css` põe `box-shadow: var(--ring-focus)` em todo `:focus-visible`, e
    // campo de texto focado sempre conta como `focus-visible`. Algum utilitário
    // do campo tem de zerar a sombra nesse estado.
    const build = await compileStyles();
    render(<FarmSearch onSelect={() => {}} />);
    const classes = [...screen.getByPlaceholderText('Buscar fazenda').classList];
    const css = build(['shadow-none', ...classes]);
    const shadowNone = /\.shadow-none\s*\{([^}]*)\}/.exec(css)![1]!.trim();
    const clearsRing = classes.some((className) =>
      css.includes(`${classSelector(className)}:focus-visible {\n    ${shadowNone}`),
    );
    expect(clearsRing).toBe(true);
  });
});
