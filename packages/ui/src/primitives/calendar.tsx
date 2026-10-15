import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import type { ComponentProps } from 'react';
import { type ChevronProps, DayButton, type DayButtonProps, DayPicker } from 'react-day-picker';
import { ptBR } from 'react-day-picker/locale/pt-BR';
import { cn } from '../lib/cn.js';
import { disabledControl, focusRing, iconStroke } from '../lib/styles.js';

// Calendário do shadcn sobre o react-day-picker: grade com setas, PageUp/PageDown
// entre meses, Home/End na semana, rótulos em português. É a base do
// `DateRangePicker` (com o Popover), que pertence à spec do módulo que o usar.

const chevrons = { left: ChevronLeft, right: ChevronRight, up: ChevronUp, down: ChevronDown } as const;

function CalendarChevron({ orientation = 'left', className }: ChevronProps) {
  const Icon = chevrons[orientation];
  return <Icon className={cn('size-6', className)} strokeWidth={iconStroke} />;
}

const navButton = cn(
  'inline-flex size-control-height-sm cursor-pointer items-center justify-center rounded-pill text-text-muted',
  'transition-control hover:bg-surface-hover hover:text-text-body',
  focusRing,
  disabledControl,
);

/**
 * O react-day-picker marca seleção e intervalo na célula, em classes que se
 * sobrepõem (um dia no meio do intervalo também é "selecionado"). O botão
 * recebe um estado só, para que as cores não disputem a ordem do CSS.
 */
function CalendarDayButton({ className, day, modifiers, ...props }: DayButtonProps) {
  const { selected, range_start, range_middle, range_end, today } = modifiers;
  return (
    <DayButton
      day={day}
      modifiers={modifiers}
      data-selected-single={(selected && !range_start && !range_middle && !range_end) || undefined}
      data-range-start={range_start || undefined}
      data-range-middle={range_middle || undefined}
      data-range-end={range_end || undefined}
      data-today={today || undefined}
      className={cn(
        'inline-flex size-control-height-sm cursor-pointer items-center justify-center rounded-pill text-sm',
        'transition-control hover:bg-surface-hover disabled:cursor-not-allowed',
        'data-today:font-semibold data-today:inset-ring data-today:inset-ring-border-accent',
        'data-selected-single:bg-brand-primary data-selected-single:text-brand-on-primary',
        'data-range-start:bg-brand-primary data-range-start:text-brand-on-primary',
        'data-range-end:bg-brand-primary data-range-end:text-brand-on-primary',
        'data-range-middle:text-text-heading data-range-middle:hover:bg-brand-primary-tint',
        focusRing,
        className,
      )}
      {...props}
    />
  );
}

export type CalendarProps = ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  components,
  locale = ptBR,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      data-slot="calendar"
      locale={locale}
      showOutsideDays={showOutsideDays}
      className={cn('relative w-fit p-6', className)}
      classNames={{
        months: 'flex flex-wrap gap-8',
        month: 'flex flex-col gap-5',
        nav: 'absolute inset-x-6 top-6 flex items-center justify-between',
        button_previous: navButton,
        button_next: navButton,
        month_caption: 'flex h-control-height-sm items-center justify-center',
        caption_label: 'text-sm font-medium capitalize text-text-heading',
        month_grid: 'border-collapse',
        weekdays: 'flex',
        weekday: 'w-control-height-sm font-mono text-label font-regular uppercase text-text-faint',
        week: 'mt-2 flex',
        day: 'p-0 text-center',
        range_start: 'rounded-l-pill bg-brand-primary-soft',
        range_middle: 'bg-brand-primary-soft',
        range_end: 'rounded-r-pill bg-brand-primary-soft',
        outside: 'text-text-disabled',
        disabled: 'opacity-45',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{ Chevron: CalendarChevron, DayButton: CalendarDayButton, ...components }}
      {...props}
    />
  );
}
