// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button, IconButton, SearchBar, TopBar } from '../../src/index.js';

describe('TopBar', () => {
  it('trilha, título, busca e ações', () => {
    render(
      <TopBar
        breadcrumb="Comercial · Fazendas"
        title="Fazenda Três Barras"
        search={<SearchBar bare />}
        actions={
          <>
            <IconButton icon="bell" label="Alertas" />
            <Button size="sm" icon="share-2">
              Enviar oportunidade
            </Button>
          </>
        }
      />,
    );
    expect(screen.getByText('Comercial · Fazendas')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Fazenda Três Barras' })).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alertas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar oportunidade' })).toBeInTheDocument();
  });

  it('sem título, não há cabeçalho de página', () => {
    render(<TopBar actions={<span />} />);
    expect(screen.queryByRole('heading')).toBeNull();
  });
});
