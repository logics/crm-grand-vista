import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from '../src/index.js';

const meta = {
  title: 'Primitivos/Tabs',
  component: TabsList,
  args: { variant: 'segmented', size: 'md' },
  render: (args) => (
    <Tabs defaultValue="ficha">
      <TabsList {...args}>
        <TabsTrigger value="ficha">Ficha técnica</TabsTrigger>
        <TabsTrigger value="docs">
          Documentos <TabsCount>14</TabsCount>
        </TabsTrigger>
        <TabsTrigger value="hist">Histórico</TabsTrigger>
        <TabsTrigger value="mapa" disabled>
          Mapa
        </TabsTrigger>
      </TabsList>
      <TabsContent value="ficha" className="pt-6 text-sm">
        Área total, área útil, aptidão e culturas.
      </TabsContent>
      <TabsContent value="docs" className="pt-6 text-sm">
        Matrícula, CAR, CCIR e georreferenciamento.
      </TabsContent>
      <TabsContent value="hist" className="pt-6 text-sm">
        Alterações salvas na ficha.
      </TabsContent>
    </Tabs>
  ),
} satisfies Meta<typeof TabsList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Segmentadas: Story = {};

export const SegmentadasPequenas: Story = { name: 'Segmentadas pequenas', args: { size: 'sm' } };

export const Sublinhadas: Story = { args: { variant: 'underline' } };
