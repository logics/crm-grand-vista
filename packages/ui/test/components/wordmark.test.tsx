// @vitest-environment jsdom
import '../support/dom.js';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Wordmark } from '../../src/index.js';

describe('Wordmark', () => {
  it('é só tipografia: nenhum vetor ou imagem aproxima o monograma', () => {
    const { container } = render(<Wordmark />);
    expect(container).toHaveTextContent('Grand VistaFazendas');
    expect(container.querySelector('svg, img, canvas, picture')).toBeNull();
  });

  it('sem o descritor, fica só o nome', () => {
    const { container } = render(<Wordmark descriptor={false} />);
    expect(container).toHaveTextContent(/^Grand Vista$/);
  });
});
