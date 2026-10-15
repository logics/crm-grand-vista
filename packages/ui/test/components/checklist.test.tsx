// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge, ChecklistItem, ChecklistPanel, IconButton } from '../../src/index.js';

describe('ChecklistItem', () => {
  it('rótulo, linha de apoio e o estado nomeado para o leitor de tela', () => {
    render(
      <ul>
        <ChecklistItem state="ok" label="Matrícula atualizada" meta="Anexada em 12/03" />
      </ul>,
    );
    const item = screen.getByRole('listitem');
    expect(within(item).getByText('Matrícula atualizada')).toBeInTheDocument();
    expect(within(item).getByText('Anexada em 12/03')).toBeInTheDocument();
    expect(within(item).getByRole('img', { name: 'Concluído' })).toBeInTheDocument();
  });

  it.each([
    ['ok', 'Concluído'],
    ['pending', 'Pendente'],
    ['blocked', 'Impedimento'],
    ['empty', 'Não iniciado'],
  ] as const)('estado %s se chama "%s"', (state, name) => {
    render(
      <ul>
        <ChecklistItem state={state} label="Georreferenciamento" />
      </ul>,
    );
    expect(screen.getByRole('img', { name })).toBeInTheDocument();
  });

  it('selo em texto ganha o tom do estado; um nó vai como está', () => {
    render(
      <ul>
        <ChecklistItem state="blocked" label="Georreferenciamento" badge="Pendência" />
        <ChecklistItem state="ok" label="CAR" badge="Concluído" />
        <ChecklistItem label="ITR" badge={<Badge tone="info">Em análise</Badge>} />
      </ul>,
    );
    expect(screen.getByText('Pendência').closest('[data-slot=badge]')).toHaveClass('text-status-danger-fg');
    expect(screen.getByText('Concluído', { selector: 'span' }).closest('[data-slot=badge]')).toHaveClass(
      'text-status-success-fg',
    );
    expect(screen.getByText('Em análise').closest('[data-slot=badge]')).toHaveClass('text-status-info-fg');
  });

  it('ação no fim da linha', () => {
    render(
      <ul>
        <ChecklistItem label="CCIR" action={<IconButton icon="upload" label="Anexar documento" />} />
      </ul>,
    );
    expect(screen.getByRole('button', { name: 'Anexar documento' })).toBeInTheDocument();
  });
});

describe('ChecklistPanel', () => {
  it('título, contagem, barra de conclusão e a lista de itens', () => {
    render(
      <ChecklistPanel title="Due diligence" done={2} total={5}>
        <ChecklistItem state="ok" label="Matrícula atualizada" />
        <ChecklistItem state="pending" label="CAR" />
      </ChecklistPanel>,
    );
    expect(screen.getByRole('heading', { name: /Due diligence/ })).toBeInTheDocument();
    expect(screen.getByText('2 de 5')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Due diligence' })).toHaveAttribute('aria-valuenow', '40');
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2);
  });

  it('sem total, nem contagem nem barra', () => {
    render(
      <ChecklistPanel title="Jurídico">
        <ChecklistItem label="Certidões" />
      </ChecklistPanel>,
    );
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByText(/ de /)).toBeNull();
  });
});
