// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from '../../src/index.js';

describe('ProgressBar', () => {
  it('é uma barra de progresso nomeada pelo rótulo, com a leitura por extenso', () => {
    render(<ProgressBar label="Due diligence" valueLabel="7 de 12" value={58} tone="gold" />);
    const bar = screen.getByRole('progressbar', { name: 'Due diligence' });
    expect(bar).toHaveAttribute('aria-valuenow', '58');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuetext', '7 de 12');
  });

  it.each([
    [150, '100'],
    [-5, '0'],
    [Number.NaN, '0'],
  ])('valor %s fica entre 0 e 100', (value, expected) => {
    render(<ProgressBar value={value} aria-label="Meta" />);
    expect(screen.getByRole('progressbar', { name: 'Meta' })).toHaveAttribute('aria-valuenow', expected);
  });
});
