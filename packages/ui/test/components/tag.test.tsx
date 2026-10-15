// @vitest-environment jsdom
import '../support/dom.js';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tag } from '../../src/index.js';

describe('Tag', () => {
  it('sem `onRemove`, é só o rótulo', () => {
    render(<Tag icon="map-pin">Alto Paranaíba</Tag>);
    expect(screen.getByText('Alto Paranaíba')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('com `onRemove`, oferece um botão de remover que nomeia a tag', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <Tag selected onRemove={onRemove}>
        Soja
      </Tag>,
    );
    await user.click(screen.getByRole('button', { name: 'Remover Soja' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('remover dentro de um formulário não o envia', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <form onSubmit={onSubmit}>
        <Tag onRemove={() => {}}>Café</Tag>
      </form>,
    );
    await user.click(screen.getByRole('button'));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
