import {
  type CommissionGroup,
  type CommissionGroupSplit,
  type CommissionIssue,
  type CommissionMember,
  type CommissionMemberSplit,
  type CommissionParty,
  type CommissionSplit,
  PERCENT_FORMAT,
  REFERRER_KIND_LABELS,
  compareDecimal,
  describeCommissionIssue,
  formatDecimal,
  formatMoney,
  formatPercent,
  referrerKey,
  splitCommission,
  validateCommission,
} from '@crm/shared';
import { type ComponentProps, useId, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn.js';
import { orEmDash } from '../lib/em-dash.js';
import { FieldControlContext, type FieldControlProps, useFieldControl, useFieldLabelId } from '../lib/field-control.js';
import { PartyPicker, type PartySearches } from '../lib/party-picker.js';
import { mobileTouchTarget } from '../lib/styles.js';
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
// O resumo abre o editor: a base (valor líquido) e a comissão total, e, quando
// as sobrescritas não fecham, o que os membros recebem de fato. Cada aviso fica
// junto do grupo ou do membro e descreve os campos que o causam.
//
// No modo restrito (`visibility="own"`), mostra só a linha do usuário atual,
// sem colegas, sem resumo e sem valor do grupo. Quem filtra de verdade é o
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
  | { group: number; to: 'name' | 'add-member' }
  | { group: number; to: 'remove-member'; member: number }
  | 'undo';

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

/** Lixeira e fechar: compactos, crescem para o dedo no mobile. */
const rowAction = { size: 'sm', className: mobileTouchTarget.square } as const;

const groupLabel = (group: CommissionGroup, index: number) => group.name.trim() || `Grupo ${index + 1}`;

const money = (amount: string | null) => orEmDash(amount === null ? null : formatMoney(amount));

/** Parte igual sem o "%", como o campo a exibe: o sufixo já está nele. */
const share = (percent: string) => formatDecimal(percent, PERCENT_FORMAT);

/** Id do aviso, para os campos que o causam o apontarem em `aria-describedby`. */
const issueId = (prefix: string, issue: CommissionIssue) =>
  issue.code === 'duplicate_member' ? `${prefix}g${issue.group}m${issue.member}` : `${prefix}g${issue.group}${issue.code}`;

/** `aria-describedby` e `aria-invalid` de um campo, pelos avisos que ele causa. */
const describedBy = (prefix: string, issues: readonly CommissionIssue[]) =>
  issues.length === 0
    ? {}
    : { 'aria-describedby': issues.map((issue) => issueId(prefix, issue)).join(' '), 'aria-invalid': true as const };

/** Erro é vermelho; o grupo ainda sem membros é só o próximo passo, em cinza. */
function IssueMessage({ prefix, issue }: { prefix: string; issue: CommissionIssue }) {
  const pending = issue.code === 'empty_group';
  return (
    <p
      id={issueId(prefix, issue)}
      className={cn('m-0 flex items-start gap-2 text-xs', pending ? 'text-text-muted' : 'text-status-danger-fg')}
    >
      <Icon name="alert-circle" size="xs" className="mt-px shrink-0" />
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
  // o editor todo é o controle do `Field`: um grupo, nomeado pelo rótulo e
  // descrito pela dica, sem roubar o nome dos campos e botões de dentro
  const control = useFieldControl<FieldControlProps>({
    id,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-required': ariaRequired,
  });
  const labelId = useFieldLabelId();
  const prefix = useId();
  const [announcement, setAnnouncement] = useState('');
  const [removed, setRemoved] = useState<{ group: CommissionGroup; index: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const undoButton = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<FocusTarget | null>(null);

  const own = visibility === 'own';
  const editable = onChange !== undefined && !readOnly && !own;
  const split = splitCommission(netValue, value);
  const issues = validateCommission(value);

  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;
    if (target === 'undo') return undoButton.current?.focus();
    const section = root.current?.querySelector<HTMLElement>(`[data-group="${target.group}"]`);
    const selectors = {
      name: ['[data-group-name]'],
      // com membros, o botão de adicionar; o grupo que ficou vazio já mostra o seletor
      'add-member': ['[data-add-member]', '[role="combobox"]'],
      'remove-member': [`[data-member="${'member' in target ? target.member : ''}"] [data-remove-member]`],
    }[target.to];
    const element = selectors.map((selector) => section?.querySelector<HTMLElement>(selector)).find(Boolean);
    element?.focus();
  });

  const updateGroup = (index: number, change: (group: CommissionGroup) => CommissionGroup) =>
    onChange?.(value.map((group, position) => (position === index ? change(group) : group)));

  const addGroup = () => {
    pendingFocus.current = { group: value.length, to: 'name' };
    onChange?.([...value, { name: '', percent: null, members: [] }]);
  };

  const removeGroup = (index: number) => {
    const group = value[index]!;
    pendingFocus.current = 'undo';
    setRemoved({ group, index });
    onChange?.(value.filter((_, position) => position !== index));
    setAnnouncement(`Grupo ${groupLabel(group, index)} removido.`);
  };

  const undoRemoval = () => {
    if (!removed) return;
    const index = Math.min(removed.index, value.length);
    pendingFocus.current = { group: index, to: 'name' };
    onChange?.([...value.slice(0, index), removed.group, ...value.slice(index)]);
    setAnnouncement(`Grupo ${groupLabel(removed.group, index)} restaurado.`);
    setRemoved(null);
  };

  const addMember = (index: number, party: CommissionParty) => {
    // o seletor fecha: o foco volta ao botão de adicionar membro
    pendingFocus.current = { group: index, to: 'add-member' };
    updateGroup(index, (group) => ({ ...group, members: [...group.members, { party, percent: null }] }));
    setAnnouncement(`${party.name} entrou em ${groupLabel(value[index]!, index)}.`);
  };

  const removeMember = (index: number, memberIndex: number) => {
    const group = value[index]!;
    const remaining = group.members.length - 1;
    // o seguinte assume a posição do removido; sem seguinte, o anterior; sem ninguém, o seletor
    pendingFocus.current =
      remaining === 0
        ? { group: index, to: 'add-member' }
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
      role="group"
      id={control.id}
      aria-labelledby={labelId}
      aria-describedby={control['aria-describedby']}
      aria-invalid={control['aria-invalid']}
      data-slot="commission-editor"
      data-disabled={disabled || undefined}
      className={cn('flex flex-col gap-6', className)}
      {...props}
    >
      {!own && value.length > 0 && <CommissionSummary netValue={netValue} split={split} editable={editable} />}

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
            prefix={prefix}
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

      {editable && (
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            className={mobileTouchTarget.bar}
            disabled={disabled}
            onClick={addGroup}
          >
            Adicionar grupo
          </Button>
          {removed && (
            <p className="m-0 flex items-center gap-3 text-sm text-text-muted">
              Grupo {groupLabel(removed.group, removed.index)} removido.
              <Button
                ref={undoButton}
                variant="ghost"
                size="sm"
                className={mobileTouchTarget.bar}
                aria-label={`Desfazer a remoção de ${groupLabel(removed.group, removed.index)}`}
                disabled={disabled}
                onClick={undoRemoval}
              >
                Desfazer
              </Button>
            </p>
          )}
        </div>
      )}

      <div role="status" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

/**
 * A base e o resultado, antes dos grupos: o valor líquido e a comissão total,
 * em destaque. Se os membros recebem mais ou menos que o total (sobrescritas
 * que não fecham, grupo sem membros), diz quanto recebem de fato.
 */
function CommissionSummary({
  netValue,
  split,
  editable,
}: {
  netValue: string | null;
  split: CommissionSplit;
  editable: boolean;
}) {
  const { total, paid } = split;
  const gap = total !== null && paid !== null ? compareDecimal(paid, total) : 0;
  return (
    <div
      role="group"
      aria-label="Resumo da comissão"
      className="flex flex-wrap items-end gap-x-10 gap-y-4 rounded-card bg-surface-muted px-6 py-5"
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs text-text-muted">Valor líquido</span>
        <span className="gv-num text-sm font-medium text-text-body">{money(netValue)}</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-text-muted">Comissão total</span>
        <span className="gv-num text-h3 font-semibold tracking-heading text-text-heading">
          {formatPercent(split.percent)} · {money(total)}
        </span>
      </div>
      {gap !== 0 && (
        <p className="m-0 flex basis-full items-start gap-2 text-xs text-status-danger-fg">
          <Icon name="alert-circle" size="xs" className="mt-px shrink-0" />
          Os membros recebem {money(paid)}, {gap > 0 ? 'acima' : 'abaixo'} do total.
        </p>
      )}
      {editable && (
        <p className="m-0 basis-full text-xs text-text-muted">
          Percentual do membro em branco divide o grupo em partes iguais.
        </p>
      )}
    </div>
  );
}

type CommissionGroupSectionProps = PartySearches & {
  prefix: string;
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
  prefix,
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
  const [adding, setAdding] = useState(false);
  const pickerBox = useRef<HTMLDivElement>(null);
  const addMemberButton = useRef<HTMLButtonElement>(null);
  const focusAfterToggle = useRef<'picker' | 'button' | null>(null);

  useLayoutEffect(() => {
    const target = focusAfterToggle.current;
    focusAfterToggle.current = null;
    if (target === 'picker') pickerBox.current?.querySelector<HTMLElement>('[role="combobox"]')?.focus();
    else if (target === 'button') addMemberButton.current?.focus();
  });

  const label = groupLabel(group, index);
  const duplicates = new Map(
    issues.flatMap((issue) => (issue.code === 'duplicate_member' ? [[issue.member, issue] as const] : [])),
  );
  const groupIssues = issues.filter((issue) => issue.code !== 'duplicate_member');
  // a soma que não fecha é causada pelos percentuais próprios; o grupo vazio, pelo seletor
  const overrideIssues = groupIssues.filter((issue) => issue.code !== 'empty_group');
  const emptyIssues = groupIssues.filter((issue) => issue.code === 'empty_group');
  const members = group.members
    .map((member, position) => ({ member, position, split: split.members[position]! }))
    .filter(({ member }) => !own || isMine(member));
  // sem membros, escolher o primeiro é o único passo: o seletor já fica aberto
  const pickerOpen = adding || group.members.length === 0;

  const openPicker = () => {
    focusAfterToggle.current = 'picker';
    setAdding(true);
  };
  const closePicker = () => {
    focusAfterToggle.current = 'button';
    setAdding(false);
  };
  const pick = (party: CommissionParty) => {
    setAdding(false);
    onAddMember(party);
  };

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
          <IconButton icon="trash-2" label={`Remover grupo ${label}`} {...rowAction} disabled={disabled} onClick={onRemove} />
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
          {members.map(({ member, position, split: memberSplit }) => {
            const duplicate = duplicates.get(position);
            const causes = [...(member.percent === null ? [] : overrideIssues), ...(duplicate ? [duplicate] : [])];
            return (
              <CommissionMemberRow
                key={`${referrerKey(member.party)}#${position}`}
                prefix={prefix}
                member={member}
                position={position}
                split={memberSplit}
                groupLabel={label}
                duplicate={duplicate}
                percentProps={describedBy(prefix, causes)}
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
            );
          })}
        </ul>
      )}

      {!own && groupIssues.map((issue) => <IssueMessage key={issue.code} prefix={prefix} issue={issue} />)}

      {/* o seletor fica montado e só se mostra: recém-montado, o gatilho do Radix
          é reembrulhado num efeito e perderia o foco que recebesse ao abrir */}
      {editable && (
        <>
          <div ref={pickerBox} hidden={!pickerOpen} className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <PartyPicker
                searchUsers={searchUsers}
                searchContacts={searchContacts}
                defaultKind="user"
                isEligible={(party) => group.members.every((entry) => referrerKey(entry.party) !== referrerKey(party))}
                onPick={pick}
                placeholder={`Quem entra em ${label}?`}
                kindLabel="Tipo do participante"
                disabled={disabled}
                // o grupo vazio é o próximo passo, não erro de quem escolhe: só descreve
                aria-describedby={describedBy(prefix, emptyIssues)['aria-describedby']}
              />
            </div>
            {group.members.length > 0 && (
              <IconButton
                icon="x"
                label={`Fechar a busca de membro de ${label}`}
                {...rowAction}
                disabled={disabled}
                onClick={closePicker}
              />
            )}
          </div>
          {!pickerOpen && (
            <div>
              <Button
                ref={addMemberButton}
              data-add-member
              variant="ghost"
              size="sm"
              icon="plus"
              className={mobileTouchTarget.bar}
              aria-label={`Adicionar membro a ${label}`}
              disabled={disabled}
              onClick={openPicker}
            >
                Adicionar membro
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

type CommissionMemberRowProps = {
  prefix: string;
  member: CommissionMember;
  position: number;
  split: CommissionMemberSplit;
  groupLabel: string;
  duplicate?: CommissionIssue;
  /** `aria-describedby` e `aria-invalid` do percentual, pelos avisos que ele causa. */
  percentProps: ReturnType<typeof describedBy>;
  editable: boolean;
  disabled: boolean;
  onPercent: (percent: string | null) => void;
  onRemove: () => void;
};

function CommissionMemberRow({
  prefix,
  member,
  position,
  split,
  groupLabel: group,
  duplicate,
  percentProps,
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
            {...percentProps}
          />
        ) : (
          <span className={cn(columns.percent, 'gv-num text-right text-sm text-text-muted')}>
            {formatPercent(split.percent)}
          </span>
        )}
        {/* o valor e, abaixo, quanto o membro leva da venda: a conta que ninguém faz de cabeça */}
        <span className={cn(columns.amount, 'flex flex-col')}>
          <span className="text-text-body">{money(split.amount)}</span>
          <span className="text-xs text-text-faint">{formatPercent(split.salePercent)} da venda</span>
        </span>
        {editable && (
          <IconButton
            data-remove-member
            icon="trash-2"
            label={`Remover ${party.name} de ${group}`}
            {...rowAction}
            disabled={disabled}
            onClick={onRemove}
          />
        )}
      </div>
      {duplicate && <IssueMessage prefix={prefix} issue={duplicate} />}
    </li>
  );
}
