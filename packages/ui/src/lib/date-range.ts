// Datas do `DateRangePicker`. O valor trafega como string ISO `aaaa-mm-dd` (a
// mesma que o Zod valida na borda e o Postgres guarda em `date`), nunca como
// `Date`: a string não tem fuso, então o dia não anda uma casa para trás
// entre o navegador e a API. O `Date` só existe aqui dentro, em hora local,
// para falar com o Calendar.

/** Intervalo completo ou vazio; o componente nunca entrega só uma ponta. */
export type DateRangeValue = { from?: string; to?: string };

/** Atalho de período: o rótulo e o intervalo que ele escolhe. */
export type DateRangePreset = { label: string; range: { from: string; to: string } };

/** O dia de hoje, no relógio do navegador; fixado por montagem, quem precisa de um dia certo passa `today`. */
export const currentDay = () => new Date();

const pad = (n: number, size = 2) => String(n).padStart(size, '0');

export function toIsoDate(date: Date): string {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A data local de uma string `aaaa-mm-dd`; `undefined` se não existir no calendário. */
export function parseIsoDate(iso: string | undefined): Date | undefined {
  const match = iso && /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return undefined;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  date.setFullYear(year); // anos abaixo de 100 não viram 19xx
  const real = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return real ? date : undefined;
}

/** `aaaa-mm-dd` → `dd/mm/aaaa`; vazio se não houver data. */
export function formatDisplayDate(iso: string | undefined): string {
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '';
}

/** `dd/mm/aaaa` completo e real → `aaaa-mm-dd`; qualquer outra coisa é `undefined`. */
export function parseDisplayDate(text: string): string | undefined {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return undefined;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  return parseIsoDate(iso) ? iso : undefined;
}

/**
 * Máscara `dd/mm/aaaa`: fica só com os dígitos e põe as barras. Apagar uma
 * barra (o texto novo é o anterior sem o último caractere, que era a barra)
 * apaga também o dígito antes dela; do contrário a máscara a recolocaria e o
 * cursor não andaria para trás.
 */
export function maskDateInput(next: string, previous: string): string {
  let digits = next.replace(/\D/g, '');
  if (next.length < previous.length && previous.endsWith('/') && next === previous.slice(0, -1)) {
    digits = digits.slice(0, -1);
  }
  digits = digits.slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean);
  return parts.join('/');
}

/** Atalhos do período, relativos a `today`: últimos 7 dias, este mês, mês passado, este ano. */
export function defaultDateRangePresets(today: Date): DateRangePreset[] {
  const [year, month, day] = [today.getFullYear(), today.getMonth(), today.getDate()];
  const iso = (y: number, m: number, d: number) => toIsoDate(new Date(y, m, d));
  return [
    { label: 'Últimos 7 dias', range: { from: iso(year, month, day - 6), to: iso(year, month, day) } },
    { label: 'Este mês', range: { from: iso(year, month, 1), to: iso(year, month + 1, 0) } },
    { label: 'Mês passado', range: { from: iso(year, month - 1, 1), to: iso(year, month, 0) } },
    { label: 'Este ano', range: { from: iso(year, 0, 1), to: iso(year, 11, 31) } },
  ];
}
