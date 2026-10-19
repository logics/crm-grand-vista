import {
  type CommissionGroup,
  type CommissionGroupSplit,
  type CommissionIssue,
  type CommissionMember,
  type CommissionMemberSplit,
  type CommissionParty,
  PERCENT_FORMAT,
  REFERRER_KIND_LABELS,
  describeCommissionIssue,
  formatDecimal,
  formatMoney,
  formatPercent,
  referrerKey,
  splitCommission,
  validateCommission,
} from '@crm/shared';
import { type ComponentProps, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn.js';
import { orEmDash } from '../lib/em-dash.js';
import { FieldControlContext, type FieldControlProps, useFieldControl } from '../lib/field-control.js';
import { PartyPicker, type PartySearches } from '../lib/party-picker.js';
import { Input } from '../primitives/input.js';
import { Badge } from './badge.js';
import { Button } from './button.js';
import { Icon } from './icon.js';
import { IconButton } from './icon-button.js';
import { PercentInput } from './percent-input.js';

// Comissão de uma venda: grupos com nome e percentual sobre o valor líquido, e
// os participantes de cada grupo, com percentual próprio opcional — vazio é a
// parte da divisão igual, que o campo mostra. Controlado: `value` é a lista de
// grupos e `onChange` recebe a nova. A conta não é daqui: percentuais efetivos,
// valores em reais e avisos vêm de `splitCommission` e `validateCommission`, de
// `@crm/shared`, os mesmos da API. Não fala com a API: as buscas de usuário e
// de contato chegam por prop.
//
// No modo restrito (`visibility="own"`), mostra só a linha do usuário atual,
// sem colegas, sem valor do grupo e sem total. Quem filtra de verdade é o
// serviço, que nem envia o que o usuário não pode ver; o componente só não
// exibe o que recebe a mais. A conta corre sobre o que chega: sem os colegas,
// a linha do usuário vem com o percentual efetivo preenchido, senão a divisão
// igual lhe daria o grupo inteiro.

export type CommissionVisibility =
  | { visibility?: 'all'; currentUserId?: string }
  /** Sem a permissão de ver a comissão de terceiros: só a linha de `currentUserId`. */
  | { visibility: 'own'; currentUserId: string };

export type CommissionEditorProps = Omit<ComponentProps<'div'>, 'onChange' | 'children' | 'defaultValue'> &
  CommissionVisibility &
  PartySearches & {
    value: CommissionGroup[];
    /** Nova lista de grupos. Sem ela, a comissão é só leitura. */
    onChange?: (groups: CommissionGroup[]) => void;
    /** Valor líquido da venda, base da comissão, em decimal canônico. Sem ele, os valores ficam em travessão. */
    netValue?: string | null;
    readOnly?: boolean;
    disabled?: boolean;
  };

/** Para onde vai o foco depois de uma mudança na lista. */
type FocusTarget =
  | { group: number; to: 'name' | 'picker' }
  | { group: number; to: 'remove-member'; member: number }
  | 'add-group';

// Colunas alinhadas entre a linha do grupo e as dos membros. No mobile, o nome
// ocupa a linha toda e os números descem para a seguinte.
const columns = {
  /** O nome (e o tipo do membro): o que sobra; a linha toda no mobile. */
  name: 'flex min-w-0 flex-1 items-center gap-3 max-mobile:basis-full',
  /** Um percentual de quatro casas ("12,3456" e o sufixo "%"): 104. */
  percent: 'w-[calc(var(--space-12)+var(--space-9))]',
  /** "R$ 9.999.999,99": 120. */
  amount: 'gv-num w-[calc(var(--space-13)+var(--space-8))] text-right text-sm',
};

const groupLabel = (group: CommissionGroup, index: number) => group.name.trim() || `Grupo ${index + 1}`;

const money = (amount: string | null) => orEmDash(amount === null ? null : formatMoney(amount));

/** Parte igual sem o "%", como o campo a exibe: o sufixo já está nele. */
const share = (percent: string) => formatDecimal(percent, PERCENT_FORMAT);

function IssueMessage({ issue }: { issue: CommissionIssue }) {
  return (
    <p className="m-0 flex items-center gap-2 text-xs text-status-danger-fg">
      <Icon name="alert-circle" size="xs" />
      {describeCommissionIssue(issue)}
    </p>
  );
}

export function CommissionEditor({
  className,
  value,
  onChange,
  netValue = null,
  searchUsers,
  searchContacts,
  visibility = 'all',
  currentUserId,
  readOnly = false,
  disabled = false,
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  ...props
}: CommissionEditorProps) {
  // o botão de adicionar grupo é o controle que o `Field` nomeia e descreve
  const control = useFieldControl<FieldControlProps>({
    id,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-required': ariaRequired,
  });
  const [announcement, setAnnouncement] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const addGroupButton = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<FocusTarget | null>(null);

  const own = visibility === 'own';
  const editable = onChange !== undefined && !readOnly && !own;
  const split = splitCommission(netValue, value);
  const issues = validateCommission(value);

  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;
    if (target === 'add-group') return addGroupButton.current?.focus();
    const section = root.current?.querySelector<HTMLElement>(`[data-group="${target.group}"]`);
    const selector = {
      name: '[data-group-name]',
      picker: '[role="combobox"]',
      'remove-member': `[data-member="${'member' in target ? target.member : ''}"] [data-remove-member]`,
    }[target.to];
    section?.querySelector<HTMLElement>(selector)?.focus();
  });

  const updateGroup = (index: number, change: (group: CommissionGroup) => CommissionGroup) =>
    onChange?.(value.map((group, position) => (position === index ? change(group) : group)));

  const addGroup = () => {
    pendingFocus.current = { group: value.length, to: 'name' };
    onChange?.([...value, { name: '', percent: null, members: [] }]);
  };

  const removeGroup = (index: number) => {
    pendingFocus.current = 'add-group';
    onChange?.(value.filter((_, position) => position !== index));
    setAnnouncement(`Grupo ${groupLabel(value[index]!, index)} removido.`);
  };

  const addMember = (index: number, party: CommissionParty) => {
    updateGroup(index, (group) => ({ ...group, members: [...group.members, { party, percent: null }] }));
    setAnnouncement(`${party.name} entrou em ${groupLabel(value[index]!, index)}.`);
  };

  const removeMember = (index: number, memberIndex: number) => {
    const group = value[index]!;
    const remaining = group.members.length - 1;
    // o seguinte assume a posição do removido; sem seguinte, o anterior; sem ninguém, o seletor
    pendingFocus.current =
      remaining === 0
        ? { group: index, to: 'picker' }
        : { group: index, to: 'remove-member', member: Math.min(memberIndex, remaining - 1) };
    updateGroup(index, (current) => ({
      ...current,
      members: current.members.filter((_, position) => position !== memberIndex),
    }));
    setAnnouncement(`${group.members[memberIndex]!.party.name} saiu de ${groupLabel(group, index)}.`);
  };

  const isMine = (member: CommissionMember) => member.party.kind === 'user' && member.party.id === currentUserId;

  const groups = value
    .map((group, index) => ({ group, index, split: split.groups[index]! }))
    .filter(({ group }) => !own || group.members.some(isMine));

  return (
    <div
      ref={root}
      data-slot="commission-editor"
      data-disabled={disabled || undefined}
      className={cn('flex flex-col gap-6', className)}
      {...props}
    >
      {/* os controles internos não herdam o rótulo do `Field` */}
      <FieldControlContext value={{}}>
        {groups.length === 0 && (
          <p className="m-0 text-sm text-text-muted">
            {own ? 'Você não participa desta comissão.' : 'Nenhum grupo de comissão.'}
          </p>
        )}
        {groups.map(({ group, index, split: groupSplit }) => (
          <CommissionGroupSection
            key={index}
            group={group}
            index={index}
            split={groupSplit}
            issues={issues.filter((issue) => issue.group === index)}
            own={own}
            isMine={isMine}
            editable={editable}
            disabled={disabled}
            searchUsers={searchUsers}
            searchContacts={searchContacts}
            onChange={(change) => updateGroup(index, change)}
            onRemove={() => removeGroup(index)}
            onAddMember={(party) => addMember(index, party)}
            onRemoveMember={(memberIndex) => removeMember(index, memberIndex)}
          />
        ))}
      </FieldControlContext>

      {!own && value.length > 0 && (
        <p className="m-0 text-sm text-text-body">
          <span className="font-medium text-text-heading">Comissão total</span>
          {' · '}
          <span className="gv-num">{formatPercent(split.percent)}</span>
          {' · '}
          <span className="gv-num font-medium text-text-heading">{money(split.total)}</span>
        </p>
      )}

      {editable && (
        <div>
          <Button ref={addGroupButton} variant="secondary" size="sm" icon="plus" disabled={disabled} onClick={addGroup} {...control}>
            Adicionar grupo
          </Button>
        </div>
      )}

      <div role="status" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

type CommissionGroupSectionProps = PartySearches & {
  group: CommissionGroup;
  index: number;
  split: CommissionGroupSplit;
  issues: CommissionIssue[];
  own: boolean;
  isMine: (member: CommissionMember) => boolean;
  editable: boolean;
  disabled: boolean;
  onChange: (change: (group: CommissionGroup) => CommissionGroup) => void;
  onRemove: () => void;
  onAddMember: (party: CommissionParty) => void;
  onRemoveMember: (member: number) => void;
};

function CommissionGroupSection({
  group,
  index,
  split,
  issues,
  own,
  isMine,
  editable,
  disabled,
  searchUsers,
  searchContacts,
  onChange,
  onRemove,
  onAddMember,
  onRemoveMember,
}: CommissionGroupSectionProps) {
  const label = groupLabel(group, index);
  const duplicates = new Map(
    issues.flatMap((issue) => (issue.code === 'duplicate_member' ? [[issue.member, issue] as const] : [])),
  );
  const groupIssues = issues.filter((issue) => issue.code !== 'duplicate_member');
  const members = group.members
    .map((member, position) => ({ member, position, split: split.members[position]! }))
    .filter(({ member }) => !own || isMine(member));

  return (
    <section
      aria-label={label}
      data-group={index}
      // grupo com filete, como as linhas do `ReferralChainEditor`
      className="flex flex-col gap-4 border-b border-border-subtle pb-6 last-of-type:border-b-0"
    >
      {editable ? (
        <div className="flex flex-wrap items-center gap-4">
          <Input
            data-group-name
            size="sm"
            className={columns.name}
            aria-label={`Nome do grupo ${index + 1}`}
            placeholder="Nome do grupo"
            value={group.name}
            disabled={disabled}
            onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))}
          />
          <PercentInput
            size="sm"
            className={columns.percent}
            aria-label={`Percentual de ${label}`}
            value={group.percent}
            disabled={disabled}
            onChange={(percent) => onChange((current) => ({ ...current, percent }))}
          />
          <span className={cn(columns.amount, 'font-medium text-text-heading')}>{money(split.amount)}</span>
          <IconButton icon="trash-2" label={`Remover grupo ${label}`} size="sm" disabled={disabled} onClick={onRemove} />
        </div>
      ) : (
        <div className="flex flex-wrap items-baseline gap-4">
          <span className={cn(columns.name, 'truncate text-sm font-medium text-text-heading')}>{label}</span>
          {!own && (
            <>
              <span className={cn(columns.percent, 'gv-num text-right text-sm text-text-muted')}>
                {orEmDash(group.percent && formatPercent(group.percent))}
              </span>
              <span className={cn(columns.amount, 'font-medium text-text-heading')}>{money(split.amount)}</span>
            </>
          )}
        </div>
      )}

      {members.length > 0 && (
        <ul aria-label={`Membros de ${label}`} className="m-0 flex list-none flex-col p-0">
          {members.map(({ member, position, split: memberSplit }) => (
            <CommissionMemberRow
              key={`${referrerKey(member.party)}#${position}`}
              member={member}
              position={position}
              split={memberSplit}
              groupLabel={label}
              duplicate={duplicates.get(position)}
              editable={editable}
              disabled={disabled}
              onPercent={(percent) =>
                onChange((current) => ({
                  ...current,
                  members: current.members.map((entry, at) => (at === position ? { ...entry, percent } : entry)),
                }))
              }
              onRemove={() => onRemoveMember(position)}
            />
          ))}
        </ul>
      )}

      {!own && groupIssues.map((issue) => <IssueMessage key={issue.code} issue={issue} />)}

      {editable && (
        <PartyPicker
          searchUsers={searchUsers}
          searchContacts={searchContacts}
          isEligible={(party) => group.members.every((member) => referrerKey(member.party) !== referrerKey(party))}
          onPick={onAddMember}
          placeholder={`Adicionar membro a ${label}`}
          kindLabel="Tipo do participante"
          disabled={disabled}
        />
      )}
    </section>
  );
}

type CommissionMemberRowProps = {
  member: CommissionMember;
  position: number;
  split: CommissionMemberSplit;
  groupLabel: string;
  duplicate?: CommissionIssue;
  editable: boolean;
  disabled: boolean;
  onPercent: (percent: string | null) => void;
  onRemove: () => void;
};

function CommissionMemberRow({
  member,
  position,
  split,
  groupLabel: group,
  duplicate,
  editable,
  disabled,
  onPercent,
  onRemove,
}: CommissionMemberRowProps) {
  const { party } = member;
  return (
    <li
      aria-label={party.name}
      data-member={position}
      className="flex flex-col gap-2 border-b border-border-subtle py-3 last:border-b-0"
    >
      <div className="flex flex-wrap items-center gap-4">
        <span className={columns.name}>
          <span className="min-w-0 truncate text-sm text-text-body">{party.name}</span>
          <Badge size="sm" tone={party.kind === 'user' ? 'brand' : 'neutral'}>
            {REFERRER_KIND_LABELS[party.kind]}
          </Badge>
        </span>
        {editable ? (
          <PercentInput
            size="sm"
            className={columns.percent}
            aria-label={`Percentual de ${party.name} em ${group}`}
            // vazio é a divisão igual: o campo mostra a parte que cabe ao membro
            placeholder={share(split.percent)}
            value={member.percent}
            disabled={disabled}
            onChange={onPercent}
          />
        ) : (
          <span className={cn(columns.percent, 'gv-num text-right text-sm text-text-muted')}>{formatPercent(split.percent)}</span>
        )}
        <span className={cn(columns.amount, 'text-text-body')}>{money(split.amount)}</span>
        {editable && (
          <IconButton
            data-remove-member
            icon="trash-2"
            label={`Remover ${party.name} de ${group}`}
            size="sm"
            disabled={disabled}
            onClick={onRemove}
          />
        )}
      </div>
      {duplicate && <IssueMessage issue={duplicate} />}
    </li>
  );
}
