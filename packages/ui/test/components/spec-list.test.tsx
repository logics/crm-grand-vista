// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SpecList } from '../../src/index.js';

describe('SpecList', () => {
  it('pares de rótulo e valor da ficha técnica', () => {
    render(
      <SpecList
        columns={3}
        items={[
          { label: 'Área total', value: '1.480 ha', mono: true },
          { label: 'Disponibilidade hídrica', value: 'Rio perene + 2 açudes' },
        ]}
      />,
    );
    expect(screen.getAllByRole('term').map((term) => term.textContent)).toEqual([
      'Área total',
      'Disponibilidade hídrica',
    ]);
    expect(screen.getByText('1.480 ha')).toHaveClass('font-mono');
    expect(screen.getByText('Rio perene + 2 açudes')).not.toHaveClass('font-mono');
  });

  it('valor ausente vira travessão — nunca se inventa dado; zero é valor', () => {
    render(
      <SpecList
        items={[
          { label: 'Situação documental' },
          { label: 'Reserva legal', value: '' },
          { label: 'Açudes', value: 0 },
        ]}
      />,
    );
    expect(screen.getAllByRole('definition').map((value) => value.textContent)).toEqual(['—', '—', '0']);
  });
});
