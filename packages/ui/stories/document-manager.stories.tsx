import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { fn } from 'storybook/test';
import {
  Card,
  type DocumentCategory,
  type DocumentItem,
  DocumentManager,
  type DocumentManagerProps,
  type DocumentUploadOptions,
} from '../src/index.js';
import { constrained } from './support/layout.js';

const categories: DocumentCategory[] = [
  { id: 'juridico', name: 'Jurídico' },
  { id: 'ambiental', name: 'Ambiental' },
  { id: 'fundiario', name: 'Fundiário' },
  { id: 'fiscal', name: 'Fiscal' },
];

const MB = 1024 * 1024;

const documents: DocumentItem[] = [
  {
    id: 'matricula',
    categoryId: 'juridico',
    name: 'matricula-12345-cri-rio-verde.pdf',
    size: 2.4 * MB,
    contentType: 'application/pdf',
    uploadedAt: '2026-07-24',
    notes: 'Inteiro teor atualizado, sem ônus',
  },
  {
    id: 'escritura',
    categoryId: 'juridico',
    name: 'escritura-compra-e-venda-1998.pdf',
    size: 5.1 * MB,
    contentType: 'application/pdf',
    uploadedAt: '2026-07-02',
  },
  {
    id: 'car',
    categoryId: 'ambiental',
    name: 'recibo-car-go-5218805.pdf',
    size: 340 * 1024,
    contentType: 'application/pdf',
    uploadedAt: '2026-06-15',
  },
  {
    id: 'reserva',
    categoryId: 'ambiental',
    name: 'mapa-reserva-legal.png',
    size: 8.7 * MB,
    contentType: 'image/png',
    uploadedAt: '2026-06-15',
    notes: 'Averbada na matrícula',
  },
  {
    id: 'georreferenciamento',
    categoryId: 'fundiario',
    name: 'georreferenciamento-incra.zip',
    size: 46 * MB,
    contentType: 'application/zip',
    uploadedAt: '2026-05-30',
  },
];

/** Envio que nunca termina: cada arquivo para no progresso seguinte da lista. */
const stalled = (progress: number[]) => {
  let call = 0;
  return (_file: File, { onProgress }: DocumentUploadOptions) => {
    onProgress(progress[call++ % progress.length]!);
    return new Promise<string>(() => {});
  };
};

const failing = () => Promise.reject(new Error('Falha simulada'));

/** Escolhe arquivos para uma categoria ao montar, para a story abrir com a fila cheia. */
function WithChosenFiles({ category, children }: { category: string; children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const chosen = useRef(false);
  useEffect(() => {
    if (chosen.current) return;
    chosen.current = true;
    const input = container.current?.querySelector<HTMLInputElement>(`input[aria-label="Selecionar arquivos para ${category}"]`);
    if (!input) return;
    const files = [
      new File([new Uint8Array(1)], 'certidao-negativa-itr.pdf', { type: 'application/pdf' }),
      new File([new Uint8Array(1)], 'ccir-2026.pdf', { type: 'application/pdf' }),
    ];
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, [category]);
  return <div ref={container}>{children}</div>;
}

/** Lista com estado: editar e remover mudam a lista, como na tela. */
function StatefulDocuments(props: DocumentManagerProps<string>) {
  const [list, setList] = useState(props.documents ?? []);
  return (
    <DocumentManager
      {...props}
      documents={list}
      onEdit={(changed, changes) => {
        props.onEdit?.(changed, changes);
        setList(list.map((item) => (item.id === changed.id ? { ...item, ...changes } : item)));
      }}
      onRemove={(removed) => {
        props.onRemove?.(removed);
        setList(list.filter((item) => item.id !== removed.id));
      }}
    />
  );
}

const meta = {
  title: 'Domínio/DocumentManager',
  component: DocumentManager<string>,
  args: {
    categories,
    upload: stalled([0]),
    onUploaded: fn(),
    onDownload: fn(),
    onEdit: fn(),
    onRemove: fn(),
    maxSize: 50 * MB,
  },
  decorators: [constrained('form')],
} satisfies Meta<typeof DocumentManager<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const VariasCategorias: Story = {
  name: 'Várias categorias',
  args: { documents },
  render: (args) => (
    <Card title="Documentos" subtitle="Fazenda Três Barras">
      <StatefulDocuments {...args} />
    </Card>
  ),
};

export const Vazio: Story = {};

export const Enviando: Story = {
  args: { documents, upload: stalled([35, 80]) },
  render: (args) => (
    <WithChosenFiles category="Fiscal">
      <DocumentManager {...args} />
    </WithChosenFiles>
  ),
};

export const ComErro: Story = {
  name: 'Com erro',
  args: { documents, upload: failing },
  render: (args) => (
    <WithChosenFiles category="Fiscal">
      <DocumentManager {...args} />
    </WithChosenFiles>
  ),
};

export const SoLeitura: Story = {
  name: 'Só leitura',
  args: { documents, upload: undefined, onEdit: undefined, onRemove: undefined },
};

export const Desabilitado: Story = {
  args: { documents, disabled: true },
};
