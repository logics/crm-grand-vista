// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Field, Textarea } from '../../src/index.js';

describe('Textarea', () => {
  it('dentro do Field, é nomeado pelo rótulo e aceita várias linhas', async () => {
    const user = userEvent.setup();
    render(
      <Field label="Resumo técnico">
        <Textarea />
      </Field>,
    );
    const campo = screen.getByRole('textbox', { name: 'Resumo técnico' });
    expect(campo.tagName).toBe('TEXTAREA');
    await user.type(campo, 'linha 1{Enter}linha 2');
    expect(campo).toHaveValue('linha 1\nlinha 2');
  });

  it('o erro do Field marca o campo como inválido e o descreve', () => {
    render(
      <Field label="Diferenciais" error="Texto longo demais">
        <Textarea />
      </Field>,
    );
    const campo = screen.getByRole('textbox', { name: 'Diferenciais' });
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription('Texto longo demais');
  });

  it('obrigatório no Field vira aria-required', () => {
    render(
      <Field label="Resumo" required>
        <Textarea />
      </Field>,
    );
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true');
  });

  it('desabilitado não aceita digitação', async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="Nota" disabled defaultValue="fixo" />);
    const campo = screen.getByRole('textbox', { name: 'Nota' });
    expect(campo).toBeDisabled();
    await user.type(campo, 'x');
    expect(campo).toHaveValue('fixo');
  });

  it('Enter quebra a linha e não envia o formulário', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Textarea aria-label="Nota" />
      </form>,
    );
    await user.type(screen.getByRole('textbox'), 'a{Enter}b');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('ref chega ao textarea', () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea aria-label="Nota" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('redimensiona só na vertical; className vai ao próprio campo', () => {
    render(<Textarea aria-label="Nota" className="max-h-40" />);
    const campo = screen.getByRole('textbox');
    expect(campo).toHaveClass('resize-y');
    expect(campo).toHaveClass('max-h-40');
  });
});
