import type { IconName } from '../components/icon.js';

// Tipo de um documento para a lista: o glifo e o nome dele, pelo content type
// ou, sem ele, pela extensão do arquivo.

export type DocumentKind = { icon: IconName; label: string };

const kinds = {
  pdf: { icon: 'file-text', label: 'PDF' },
  text: { icon: 'file-text', label: 'Texto' },
  spreadsheet: { icon: 'file-spreadsheet', label: 'Planilha' },
  image: { icon: 'file-image', label: 'Imagem' },
  video: { icon: 'file-video', label: 'Vídeo' },
  archive: { icon: 'file-archive', label: 'Arquivo compactado' },
  other: { icon: 'file', label: 'Arquivo' },
} as const satisfies Record<string, DocumentKind>;

const byExtension: Record<string, keyof typeof kinds> = {
  pdf: 'pdf',
  doc: 'text',
  docx: 'text',
  odt: 'text',
  rtf: 'text',
  txt: 'text',
  xls: 'spreadsheet',
  xlsx: 'spreadsheet',
  ods: 'spreadsheet',
  csv: 'spreadsheet',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  heic: 'image',
  webp: 'image',
  tif: 'image',
  tiff: 'image',
  mp4: 'video',
  mov: 'video',
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
};

function fromContentType(type: string): keyof typeof kinds | undefined {
  if (type === 'application/pdf') return 'pdf';
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (/spreadsheet|excel|csv/.test(type)) return 'spreadsheet';
  if (/zip|compressed|x-rar|x-7z/.test(type)) return 'archive';
  if (type.startsWith('text/') || /wordprocessing|msword|opendocument\.text|rtf/.test(type)) return 'text';
  return undefined;
}

export function documentKind(name: string, contentType = ''): DocumentKind {
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
  return kinds[fromContentType(contentType.toLowerCase()) ?? byExtension[extension] ?? 'other'];
}
