import {
  REFERRER_KIND_LABELS,
  type ReferralChainIssue,
  type ReferralLink,
  type ReferralSubject,
  type Referrer,
  type ReferrerKind,
  type UserOption,
  appendReferralLink,
  assembleReferralChain,
  describeReferralChainIssue,
  isEligibleReferrer,
  referrerKey,
  removeReferralLink,
  reorderReferralChain,
  validateReferralChain,
} from '@crm/shared';
import { type ComponentProps, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn.js';
import { FieldControlContext, type FieldControlProps, useFieldControl } from '../lib/field-control.js';
import { reorderInstructions, useReorder } from '../lib/reorder.js';
import { Input } from '../primitives/input.js';
import { AsyncCombobox, type AsyncComboboxSearch } from './async-combobox.js';
import { Badge } from './badge.js';
import { Button } from './button.js';
import { Icon } from './icon.js';
import { IconButton } from './icon-button.js';
import { UserPicker } from './user-picker.js';

// Cadeia de indicação de um contato ou de uma fazenda ("Pedro ← João ←
// Sebastião"), lida e editada. Controlado: `value` é a lista de elos e
// `onChange` recebe a nova lista, com a posição derivada da ordem (1 = quem
// trouxe direto). Montagem e validação são as de `@crm/shared`, as mesmas da
// API. Não fala com a API: as buscas de usuário e de contato chegam por prop, e
// o seletor só oferece quem pode entrar (não o sujeito, não quem já está).
//
// TODO(#53): a escolha de contato passa ao `ContactPicker` quando ele existir;
// até lá é um `AsyncCombobox` só com o nome.

/** O mínimo que a busca de contato devolve: o `ContactPicker` traz mais. */
export type ReferrerOption = { id: string; name: string };

export type ReferralChainEditorProps = Omit<ComponentProps<'div'>, 'onChange' | 'children' | 'defaultValue'> & {
  /** Quem foi indicado: encabeça a cadeia e nunca entra nela. */
  subject: ReferralSubject;
  /** Os elos; a ordem vem de `position`. */
  value: ReferralLink[];
  /** Nova lista de elos, já renumerada. Sem ela, a cadeia é só leitura. */
  onChange?: (links: ReferralLink[]) => void;
  /** Busca de corretor interno. Sem ela, só entra contato. */
  searchUsers?: AsyncComboboxSearch<UserOption>;
  /** Busca de contato (corretor externo). Sem ela, só entra usuário. */
  searchContacts?: AsyncComboboxSearch<ReferrerOption>;
  readOnly?: boolean;
  disabled?: boolean;
};

/** Elo em exibição, com uma identidade que resiste à reordenação e ao indicador repetido. */
type Row = { id: string; link: ReferralLink; issue?: ReferralChainIssue };

function toRows(subject: ReferralSubject, value: readonly ReferralLink[]): Row[] {
  const chain = assembleReferralChain(value);
  const issues = new Map(validateReferralChain(subject, chain).map((issue) => [issue.position, issue]));
  const seen = new Map<string, number>();
  return chain.map((link) => {
    const key = referrerKey(link.referrer);
    const occurrence = (seen.get(key) ?? 0) + 1;
    seen.set(key, occurrence);
    return { id: occurrence === 1 ? key : `${key}#${occurrence}`, link, issue: issues.get(link.position) };
  });
}

export function ReferralChainEditor({
  className,
  subject,
  value,
  onChange,
  searchUsers,
  searchContacts,
  readOnly = false,
  disabled = false,
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  ...props
}: ReferralChainEditorProps) {
  // o seletor do próximo indicador é o controle que o `Field` nomeia e descreve
  const control = useFieldControl<FieldControlProps>({
    id,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-required': ariaRequired,
  });
  const kinds = (['contact', 'user'] as const).filter((kind) => (kind === 'user' ? searchUsers : searchContacts));
  const [chosenKind, setKind] = useState<ReferrerKind>(kinds[0] ?? 'contact');
  const kind = kinds.includes(chosenKind) ? chosenKind : (kinds[0] ?? 'contact');
  const [announcement, setAnnouncement] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());
  /** Para onde vai o foco depois de uma remoção: o remover de outro elo ou o seletor. */
  const pendingFocus = useRef<string | 'picker' | null>(null);

  const rows = toRows(subject, value);
  const chain = rows.map((row) => row.link);
  const editable = onChange !== undefined && !readOnly;
  const positionById = new Map(rows.map((row) => [row.id, row.link.position]));

  const reorder = useReorder({
    items: rows,
    getId: (row) => row.id,
    getLabel: (row) => row.link.referrer.name,
    onReorder: editable ? (ids) => onChange(reorderReferralChain(chain, ids.map((id) => positionById.get(id)!))) : undefined,
    disabled,
  });

  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;
    if (target === 'picker') root.current?.querySelector<HTMLElement>('[role="combobox"]')?.focus();
    else removeButtons.current.get(target)?.focus();
  });

  const add = (option: ReferrerOption | null) => {
    if (!option || !onChange) return;
    const referrer: Referrer = { kind, id: option.id, name: option.name };
    onChange(appendReferralLink(chain, referrer));
    setAnnouncement(`${referrer.name} entrou na cadeia, na posição ${chain.length + 1}.`);
  };

  const remove = (row: Row, index: number) => {
    if (!onChange) return;
    pendingFocus.current = rows[index + 1]?.id ?? rows[index - 1]?.id ?? 'picker';
    onChange(removeReferralLink(chain, row.link.position));
    setAnnouncement(`${row.link.referrer.name} saiu da cadeia.`);
  };

  const setNotes = (position: number, notes: string) =>
    onChange?.(chain.map((link) => (link.position === position ? { ...link, notes: notes === '' ? null : notes } : link)));

  /** Só oferece quem pode entrar ao fim da cadeia. */
  const eligible =
    <T extends ReferrerOption>(search: AsyncComboboxSearch<T>, kind: ReferrerKind): AsyncComboboxSearch<T> =>
    async (term, options) => {
      const page = await search(term, options);
      return { ...page, items: page.items.filter((item) => isEligibleReferrer(subject, chain, { kind, ...item })) };
    };

  const next = `Quem indicou ${chain.at(-1)?.referrer.name ?? subject.name}?`;
  const picker = {
    value: null,
    onChange: add,
    disabled,
    placeholder: next,
    'aria-label': control.id ? undefined : next,
    ...control,
  };

  return (
    <div
      ref={root}
      data-slot="referral-chain-editor"
      data-disabled={disabled || undefined}
      className={cn('flex flex-col gap-5', className)}
      {...props}
    >
      {/* os controles internos (notas) não herdam o rótulo do `Field` */}
      <FieldControlContext value={{}}>
        {rows.length === 0 ? (
          <p className="m-0 text-sm text-text-muted">Nenhum indicador registrado.</p>
        ) : (
          <>
            <p className="m-0 flex flex-wrap items-center gap-3 text-sm text-text-body">
              <span className="font-medium text-text-heading">{subject.name}</span>
              {rows.map((row) => (
                <span key={row.id} className="inline-flex items-center gap-3">
                  <Icon name="arrow-left" size="sm" aria-hidden className="text-text-faint" />
                  <span className="sr-only">, indicado por </span>
                  {row.link.referrer.name}
                </span>
              ))}
            </p>
            <ol
              aria-label={`Cadeia de indicação de ${subject.name}`}
              className="m-0 flex list-none flex-col gap-4 p-0"
              {...reorder.listProps}
            >
              {reorder.ordered.map((row) => {
                const { referrer, position, notes } = row.link;
                const index = rows.indexOf(row);
                return (
                  <li
                    key={row.id}
                    aria-label={`${position}. ${referrer.name}`}
                    data-moving={reorder.movingId === row.id || undefined}
                    data-invalid={row.issue ? true : undefined}
                    className={cn(
                      'flex flex-col gap-3 rounded-card border border-border-subtle bg-surface-card p-4 transition-control',
                      'data-moving:border-brand-accent data-moving:shadow-ring-focus data-invalid:border-status-danger-fg',
                    )}
                    {...(editable ? reorder.itemProps(row) : {})}
                  >
                    <div className="flex items-center gap-4">
                      {editable && (
                        <IconButton
                          icon="grip-vertical"
                          label={`Mover ${referrer.name}`}
                          size="sm"
                          className="cursor-grab"
                          {...reorder.handleProps(row)}
                        />
                      )}
                      <span aria-hidden className="gv-num w-5 text-center text-sm text-text-faint">
                        {position}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-body">{referrer.name}</span>
                      <Badge size="sm" tone={referrer.kind === 'user' ? 'brand' : 'neutral'}>
                        {REFERRER_KIND_LABELS[referrer.kind]}
                      </Badge>
                      {editable && (
                        <IconButton
                          ref={(element) => {
                            if (element) removeButtons.current.set(row.id, element);
                            else removeButtons.current.delete(row.id);
                          }}
                          icon="trash-2"
                          label={`Remover ${referrer.name}`}
                          size="sm"
                          disabled={disabled}
                          onClick={() => remove(row, index)}
                        />
                      )}
                    </div>
                    {editable ? (
                      <Input
                        size="sm"
                        aria-label={`Nota sobre ${referrer.name}`}
                        placeholder="Nota"
                        value={notes ?? ''}
                        disabled={disabled}
                        onChange={(event) => setNotes(position, event.target.value)}
                      />
                    ) : (
                      notes && <p className="m-0 text-sm text-text-muted">{notes}</p>
                    )}
                    {row.issue && (
                      <p className="m-0 flex items-center gap-2 text-xs text-status-danger-fg">
                        <Icon name="alert-circle" size="xs" />
                        {describeReferralChainIssue(row.issue)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </>
        )}

        {editable && kinds.length > 0 && (
          <div className="flex flex-wrap items-center gap-4">
            {kinds.length > 1 && (
              <div role="group" aria-label="Tipo do indicador" className="inline-flex gap-2">
                {kinds.map((option) => (
                  <Button
                    key={option}
                    size="sm"
                    variant={option === kind ? 'soft' : 'ghost'}
                    aria-pressed={option === kind}
                    disabled={disabled}
                    onClick={() => setKind(option)}
                  >
                    {REFERRER_KIND_LABELS[option]}
                  </Button>
                ))}
              </div>
            )}
            <div className="min-w-0 flex-1">
              {kind === 'user' && searchUsers ? (
                <UserPicker {...picker} search={eligible(searchUsers, 'user')} />
              ) : (
                searchContacts && (
                  <AsyncCombobox<ReferrerOption>
                    {...picker}
                    search={eligible(searchContacts, 'contact')}
                    getKey={(option) => option.id}
                    getLabel={(option) => option.name}
                    searchPlaceholder="Buscar contato"
                  />
                )
              )}
            </div>
          </div>
        )}
      </FieldControlContext>

      <span id={reorder.instructionsId} hidden>
        {reorderInstructions}
      </span>
      <div role="status" className="sr-only">
        {reorder.announcement}
      </div>
      <div role="status" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
