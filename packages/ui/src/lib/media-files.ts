// Triagem dos arquivos escolhidos ou soltos antes do envio: tipo (pela mesma
// sintaxe do `accept` do `<input type="file">`), tamanho e quantidade. O
// seletor do sistema já filtra o tipo, mas o que chega soltando não passa por
// ele.

export type RejectedFile = { file: File; reason: string };

export type FileRules = {
  /** Lista do `accept`: tipos (`image/*`, `video/mp4`) e extensões (`.png`). */
  accept: string;
  /** Tamanho máximo de cada arquivo, em bytes. */
  maxSize?: number;
  /** Quantos arquivos a lista comporta. */
  maxFiles?: number;
  /** Quantos ela já tem (enviados e na fila). */
  current?: number;
};

export function matchesAccept(file: File, accept: string): boolean {
  const patterns = accept
    .split(',')
    .map((pattern) => pattern.trim().toLowerCase())
    .filter(Boolean);
  if (patterns.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return patterns.some((pattern) => {
    if (pattern.startsWith('.')) return name.endsWith(pattern);
    if (pattern.endsWith('/*')) return type.startsWith(pattern.slice(0, -1));
    return type === pattern;
  });
}

const byteUnits = ['bytes', 'KB', 'MB', 'GB'] as const;

/** Tamanho em pt-BR, na maior unidade que cabe: "2 MB", "1,5 GB", "800 KB". */
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < byteUnits.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)} ${byteUnits[unit]}`;
}

/** Separa o que pode subir do que é recusado, com o motivo em pt-BR. */
export function screenFiles(files: File[], { accept, maxSize, maxFiles, current = 0 }: FileRules) {
  const room = maxFiles === undefined ? Infinity : Math.max(0, maxFiles - current);
  const accepted: File[] = [];
  const rejected: RejectedFile[] = [];
  for (const file of files) {
    if (!matchesAccept(file, accept)) rejected.push({ file, reason: 'tipo de arquivo não aceito' });
    else if (maxSize !== undefined && file.size > maxSize) rejected.push({ file, reason: `maior que ${formatBytes(maxSize)}` });
    else if (accepted.length >= room) rejected.push({ file, reason: `limite de ${maxFiles} arquivos atingido` });
    else accepted.push(file);
  }
  return { accepted, rejected };
}
