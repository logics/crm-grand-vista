import type { Meta, StoryObj } from '@storybook/react-vite';
import { AuditTimeline } from '../src/index.js';
import { constrained } from './support/layout.js';

const meta = {
  title: 'Domínio/AuditTimeline',
  component: AuditTimeline,
  decorators: [constrained('xl')],
} satisfies Meta<typeof AuditTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

const initialValues = [
  { field: 'Nome', to: 'Fazenda Três Barras' },
  { field: 'Município', to: 'Uruaçu (GO)' },
  { field: 'Área total', to: '1.480 ha' },
  { field: 'Preço pedido', to: 'R$ 18.000.000' },
  { field: 'Matrícula', to: undefined },
];

/** Histórico de alterações de uma fazenda: cada entrada é uma alteração salva. */
export const Historico: Story = {
  name: 'Histórico',
  args: {
    items: [
      {
        id: 3,
        title: 'Preço revisado',
        date: '24/07/2026, 14h30',
        author: 'Rafael Tavares',
        detail: 'Contraproposta do comprador aceita pelo proprietário.',
        changes: [
          { field: 'Preço pedido', from: 'R$ 18.000.000', to: 'R$ 16.400.000' },
          { field: 'Valor por hectare', from: 'R$ 12.162', to: 'R$ 11.081' },
        ],
      },
      {
        id: 2,
        title: 'Documento anexado',
        icon: 'file-text',
        date: '20/07/2026, 09h12',
        author: 'Ana Prado',
        changes: [{ field: 'CAR', from: undefined, to: 'MG-3106200-…' }],
      },
      {
        id: 1,
        title: 'Fazenda cadastrada',
        icon: 'plus',
        date: '02/07/2026, 17h45',
        author: 'Rafael Tavares',
        changesLabel: 'Ver valores iniciais',
        changes: initialValues,
      },
    ],
  },
};

/** A entrada de cadastro traz os valores iniciais recolhidos: já estão na ficha, e abertos empurrariam para baixo o que mudou depois. */
export const ValoresIniciaisRecolhidos: Story = {
  name: 'Valores iniciais recolhidos',
  args: {
    items: [
      {
        title: 'Fazenda cadastrada',
        icon: 'plus',
        date: '02/07/2026, 17h45',
        author: 'Rafael Tavares',
        changesLabel: 'Ver valores iniciais',
        changes: initialValues,
      },
    ],
  },
};

/** Texto longo ocupa uma linha truncada; "Ver tudo" abre o valor anterior e o novo completos, um embaixo do outro. */
export const TextoLongo: Story = {
  name: 'Texto longo',
  args: {
    items: [
      {
        title: 'Descrição alterada',
        date: '28/07/2026, 10h05',
        author: 'Ana Prado',
        changes: [
          {
            field: 'Descrição',
            long: true,
            from: 'Fazenda de pecuária com 1.480 ha, sede reformada em 2019, curral de alvenaria e três represas perenes. Acesso por estrada cascalhada a 22 km da BR-153.',
            to: 'Fazenda de pecuária e grãos com 1.480 ha, sede reformada em 2024, curral de alvenaria, três represas perenes e pivô central de 120 ha. Acesso por estrada cascalhada a 22 km da BR-153.',
          },
        ],
      },
    ],
  },
};

/** Filhos alterados no mesmo save — documentos, fotos — são linhas próprias da entrada, depois dos campos da fazenda. */
export const ComFilhos: Story = {
  name: 'Com filhos',
  args: {
    items: [
      {
        title: '3 alterações',
        date: '24/07 · 14h30',
        author: 'Ana Prado',
        changes: [{ field: 'Preço pedido', from: 'R$ 18.000.000', to: 'R$ 16.400.000' }],
        related: [
          {
            title: 'Documento adicionado: Matrícula 12.345',
            changes: [
              { field: 'Tipo', to: 'Matrícula' },
              { field: 'Validade', to: '31/12/2026' },
            ],
          },
          { title: 'Foto removida: Sede vista do curral' },
        ],
      },
    ],
  },
};

export const EntradaUnica: Story = {
  name: 'Entrada única',
  args: { items: [{ title: 'Fazenda cadastrada', icon: 'plus', date: '02/07/2026', author: 'Rafael Tavares' }] },
};
