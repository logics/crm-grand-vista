// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompatibilityGauge, compatibilityLevel } from '../../src/index.js';

describe('compatibilityLevel', () => {
  it('faixas fixas: 80 ou mais é alta, de 55 a 79 média, abaixo disso baixa', () => {
    expect(compatibilityLevel(100)).toBe('high');
    expect(compatibilityLevel(80)).toBe('high');
    expect(compatibilityLevel(79.6)).toBe('high');
    expect(compatibilityLevel(79)).toBe('medium');
    expect(compatibilityLevel(55)).toBe('medium');
    expect(compatibilityLevel(54)).toBe('low');
    expect(compatibilityLevel(0)).toBe('low');
  });
});

describe('CompatibilityGauge', () => {
  it('é um medidor de 0 a 100 com o percentual e a faixa', () => {
    render(<CompatibilityGauge value={92} />);
    const meter = screen.getByRole('meter', { name: 'Compatibilidade' });
    expect(meter).toHaveAttribute('aria-valuenow', '92');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
    expect(meter).toHaveAttribute('aria-valuetext', '92% · Alta compatibilidade');
    expect(screen.getByText('92')).toBeInTheDocument();
    expect(screen.getByText('Alta compatibilidade')).toBeInTheDocument();
  });

  it('arredonda e limita o valor', () => {
    const { rerender } = render(<CompatibilityGauge value={63.7} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '64');
    expect(screen.getByText('Compatibilidade média')).toBeInTheDocument();
    rerender(<CompatibilityGauge value={130} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '100');
    rerender(<CompatibilityGauge value={-4} />);
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('Compatibilidade baixa')).toBeInTheDocument();
  });

  it('sem o texto, para caber numa célula de tabela, segue com nome e faixa para o leitor de tela', () => {
    render(<CompatibilityGauge value={64} size="sm" showLabel={false} />);
    expect(screen.queryByText('Compatibilidade média')).toBeNull();
    expect(screen.getByRole('meter', { name: 'Compatibilidade' })).toHaveAttribute(
      'aria-valuetext',
      '64% · Compatibilidade média',
    );
  });

  it('a linha dos critérios vem das regras de matching de quem usa', () => {
    render(<CompatibilityGauge value={70} description="Região e cultura" />);
    expect(screen.getByText('Região e cultura')).toBeInTheDocument();
  });
});
