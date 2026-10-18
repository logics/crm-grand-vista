import type { Meta, StoryObj } from '@storybook/react-vite';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { fn } from 'storybook/test';
import { Field, type MediaItem, MediaUploader, type MediaUploaderProps, type MediaUploadOptions } from '../src/index.js';
import { constrained } from './support/layout.js';

// Fotos de fazenda não existem no material da marca: a mídia enviada aparece
// sem miniatura, no espaço em areia com o rótulo do tipo.

const gallery: MediaItem[] = [
  { id: 'sede', kind: 'photo', name: 'sede-e-curral.jpg' },
  { id: 'pivo', kind: 'photo', name: 'pivo-central-talhao-3.jpg' },
  { id: 'voo', kind: 'video', name: 'sobrevoo-drone.mp4' },
  { id: 'armazem', kind: 'photo', name: 'armazem-graneleiro.jpg' },
];

/** Envio que nunca termina: cada arquivo para no progresso seguinte da lista. */
const stalled = (progress: number[]) => {
  let call = 0;
  return (_file: File, { onProgress }: MediaUploadOptions) => {
    onProgress(progress[call++ % progress.length]!);
    return new Promise<string>(() => {});
  };
};

const failing = () => Promise.reject(new Error('Falha simulada'));

const files = () => [
  new File([new Uint8Array(1)], 'sede-e-curral.jpg', { type: 'image/jpeg' }),
  new File([new Uint8Array(1)], 'pivo-central-talhao-3.jpg', { type: 'image/jpeg' }),
  new File([new Uint8Array(1)], 'sobrevoo-drone.mp4', { type: 'video/mp4' }),
];

/** Solta arquivos na área de envio ao montar, para a story abrir com a fila cheia. */
function WithDroppedFiles({ children }: { children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const dropped = useRef(false);
  useEffect(() => {
    if (dropped.current) return;
    dropped.current = true;
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files: files(), types: ['Files'] } });
    container.current?.querySelector('[role="region"]')?.dispatchEvent(event);
  }, []);
  return <div ref={container}>{children}</div>;
}

/** Galeria com estado: reordenar e remover mudam a grade, como na tela. */
function StatefulGallery(props: MediaUploaderProps<string>) {
  const [items, setItems] = useState(props.items ?? []);
  return (
    <MediaUploader
      {...props}
      items={items}
      onReorder={(ids) => {
        props.onReorder?.(ids);
        setItems(ids.map((id) => items.find((item) => item.id === id)!));
      }}
      onRemove={(removed) => {
        props.onRemove?.(removed);
        setItems(items.filter((item) => item.id !== removed.id));
      }}
    />
  );
}

const meta = {
  title: 'Formulário/MediaUploader',
  component: MediaUploader<string>,
  args: {
    upload: stalled([0]),
    onUploaded: fn(),
    maxSize: 200 * 1024 * 1024,
    maxFiles: 40,
  },
  decorators: [constrained('xl')],
} satisfies Meta<typeof MediaUploader<string>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vazio: Story = {};

export const Enviando: Story = {
  args: { upload: stalled([35, 80, 10]) },
  render: (args) => (
    <WithDroppedFiles>
      <MediaUploader {...args} />
    </WithDroppedFiles>
  ),
};

export const ComErro: Story = {
  name: 'Com erro',
  args: { upload: failing },
  render: (args) => (
    <WithDroppedFiles>
      <MediaUploader {...args} />
    </WithDroppedFiles>
  ),
};

export const GradeComItens: Story = {
  name: 'Grade com itens',
  args: { items: gallery, onReorder: fn(), onRemove: fn() },
  render: (args) => <StatefulGallery {...args} />,
};

export const Desabilitado: Story = {
  args: { items: gallery, onReorder: fn(), onRemove: fn(), disabled: true },
};

export const NoField: Story = {
  name: 'No Field',
  render: (args) => (
    <Field label="Galeria principal" hint="Fotos aéreas primeiro: a primeira vira a capa do cartão.">
      <MediaUploader {...args} uploadLabel="Enviar fotos e vídeos" />
    </Field>
  ),
};
