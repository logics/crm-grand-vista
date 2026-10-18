import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { RejectedFiles, UploadStatus } from '../src/index.js';
import { constrained } from './support/layout.js';

const file = new File([new Uint8Array(1)], 'matricula-12345.pdf', { type: 'application/pdf' });
const entry = { key: 'upload-1', file, payload: null };

const meta = {
  title: 'Formulário/UploadStatus',
  component: UploadStatus,
  decorators: [constrained('md')],
  args: { entry: { ...entry, status: 'uploading', progress: 62 }, onRetry: fn() },
} satisfies Meta<typeof UploadStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Enviando: Story = {};

export const Falha: Story = {
  args: { entry: { ...entry, status: 'error', progress: 0 } },
};

export const FalhaDesabilitado: Story = {
  args: { entry: { ...entry, status: 'error', progress: 0 }, disabled: true },
};

export const Recusados: Story = {
  render: () => (
    <RejectedFiles
      files={[
        { file: new File([], 'planta-da-sede.dwg'), reason: 'tipo de arquivo não aceito' },
        { file: new File([], 'georreferenciamento.zip'), reason: 'maior que 20 MB' },
      ]}
    />
  ),
};
