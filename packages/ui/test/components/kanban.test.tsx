// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { KanbanBoard, OpportunityCard, PipelineColumn } from '../../src/index.js';

describe('PipelineColumn', () => {
  it('é uma região nomeada pela etapa, com contagem, total e os cartões', () => {
    render(
      <PipelineColumn stage="Due diligence" index={7} count={1} total="R$ 42,1 mi">
        <OpportunityCard client="Agro Holding Bertoldi" />
      </PipelineColumn>,
    );
    const column = screen.getByRole('region', { name: 'Due diligence' });
    expect(within(column).getByText('1')).toBeInTheDocument();
    expect(within(column).getByText('R$ 42,1 mi')).toBeInTheDocument();
    expect(within(column).getByText('Agro Holding Bertoldi')).toBeInTheDocument();
  });

  it('o índice escolhe a cor da etapa no funil', () => {
    const { container } = render(<PipelineColumn stage="Due diligence" index={7} />);
    expect(container.querySelector('.bg-stage-7')).not.toBeNull();
  });

  it('etapa sem cartões diz que está vazia', () => {
    render(<PipelineColumn stage="Fechamento" index={9} count={0} />);
    expect(screen.getByText('Nenhuma oportunidade')).toBeInTheDocument();
  });
});

describe('KanbanBoard', () => {
  it('é uma região rolável, focável pelo teclado, com uma coluna por etapa', () => {
    render(
      <KanbanBoard>
        <PipelineColumn stage="Lead recebido" index={1} />
        <PipelineColumn stage="Qualificação" index={2} />
      </KanbanBoard>,
    );
    const board = screen.getByRole('region', { name: 'Funil comercial' });
    expect(board).toHaveAttribute('tabindex', '0');
    expect(within(board).getByRole('region', { name: 'Lead recebido' })).toBeInTheDocument();
    expect(within(board).getByRole('region', { name: 'Qualificação' })).toBeInTheDocument();
  });

  it('aceita outro nome acessível', () => {
    render(<KanbanBoard aria-label="Funil de Milson" />);
    expect(screen.getByRole('region', { name: 'Funil de Milson' })).toBeInTheDocument();
  });
});
