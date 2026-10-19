// Número decimal sem `float`: o valor trafega como string decimal canônica
// (`"1480.5"` — ponto, sem milhar, sem zeros à direita), que é o que o
// `numeric` do Postgres e o Zod recebem sem perda. A aritmética é feita em
// `bigint` sobre os dígitos, com a escala à parte; `number` só conta casas.
// Servem aos campos (`MoneyInput`, `AreaInput`, `PercentInput`), às tabelas e
// aos relatórios — a formatação pt-BR é uma só.

/** Casas de cada tipo, como no modelo de dados: `numeric(16,2)`, `numeric(12,4)`, `numeric(7,4)`. */
export const MONEY_SCALE = 2;
export const AREA_SCALE = 4;
export const PERCENT_SCALE = 4;

/** Tipos de alqueire, como em `tenant_settings.default_alqueire_type`. */
export const ALQUEIRE_TYPES = ['goiano', 'paulista', 'norte'] as const;
export type AlqueireType = (typeof ALQUEIRE_TYPES)[number];

/** Hectares em um alqueire de cada tipo: o goiano (mineiro, geométrico), o paulista e o do norte. */
export const ALQUEIRE_HECTARES: Record<AlqueireType, string> = {
  goiano: '4.84',
  paulista: '2.42',
  norte: '2.72',
};

/** Sufixo de cada tipo nos campos e nas tabelas, como `"1.480 alq. goiano"`. */
export const ALQUEIRE_LABELS: Record<AlqueireType, string> = {
  goiano: 'alq. goiano',
  paulista: 'alq. paulista',
  norte: 'alq. do norte',
};

/** Leitura de um texto digitado: vazio é `null`; texto que não é número é `ok: false`. */
export type ParsedDecimal = { ok: true; value: string | null } | { ok: false };

// A base em `bigint` abaixo é exportada para as contas de outros módulos do
// pacote (a divisão da comissão), mas fica fora do índice.

/** Decimal como inteiro em `bigint` e casas: `"-14.805"` é `{ units: -14805n, scale: 3 }`. */
export type Scaled = { units: bigint; scale: number };

const CANONICAL = /^[+-]?\d+(\.\d+)?$/;

export function toScaled(value: string): Scaled {
  if (!CANONICAL.test(value)) throw new Error(`Não é um decimal canônico: ${JSON.stringify(value)}`);
  const [integer = '', fraction = ''] = value.split('.');
  return { units: BigInt(integer + fraction), scale: fraction.length };
}

const pow10 = (exponent: number) => 10n ** BigInt(exponent);

/** Divisão inteira arredondando o meio para longe do zero, como o `round` do Postgres. */
export function divRound(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const abs = (n: bigint) => (n < 0n ? -n : n);
  if (2n * abs(remainder) < abs(denominator)) return quotient;
  return numerator < 0n === denominator < 0n ? quotient + 1n : quotient - 1n;
}

/** Leva o decimal a `scale` casas, arredondando. */
export function rescale({ units, scale }: Scaled, target: number): bigint {
  return target >= scale ? units * pow10(target - scale) : divRound(units, pow10(scale - target));
}

/** Volta ao texto canônico, sem zeros à direita e sem `-0`. */
export function toCanonical(units: bigint, scale: number): string {
  const negative = units < 0n;
  const digits = (negative ? -units : units).toString().padStart(scale + 1, '0');
  const integer = digits.slice(0, digits.length - scale);
  const fraction = digits.slice(digits.length - scale).replace(/0+$/, '');
  if (units === 0n) return '0';
  return `${negative ? '-' : ''}${integer}${fraction ? `.${fraction}` : ''}`;
}

/** Arredonda um decimal canônico a `scale` casas (meio para longe do zero). */
export function roundDecimal(value: string, scale: number): string {
  return toCanonical(rescale(toScaled(value), scale), scale);
}

/** -1, 0 ou 1, comparando o valor: `"1480.50"` e `"1480.5"` são iguais. */
export function compareDecimal(a: string, b: string): -1 | 0 | 1 {
  const left = toScaled(a);
  const right = toScaled(b);
  const scale = Math.max(left.scale, right.scale);
  const diff = rescale(left, scale) - rescale(right, scale);
  return diff === 0n ? 0 : diff < 0n ? -1 : 1;
}

/** Parte inteira com milhar: sem ponto, ou ponto a cada três dígitos (`"1.480"`, `"1.234.567"`). */
const INTEGER_PT_BR = /^(\d*|[1-9]\d{0,2}(\.\d{3})+)$/;

/**
 * Lê o que a pessoa digitou, em pt-BR — o mesmo formato que o campo exibe:
 * vírgula é o único decimal e ponto só agrupa milhar (`"1.480,50"`, `"1480,5"`,
 * `"1.480"`). Ponto como decimal (`"1480.5"`) é recusado, em vez de lido como
 * outro número. Sinal opcional. Arredonda em `scale` casas e devolve o decimal
 * canônico.
 */
export function parseDecimal(text: string, scale: number): ParsedDecimal {
  const compact = text.replace(/\s/g, '');
  if (compact === '') return { ok: true, value: null };
  const match = /^([+-]?)([\d.,]+)$/.exec(compact);
  if (!match) return { ok: false };
  const [, sign = '', body = ''] = match;
  const [grouped = '', fraction = '', ...rest] = body.split(',');
  if (rest.length > 0 || !INTEGER_PT_BR.test(grouped) || !/^\d*$/.test(fraction)) return { ok: false };
  const integer = grouped.replaceAll('.', '');
  if (integer + fraction === '') return { ok: false };
  const canonical = `${sign === '-' ? '-' : ''}${integer || '0'}${fraction ? `.${fraction}` : ''}`;
  return { ok: true, value: roundDecimal(canonical, scale) };
}

/**
 * Lê como máscara de centavos: só os dígitos contam, e os últimos `scale` são
 * as casas — `"148050"` é `"1480.5"` com duas. É o campo de dinheiro que se
 * formata a cada tecla; cada dígito entra pela direita. Sem dígito é `null`.
 */
export function parseShiftedDecimal(text: string, scale: number): string | null {
  const digits = text.replace(/\D/g, '');
  if (digits === '') return null;
  const negative = text.trimStart().startsWith('-');
  return toCanonical(BigInt(digits) * (negative ? -1n : 1n), scale);
}

export type DecimalFormat = {
  /** Casas sempre mostradas, completando com zero: 2 no dinheiro. */
  minScale: number;
  /** Casas no máximo; o que passa é arredondado. */
  maxScale: number;
};

/** Exibe um decimal canônico em pt-BR: `"1480.5"` vira `"1.480,50"` com duas casas fixas. */
export function formatDecimal(value: string, { minScale, maxScale }: DecimalFormat): string {
  const canonical = roundDecimal(value, maxScale);
  const negative = canonical.startsWith('-');
  const [integer = '', fraction = ''] = (negative ? canonical.slice(1) : canonical).split('.');
  const thousands = integer.replace(/\B(?=(\d{3})+$)/g, '.');
  const decimals = fraction.padEnd(minScale, '0');
  return `${negative ? '-' : ''}${thousands}${decimals ? `,${decimals}` : ''}`;
}

/** Dinheiro: sempre as duas casas. */
export const MONEY_FORMAT: DecimalFormat = { minScale: MONEY_SCALE, maxScale: MONEY_SCALE };

/** Percentual: só as casas que tem, até quatro. Também a do `PercentInput`, que põe o "%" no sufixo. */
export const PERCENT_FORMAT: DecimalFormat = { minScale: 0, maxScale: PERCENT_SCALE };

/** Dinheiro por extenso, como nas fichas: `"1480.5"` vira `"R$ 1.480,50"`. */
export const formatMoney = (value: string) => `R$ ${formatDecimal(value, MONEY_FORMAT)}`;

/** Percentual com só as casas que tem: `"18"` vira `"18%"`, `"12.5"` vira `"12,5%"`. */
export const formatPercent = (value: string) => `${formatDecimal(value, PERCENT_FORMAT)}%`;

/** Multiplica dois decimais canônicos, arredondando o produto em `scale` casas. */
function multiply(a: string, b: string, scale: number): string {
  const left = toScaled(a);
  const right = toScaled(b);
  const units = divRound(left.units * right.units * pow10(scale), pow10(left.scale + right.scale));
  return toCanonical(units, scale);
}

/** Divide dois decimais canônicos, arredondando o quociente em `scale` casas. */
function divide(a: string, b: string, scale: number): string {
  const left = toScaled(a);
  const right = toScaled(b);
  const units = divRound(left.units * pow10(right.scale + scale), right.units * pow10(left.scale));
  return toCanonical(units, scale);
}

/** Alqueires do tipo dado em hectares, nas casas da área. */
export function alqueiresToHectares(alqueires: string, type: AlqueireType): string {
  return multiply(alqueires, ALQUEIRE_HECTARES[type], AREA_SCALE);
}

/** Hectares em alqueires do tipo dado, nas casas da área. */
export function hectaresToAlqueires(hectares: string, type: AlqueireType): string {
  return divide(hectares, ALQUEIRE_HECTARES[type], AREA_SCALE);
}
