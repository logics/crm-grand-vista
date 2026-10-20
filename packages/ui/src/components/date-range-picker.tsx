import { type Matcher, dateMatchModifiers } from 'react-day-picker';
import {
  type ComponentProps,
  type FocusEvent,
  type KeyboardEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useBelowBreakpoint } from '../lib/breakpoints.js';
import { cn } from '../lib/cn.js';
import {
  type DateRangePreset,
  type DateRangeValue,
  currentDay,
  defaultDateRangePresets,
  formatDisplayDate,
  maskDateInput,
  parseDisplayDate,
  parseIsoDate,
  toIsoDate,
} from '../lib/date-range.js';
import { useFieldControl, useFieldLabelId } from '../lib/field-control.js';
import { type FieldSize, fieldFrameSurface, fieldSize, focusRing } from '../lib/styles.js';
import { Calendar } from '../primitives/calendar.js';
import { Popover, PopoverAnchor, PopoverContent } from '../primitives/popover.js';
import { Icon } from './icon.js';
import { IconButton } from './icon-button.js';

// Seletor de período (Calendar + Popover), com o comportamento do `RangePicker`
// do AntDesign: um campo "início → fim" que se digita (máscara dd/mm/aaaa) ou se
// preenche pelo calendário de dois meses, com atalhos de período ao lado. O
// texto digitado e o calendário andam juntos.
//
// O valor é `{ from, to }` em strings ISO `aaaa-mm-dd` (ver `lib/date-range`) e
// só muda com o intervalo completo e válido, ou vazio: digitação incompleta,
// inexistente, invertida ou em dia desabilitado não altera o valor, e o texto
// volta ao valor quando o foco sai. O primeiro clique no calendário só marca o
// início; o intervalo se completa no segundo clique. Fechar antes disso o
// descarta. A obrigatoriedade das duas pontas fica no schema do formulário.
//
// Teclado: digitar, clicar no campo ou a seta para baixo abrem o calendário; a
// seta para baixo leva o foco ao calendário, onde as setas andam pelos dias;
// Esc fecha e devolve o foco ao campo.

export type DateRangePickerProps = Pick<
  ComponentProps<'input'>,
  'id' | 'aria-label' | 'aria-labelledby' | 'aria-describedby' | 'aria-invalid' | 'aria-required'
> & {
  /** Intervalo controlado, em `aaaa-mm-dd`. */
  value?: DateRangeValue;
  defaultValue?: DateRangeValue;
  /** Recebe o intervalo completo, ou `{}` ao limpar. */
  onChange?: (range: DateRangeValue) => void;
  /** Foco saiu do campo e do calendário (o "tocado" do React Hook Form). */
  onBlur?: () => void;
  /** Dias que não podem ser escolhidos: antes/depois de uma data, intervalo, lista ou função. */
  disabledDates?: Matcher | Matcher[];
  /** Atalhos do painel; `[]` esconde a coluna. Sem ela: últimos 7 dias, este mês, mês passado e este ano. */
  presets?: DateRangePreset[];
  /** O "hoje" dos atalhos e do destaque do calendário; fixá-lo mantém a vitrine e os testes estáveis. */
  today?: Date;
  /** sm 32 · md 40 · lg 48 (lg nos formulários do mobile). */
  size?: FieldSize;
  disabled?: boolean;
  /** Abre já na montagem (vitrine do Storybook). */
  defaultOpen?: boolean;
  /** Vai para a moldura, que é quem ocupa o layout. */
  className?: string;
};

type Side = 'from' | 'to';
type Texts = Record<Side, string>;

const sideLabel: Record<Side, string> = { from: 'Data inicial', to: 'Data final' };

const textsOf = (range: DateRangeValue): Texts => ({
  from: formatDisplayDate(range.from),
  to: formatDisplayDate(range.to),
});

const presetButton = cn(
  'cursor-pointer rounded-xs px-4 py-3 text-left text-sm text-text-body whitespace-nowrap transition-control',
  'hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent',
  'aria-pressed:bg-brand-primary-soft aria-pressed:font-medium aria-pressed:text-text-heading',
  focusRing,
);

export function DateRangePicker({
  value: valueProp,
  defaultValue,
  onChange,
  onBlur,
  disabledDates,
  presets,
  today: todayProp,
  size = 'md',
  disabled = false,
  defaultOpen = false,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...fieldProps
}: DateRangePickerProps) {
  const control = useFieldControl(fieldProps);
  const labelId = useFieldLabelId();
  const mobile = useBelowBreakpoint('mobile');

  const [inner, setInner] = useState<DateRangeValue>(defaultValue ?? {});
  const value = valueProp ?? inner;
  const [texts, setTexts] = useState<Texts>(() => textsOf(value));
  /** Início escolhido no calendário, à espera do fim. */
  const [anchor, setAnchor] = useState<string>();
  const [open, setOpen] = useState(defaultOpen);
  /** Mês mostrado, quando o usuário o navegou ou o valor o moveu; sem ele, o do início do valor. */
  const [shownMonth, setMonth] = useState<Date>();
  const [synced, setSynced] = useState(value);

  const groupRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const inputs = useRef<Record<Side, HTMLInputElement | null>>({ from: null, to: null });
  const focusCalendarOnOpen = useRef(false);
  const interactedOutside = useRef(false);

  const today = useMemo(() => todayProp ?? currentDay(), [todayProp]);
  const month = shownMonth ?? parseIsoDate(value.from) ?? today;
  const shortcuts = useMemo(() => presets ?? defaultDateRangePresets(today), [presets, today]);

  const isDisabledDate = (iso: string) => {
    const date = parseIsoDate(iso);
    return !date || (disabledDates !== undefined && dateMatchModifiers(date, disabledDates));
  };

  // O valor mudou (clique, atalho, digitação aceita ou o formulário o trocou):
// o texto e o calendário o seguem.
  if (synced.from !== value.from || synced.to !== value.to) {
    setSynced(value);
    setTexts(textsOf(value));
    setAnchor(undefined);
    setMonth(parseIsoDate(value.from));
  }

  const commit = (range: DateRangeValue) => {
    if (range.from !== value.from || range.to !== value.to) {
      setInner(range);
      onChange?.(range);
    }
    setTexts(textsOf(range));
    setAnchor(undefined);
  };

  /** Fecha o calendário e descarta o que não foi confirmado: texto solto e início sem fim. */
  const close = () => {
    setOpen(false);
    setTexts(textsOf(value));
    setAnchor(undefined);
  };

  const type = (side: Side, raw: string) => {
    const next: Texts = { ...texts, [side]: maskDateInput(raw, texts[side]) };
    setTexts(next);
    setAnchor(undefined);
    setOpen(true);
    if (!next.from && !next.to) return commit({});
    const from = parseDisplayDate(next.from);
    const to = parseDisplayDate(next.to);
    if (from && to && from <= to && !isDisabledDate(from) && !isDisabledDate(to)) {
      commit({ from, to });
    }
  };

  const pickDay = (day: Date) => {
    const iso = toIsoDate(day);
    if (!anchor) {
      setAnchor(iso);
      setTexts({ from: formatDisplayDate(iso), to: '' });
      return;
    }
    const [from, to] = anchor <= iso ? [anchor, iso] : [iso, anchor];
    commit({ from, to });
    setOpen(false);
  };

  const focusCalendar = () => {
    contentRef.current?.querySelector<HTMLButtonElement>('table button[tabindex="0"]')?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'ArrowDown') return;
    event.preventDefault();
    if (open) return focusCalendar();
    focusCalendarOnOpen.current = true;
    setOpen(true);
  };

  const onGroupBlur = (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    if (next && (groupRef.current?.contains(next) || contentRef.current?.contains(next))) return;
    onBlur?.();
    if (!open) setTexts(textsOf(value));
  };

  const complete = parseIsoDate(anchor ? undefined : value.from) && parseIsoDate(value.to);
  const hasText = Boolean(texts.from || texts.to);
  const draft = anchor
    ? { from: parseIsoDate(anchor) }
    : { from: parseIsoDate(value.from), to: parseIsoDate(value.to) };

  /** Texto completo que não vira uma data utilizável: marca a ponta como inválida. */
  const sideInvalid = (side: Side) => {
    const iso = parseDisplayDate(texts[side]);
    if (texts[side].length < 10) return false;
    if (!iso || isDisabledDate(iso)) return true;
    const from = parseDisplayDate(texts.from);
    const to = parseDisplayDate(texts.to);
    return side === 'to' && Boolean(from && to && from > to);
  };

  const input = (side: Side) => (
    <input
      key={side}
      ref={(element) => {
        inputs.current[side] = element;
      }}
      data-slot="date-range-input"
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="dd/mm/aaaa"
      aria-label={sideLabel[side]}
      aria-invalid={sideInvalid(side) || control['aria-invalid']}
      aria-required={control['aria-required']}
      aria-describedby={control['aria-describedby']}
      id={side === 'from' ? control.id : undefined}
      disabled={disabled}
      value={texts[side]}
      onChange={(event) => type(side, event.target.value)}
      onKeyDown={onKeyDown}
      className={cn(
        'h-full min-w-0 flex-1 bg-transparent text-center text-text-body outline-none focus-visible:shadow-none',
        'placeholder:text-text-faint disabled:cursor-not-allowed',
      )}
    />
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
    >
      <PopoverAnchor asChild>
        <div
          ref={groupRef}
          role="group"
          data-slot="date-range-picker"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy ?? (ariaLabel ? undefined : labelId)}
          onClick={() => !disabled && setOpen(true)}
          onBlur={onGroupBlur}
          className={cn(fieldFrameSurface, fieldSize[size], 'flex items-center gap-4 rounded-input pl-5 pr-2', className)}
        >
          {input('from')}
          <Icon name="arrow-right" size="sm" className="shrink-0 text-text-faint" />
          {input('to')}
          {hasText && !disabled && (
            <IconButton
              icon="x"
              label="Limpar período"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                commit({});
                inputs.current.from?.focus();
              }}
            />
          )}
          <IconButton
            icon="calendar"
            label="Abrir calendário"
            size="sm"
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={(event) => {
              event.stopPropagation();
              if (open) close();
              else setOpen(true);
            }}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        ref={contentRef}
        align="start"
        aria-label="Escolher período"
        className="flex w-auto p-0 max-mobile:max-w-[calc(100vw-var(--space-8))] max-mobile:flex-col"
        onOpenAutoFocus={(event) => {
          // o foco fica no campo, para seguir digitando; só a seta para baixo o leva ao calendário
          event.preventDefault();
          if (focusCalendarOnOpen.current) focusCalendar();
          focusCalendarOnOpen.current = false;
        }}
        onInteractOutside={(event) => {
          if (groupRef.current?.contains(event.target as Node)) return event.preventDefault();
          interactedOutside.current = true;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (interactedOutside.current) interactedOutside.current = false;
          else if (!groupRef.current?.contains(document.activeElement)) inputs.current.from?.focus();
        }}
      >
        {shortcuts.length > 0 && (
          <div
            data-slot="date-range-presets"
            className="flex flex-col gap-1 border-r border-border-subtle p-4 max-mobile:flex-row max-mobile:flex-wrap max-mobile:border-b max-mobile:border-r-0"
          >
            {shortcuts.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={presetButton}
                aria-pressed={complete ? preset.range.from === value.from && preset.range.to === value.to : false}
                disabled={isDisabledDate(preset.range.from) || isDisabledDate(preset.range.to)}
                onClick={() => {
                  commit(preset.range);
                  setOpen(false);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
        <Calendar
          mode="range"
          selected={draft}
          // sem `onSelect` o react-day-picker trata `selected` só como valor inicial; a regra de escolha é `pickDay`
          onSelect={() => {}}
          onDayClick={pickDay}
          month={month}
          onMonthChange={setMonth}
          numberOfMonths={mobile ? 1 : 2}
          disabled={disabledDates}
          today={today}
        />
      </PopoverContent>
    </Popover>
  );
}
