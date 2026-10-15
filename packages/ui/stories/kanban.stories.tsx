import type { Meta, StoryObj } from '@storybook/react-vite';
import { KanbanBoard, OpportunityCard, PipelineColumn, type StageIndex } from '../src/index.js';

const stages = [
  'Lead',
  'Qualificação',
  'Apresentação',
  'Visita',
  'Proposta',
  'Negociação',
  'Due diligence',
  'Contrato',
  'Escritura',
  'Pós-venda',
] as const;

const meta = {
  title: 'Domínio/KanbanBoard',
  component: KanbanBoard,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="p-7">{Story()}</div>],
} satisfies Meta<typeof KanbanBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** As dez etapas do funil, cada uma com a cor própria; a primeira, vazia. */
export const Funil: Story = {
  render: (args) => (
    <KanbanBoard {...args}>
      {stages.map((stage, position) => {
        const index = (position + 1) as StageIndex;
        return (
          <PipelineColumn key={stage} stage={stage} index={index} count={index === 1 ? 0 : 1} total="R$ 18,4 mi">
            {index === 1 ? null : (
              <OpportunityCard
                client="Agro Holding Bertoldi"
                farm="Fazenda Três Barras"
                value="R$ 18,4 mi"
                probability={index * 10}
                owner="Milson Sousa"
                nextAction="Visita técnica · 28/07"
                overdue={index === 4}
              />
            )}
          </PipelineColumn>
        );
      })}
    </KanbanBoard>
  ),
};

export const Coluna: Story = {
  render: () => (
    <PipelineColumn stage="Proposta" index={5} count={2} total="R$ 26,0 mi">
      <OpportunityCard client="Agro Holding Bertoldi" farm="Fazenda Três Barras" value="R$ 18,4 mi" probability={60} />
      <OpportunityCard client="Família Andrade" farm="Fazenda Boa Esperança" value="R$ 7,6 mi" probability={40} />
    </PipelineColumn>
  ),
};
