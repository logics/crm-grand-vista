import React from 'react';
import { Input } from './Input.jsx';
import { Button } from '../core/Button.jsx';

export function SearchBar({ placeholder = 'Buscar…', filters, onSubmit, buttonLabel = 'Buscar', bare = false, style, ...rest }) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit && onSubmit(e); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap',
        ...(bare ? null : { padding: 10, background: 'var(--surface-card)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-sm)' }),
        ...style,
      }}
      {...rest}
    >
      <Input pill icon="search" placeholder={placeholder} style={{ flex: '1 1 220px' }} />
      {filters}
      <Button type="submit" icon="sliders-horizontal">{buttonLabel}</Button>
    </form>
  );
}
