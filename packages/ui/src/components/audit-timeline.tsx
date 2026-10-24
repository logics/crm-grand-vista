import { useId, useState, type ComponentProps, type Key, type ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { orEmDash } from '../lib/em-dash.js';
import { focusRing } from '../lib/styles.js';
import { Icon, type IconName } from './icon.js';

// Histórico de alterações (a linha do tempo de `components/data/` do export,
// renomeada: é a vista da auditoria). Uma entrada por alteração salva — as
// linhas de `audit_log` de um mesmo `change_id` —, mais nova primeiro, na ordem
// recebida. Cada campo alterado mostra o valor anterior e o novo; o rótulo e a
// formatação chegam prontos, dos metadados de campo. O `kind` do export
// (visita, ligação, reunião…) era tipo de atividade da agenda, não de
// alteração: aqui o glifo é escolhido por entrada.
//
// A lista de campos pode nascer recolhida (`changesLabel`), como os valores
// iniciais da entrada de cadastro, que já estão na ficha. Campo de texto longo
// (`long`) ocupa uma linha truncada; "Ver tudo" abre o valor anterior e o novo
// completos, um embaixo do outro. Sem diff palavra a palavra.

/** Um campo alterado: rótulo legível e os valores já formatados. */
export type AuditTimelineChange = {
  field: ReactNode;
  /** Valor anterior; vazio vira travessão. */
  from?: ReactNode;
  /** Valor novo; vazio vira travessão. */
  to?: ReactNode;
  /** Texto longo: uma linha truncada, com "Ver tudo". */
  long?: boolean;
};

export type AuditTimelineItem = {
  /** Chave da entrada, como o `change_id`; sem ela, vale a posição. */
  id?: Key;
  /** O que aconteceu: "Preço pedido alterado", "Fazenda cadastrada". */
  title: ReactNode;
  /** Instante curto em pt-BR, como "24/07 · 14h30". */
  date?: ReactNode;
  /** Quem salvou. */
  author?: ReactNode;
  /** Observação em texto livre. */
  detail?: ReactNode;
  changes?: AuditTimelineChange[];
  /** Rótulo do botão que abre a lista de campos, como "Ver valores iniciais"; com ele, a lista nasce recolhida. */
  changesLabel?: ReactNode;
  /** Glifo do marcador; lápis por padrão. */
  icon?: IconName;
};

export type AuditTimelineProps = ComponentProps<'ol'> & {
  items: AuditTimelineItem[];
};

export function AuditTimeline({ className, items, ...props }: AuditTimelineProps) {
  return (
    <ol data-slot="audit-timeline" className={cn('flex flex-col', className)} {...props}>
      {items.map((item, index) => {
        const last = index === items.length - 1;
        return (
          <li key={item.id ?? index} className="flex gap-5">
            <div aria-hidden className="flex shrink-0 flex-col items-center">
              {/* 26px do export, somado dos tokens */}
              <span className="grid size-[calc(var(--space-8)+var(--space-1))] place-items-center rounded-pill bg-brand-primary-soft text-brand-primary inset-ring inset-ring-brand-primary-tint">
                <Icon name={item.icon ?? 'pencil'} size="xs" />
              </span>
              {!last && <span className="w-px flex-1 bg-border-default" />}
            </div>
            <div className={cn('min-w-0', !last && 'pb-7')}>
              <div className="flex flex-wrap items-baseline gap-x-5">
                <span className="text-sm font-medium leading-snug text-text-body">{item.title}</span>
                {item.date && <span className="gv-num text-micro text-text-faint">{item.date}</span>}
              </div>
              {item.detail && <p className="mt-1 text-xs leading-normal text-text-muted">{item.detail}</p>}
              {item.changes && item.changes.length > 0 && (
                <AuditTimelineChanges changes={item.changes} label={item.changesLabel} />
              )}
              {item.author && <span className="text-micro text-text-faint">{item.author}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function AuditTimelineChanges({ changes, label }: { changes: AuditTimelineChange[]; label?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const collapsible = label != null;
  return (
    <>
      {collapsible && (
        <DisclosureToggle open={open} onToggle={setOpen} controls={listId} className="mt-2">
          {label}
        </DisclosureToggle>
      )}
      <ul id={listId} hidden={collapsible && !open} className="mt-2 flex flex-col gap-1 text-xs leading-normal">
        {changes.map((change, index) =>
          change.long ? <LongChange key={index} change={change} /> : <ShortChange key={index} change={change} />,
        )}
      </ul>
    </>
  );
}

function ShortChange({ change }: { change: AuditTimelineChange }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3">
      <span className="text-text-muted">{change.field}</span>
      <del className="gv-num text-text-faint">{orEmDash(change.from)}</del>
      <ChangeArrow />
      <ins className="gv-num font-medium text-text-body no-underline">{orEmDash(change.to)}</ins>
    </li>
  );
}

// Fechado, os dois valores dividem a linha, cada um truncado; aberto, vêm
// completos e empilhados, sem o risco do `del`, que num parágrafo atrapalha a
// leitura. O botão fica no mesmo lugar nos dois estados, para não perder o foco.
function LongChange({ change }: { change: AuditTimelineChange }) {
  const [open, setOpen] = useState(false);
  const valuesId = useId();
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center gap-x-3">
        <span className="shrink-0 text-text-muted">{change.field}</span>
        {!open && (
          <span id={valuesId} className="flex min-w-0 flex-1 items-center gap-x-3">
            <del className="min-w-0 flex-1 truncate text-text-faint">{orEmDash(change.from)}</del>
            <ChangeArrow />
            <ins className="min-w-0 flex-1 truncate font-medium text-text-body no-underline">{orEmDash(change.to)}</ins>
          </span>
        )}
        <DisclosureToggle open={open} onToggle={setOpen} controls={valuesId} className={cn('shrink-0', open && 'ml-auto')}>
          {open ? 'Ver menos' : 'Ver tudo'}
        </DisclosureToggle>
      </div>
      {open && (
        <div id={valuesId} className="flex flex-col gap-1">
          <span className="text-micro text-text-faint">Anterior</span>
          <del className="whitespace-pre-line wrap-break-word text-text-muted no-underline">{orEmDash(change.from)}</del>
          <span className="mt-1 text-micro text-text-faint">Novo</span>
          <ins className="whitespace-pre-line wrap-break-word text-text-body no-underline">{orEmDash(change.to)}</ins>
        </div>
      )}
    </li>
  );
}

function ChangeArrow() {
  return <Icon name="arrow-right" size="xs" className="shrink-0 text-text-faint" />;
}

type DisclosureToggleProps = {
  open: boolean;
  onToggle: (open: boolean) => void;
  /** `id` do que o botão abre e fecha. */
  controls: string;
  className?: string;
  children: ReactNode;
};

/** Botão em texto de link que abre e fecha um trecho da entrada; `<button>`, então Enter e Espaço acionam. */
function DisclosureToggle({ open, onToggle, controls, className, children }: DisclosureToggleProps) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={() => onToggle(!open)}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1 rounded-xs text-xs font-medium text-text-link transition-control hover:text-text-link-hover',
        focusRing,
        className,
      )}
    >
      {children}
      <Icon name={open ? 'chevron-up' : 'chevron-down'} size="xs" />
    </button>
  );
}
