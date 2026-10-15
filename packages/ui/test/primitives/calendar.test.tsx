// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Calendar } from '../../src/index.js';

const october2026 = new Date(2026, 9, 1);

describe('Calendar', () => {
  it('fala português por padrão', () => {
    render(<Calendar mode="single" defaultMonth={october2026} />);
    expect(screen.getByRole('grid', { name: /outubro.*2026/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ir para o próximo mês' })).toBeInTheDocument();
  });

  it('setas movem o foco pela grade e Enter escolhe o dia', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Calendar mode="single" defaultMonth={october2026} selected={new Date(2026, 9, 14)} onSelect={onSelect} />);

    screen.getByRole('button', { name: /14 de outubro de 2026/ }).focus();
    await user.keyboard('{ArrowRight}{ArrowDown}');
    expect(screen.getByRole('button', { name: /22 de outubro de 2026/ })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onSelect.mock.calls[0]![0]).toEqual(new Date(2026, 9, 22));
  });

  it('intervalo: as pontas e o miolo recebem estados distintos', () => {
    render(
      <Calendar
        mode="range"
        defaultMonth={october2026}
        selected={{ from: new Date(2026, 9, 5), to: new Date(2026, 9, 7) }}
      />,
    );
    const day = (n: number) => screen.getByRole('button', { name: new RegExp(`\\b${n} de outubro de 2026`) });
    expect(day(5)).toHaveAttribute('data-range-start');
    expect(day(6)).toHaveAttribute('data-range-middle');
    expect(day(6)).not.toHaveAttribute('data-selected-single');
    expect(day(7)).toHaveAttribute('data-range-end');
  });
});
