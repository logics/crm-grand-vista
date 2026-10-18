import { describe, expect, it } from 'vitest';
import { formatBytes, matchesAccept, screenFiles } from '../../src/lib/media-files.js';

const file = (name: string, type: string, size = 1) => new File([new Uint8Array(size)], name, { type });

describe('matchesAccept', () => {
  it('casa tipo exato, família com curinga e extensão, sem diferenciar caixa', () => {
    expect(matchesAccept(file('sede.jpg', 'image/jpeg'), 'image/*')).toBe(true);
    expect(matchesAccept(file('voo.mp4', 'video/mp4'), 'image/*,video/mp4')).toBe(true);
    expect(matchesAccept(file('MAPA.PNG', ''), '.png')).toBe(true);
    expect(matchesAccept(file('matricula.pdf', 'application/pdf'), 'image/*, video/*')).toBe(false);
  });

  it('accept vazio aceita tudo', () => {
    expect(matchesAccept(file('matricula.pdf', 'application/pdf'), '')).toBe(true);
  });
});

describe('formatBytes', () => {
  it('usa a maior unidade que cabe, com vírgula decimal', () => {
    expect(formatBytes(800)).toBe('800 bytes');
    expect(formatBytes(800 * 1024)).toBe('800 KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2 MB');
    expect(formatBytes(1.5 * 1024 ** 3)).toBe('1,5 GB');
  });
});

describe('screenFiles', () => {
  it('recusa pelo primeiro motivo — tipo, tamanho, quantidade — e aceita o resto na ordem', () => {
    const { accepted, rejected } = screenFiles(
      [
        file('matricula.pdf', 'application/pdf'),
        file('grande.jpg', 'image/jpeg', 2048),
        file('a.jpg', 'image/jpeg'),
        file('b.jpg', 'image/jpeg'),
      ],
      { accept: 'image/*', maxSize: 1024, maxFiles: 3, current: 2 },
    );
    expect(accepted.map((accepted) => accepted.name)).toEqual(['a.jpg']);
    expect(rejected.map(({ file, reason }) => `${file.name}: ${reason}`)).toEqual([
      'matricula.pdf: tipo de arquivo não aceito',
      'grande.jpg: maior que 1 KB',
      'b.jpg: limite de 3 arquivos atingido',
    ]);
  });

  it('sem limite de quantidade, aceita todos', () => {
    const files = [file('a.jpg', 'image/jpeg'), file('b.jpg', 'image/jpeg')];
    expect(screenFiles(files, { accept: 'image/*', current: 99 }).accepted).toHaveLength(2);
  });
});
