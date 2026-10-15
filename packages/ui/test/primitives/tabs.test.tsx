// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../src/index.js';

function FarmRecord() {
  return (
    <Tabs defaultValue="ficha">
      <TabsList variant="underline" aria-label="Ficha da fazenda">
        <TabsTrigger value="ficha">Ficha técnica</TabsTrigger>
        <TabsTrigger value="docs">Documentos</TabsTrigger>
        <TabsTrigger value="hist">Histórico</TabsTrigger>
      </TabsList>
      <TabsContent value="ficha">Área total</TabsContent>
      <TabsContent value="docs">Matrícula</TabsContent>
      <TabsContent value="hist">Alterações</TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('setas movem entre as abas e ativam o painel; só a aba ativa entra na ordem de Tab', async () => {
    const user = userEvent.setup();
    render(<FarmRecord />);
    await user.tab();
    expect(screen.getByRole('tab', { name: 'Ficha técnica' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    const docs = screen.getByRole('tab', { name: 'Documentos' });
    expect(docs).toHaveFocus();
    expect(docs).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Matrícula');

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Histórico' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Ficha técnica' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('tabpanel')).toHaveFocus();
  });
});
