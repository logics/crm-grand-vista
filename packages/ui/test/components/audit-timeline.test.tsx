// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { composeStories } from '@storybook/react-vite';
import { AuditTimeline } from '../../src/index.js';
import * as stories from '../../stories/audit-timeline.stories.js';
import { classesWithoutCss } from '../support/classes.js';
import { compileStyles } from '../support/tailwind.js';

describe('AuditTimeline', () => {
  it('uma entrada por alteração salva, na ordem recebida, com autor e instante', () => {
    render(
      <AuditTimeline
        items={[
          { id: 'b', title: 'Preço pedido alterado', date: '24/07 · 09h00', author: 'Rafael Tavares' },
          { id: 'a', title: 'Fazenda cadastrada', date: '12/03 · 14h30', author: 'Renata Carvalho', icon: 'plus' },
        ]}
      />,
    );
    const entries = screen.getAllByRole('listitem');
    expect(entries).toHaveLength(2);
    expect(within(entries[0]!).getByText('Preço pedido alterado')).toBeInTheDocument();
    expect(within(entries[0]!).getByText('24/07 · 09h00')).toBeInTheDocument();
    expect(within(entries[0]!).getByText('Rafael Tavares')).toBeInTheDocument();
    expect(within(entries[1]!).getByText('Fazenda cadastrada')).toBeInTheDocument();
  });

  it('cada campo alterado mostra o valor anterior e o novo; vazio vira travessão', () => {
    render(
      <AuditTimeline
        items={[
          {
            title: 'Cadastro editado',
            changes: [
              { field: 'Preço pedido', from: 'R$ 18,4 mi', to: 'R$ 16,9 mi' },
              { field: 'Potencial de venda', from: null, to: 'Alto' },
            ],
          },
        ]}
      />,
    );
    const price = screen.getByText('Preço pedido').closest('li')!;
    expect(within(price).getByText('R$ 18,4 mi').tagName).toBe('DEL');
    expect(within(price).getByText('R$ 16,9 mi').tagName).toBe('INS');
    const potential = screen.getByText('Potencial de venda').closest('li')!;
    expect(within(potential).getByText('—').tagName).toBe('DEL');
  });

  it('detalhe em texto livre abaixo do título', () => {
    render(
      <AuditTimeline items={[{ title: 'Status comercial alterado', detail: 'Proprietário suspendeu a venda.' }]} />,
    );
    expect(screen.getByText('Proprietário suspendeu a venda.')).toBeInTheDocument();
  });

  it('lista de campos recolhível: nasce fechada e abre e fecha pelo teclado', async () => {
    const user = userEvent.setup();
    render(
      <AuditTimeline
        items={[
          {
            title: 'Fazenda cadastrada',
            changesLabel: 'Ver valores iniciais',
            changes: [{ field: 'Nome', to: 'Fazenda Três Barras' }],
          },
        ]}
      />,
    );
    const toggle = screen.getByRole('button', { name: 'Ver valores iniciais' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Fazenda Três Barras')).not.toBeVisible();

    await user.tab();
    expect(toggle).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Fazenda Três Barras')).toBeVisible();

    await user.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Fazenda Três Barras')).not.toBeVisible();
  });

  it('sem rótulo de recolher, a lista de campos aparece aberta e sem botão', () => {
    render(<AuditTimeline items={[{ title: 'Nome alterado', changes: [{ field: 'Nome', from: 'A', to: 'B' }] }]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('B')).toBeVisible();
  });

  it('texto longo: uma linha truncada; "Ver tudo" abre o anterior e o novo completos, um embaixo do outro', async () => {
    const user = userEvent.setup();
    const before = 'Fazenda com sede reformada em 2019, curral de alvenaria e três represas.';
    const after = 'Fazenda com sede reformada em 2024, curral de alvenaria, três represas e pivô central.';
    render(
      <AuditTimeline items={[{ title: 'Descrição alterada', changes: [{ field: 'Descrição', from: before, to: after, long: true }] }]} />,
    );
    const toggle = screen.getByRole('button', { name: 'Ver tudo' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(before)).toHaveClass('truncate');
    expect(screen.getByText(after)).toHaveClass('truncate');

    await user.tab();
    expect(toggle).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName('Ver menos');
    const from = screen.getByText(before);
    const to = screen.getByText(after);
    expect(from.tagName).toBe('DEL');
    expect(to.tagName).toBe('INS');
    expect(from).not.toHaveClass('truncate');
    expect(to).not.toHaveClass('truncate');
    expect(from.compareDocumentPosition(to) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.keyboard(' ');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(after)).toHaveClass('truncate');
  });

  it('cada filho alterado no mesmo save é uma linha própria, com os campos dele, depois dos campos do registro', () => {
    render(
      <AuditTimeline
        items={[
          {
            title: '2 alterações',
            changes: [{ field: 'Preço pedido', from: 'R$ 18,4 mi', to: 'R$ 16,9 mi' }],
            related: [
              { title: 'Documento adicionado: Matrícula 12.345', changes: [{ field: 'Tipo', to: 'Matrícula' }] },
              { title: 'Foto removida' },
            ],
          },
        ]}
      />,
    );
    const entry = screen.getAllByRole('listitem')[0]!;
    const document = within(entry).getByText('Documento adicionado: Matrícula 12.345');
    expect(within(entry).getByText('Foto removida')).toBeInTheDocument();
    expect(screen.getByText('Preço pedido').compareDocumentPosition(document) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const type = screen.getByText('Tipo').closest('li')!;
    expect(within(type).getByText('Matrícula').tagName).toBe('INS');
    expect(document.compareDocumentPosition(type) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('texto longo vazio vira travessão', () => {
    render(<AuditTimeline items={[{ title: 'Descrição alterada', changes: [{ field: 'Descrição', to: 'Nova', long: true }] }]} />);
    expect(screen.getByText('—').tagName).toBe('DEL');
  });

  it('aberto, toda classe da lista recolhível e do texto longo gera CSS', async () => {
    const user = userEvent.setup();
    const build = await compileStyles();
    const { ValoresIniciaisRecolhidos, TextoLongo } = composeStories(stories);
    render(
      <>
        <ValoresIniciaisRecolhidos />
        <TextoLongo />
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Ver valores iniciais' }));
    await user.click(screen.getByRole('button', { name: 'Ver tudo' }));
    expect(screen.getAllByRole('button', { expanded: true })).toHaveLength(2);
    expect(classesWithoutCss(build)).toEqual([]);
  });
});
