// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ContactShortcuts } from '../../src/index.js';

describe('ContactShortcuts', () => {
  it('WhatsApp abre wa.me em nova aba, telefone abre tel: e e-mail abre mailto:', () => {
    render(<ContactShortcuts name="João" phone="+5564999990000" whatsapp="+351912345678" email="joao@exemplo.com" />);

    const whatsapp = screen.getByRole('link', { name: 'WhatsApp de João' });
    expect(whatsapp).toHaveAttribute('href', 'https://wa.me/351912345678');
    expect(whatsapp).toHaveAttribute('target', '_blank');
    expect(whatsapp).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByRole('link', { name: 'Ligar para João' })).toHaveAttribute('href', 'tel:+5564999990000');
    expect(screen.getByRole('link', { name: 'Enviar e-mail para João' })).toHaveAttribute('href', 'mailto:joao@exemplo.com');
  });

  it('só mostra o atalho do que o contato tem', () => {
    render(<ContactShortcuts name="Maria" phone={null} whatsapp="+5564999990000" email={null} />);

    expect(screen.getByRole('link', { name: 'WhatsApp de Maria' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ligar para Maria' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Enviar e-mail para Maria' })).not.toBeInTheDocument();
  });

  it('sem nenhum meio de contato, não desenha nada', () => {
    const { container } = render(<ContactShortcuts name="Pedro" phone={null} whatsapp={null} email={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('o clique no atalho não chega ao cartão ou à linha que o contém', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(
      <div onClick={onRowClick}>
        <ContactShortcuts name="João" phone="+5564999990000" />
      </div>,
    );
    const link = screen.getByRole('link', { name: 'Ligar para João' });
    link.addEventListener('click', (event) => event.preventDefault());

    await user.click(link);

    expect(onRowClick).not.toHaveBeenCalled();
  });
});
