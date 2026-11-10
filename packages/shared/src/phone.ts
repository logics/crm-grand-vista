// Telefone e WhatsApp: gravados em formato internacional (`+` e 8 a 15 dígitos),
// digitados como a pessoa costuma digitar. As mesmas funções servem ao Zod da
// API e ao formulário.

/** Códigos de área (DDD) em uso no Brasil. */
const BRAZILIAN_AREA_CODES: ReadonlySet<string> = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

const BRAZIL_COUNTRY_CODE = '55';

/** Código do país pré-preenchido nos campos de telefone. */
export const DEFAULT_COUNTRY_PREFIX = `+${BRAZIL_COUNTRY_CODE}`;
const INTERNATIONAL_MIN_DIGITS = 8;
const INTERNATIONAL_MAX_DIGITS = 15;

/** Mensagem para telefone que `normalizePhone` recusa. */
export const INVALID_PHONE_MESSAGE =
  'Informe um telefone válido: DDD e número, como (64) 99999-0000, ou + e o código do país.';

/** Só os dígitos, sem o que o tecladista põe em volta: parênteses, espaços, hífens e pontos. */
const SEPARATORS = /[\s().-]/g;

/** Brasileiro: DDD válido e 8 ou 9 dígitos do número. */
const isBrazilianNational = (digits: string): boolean =>
  (digits.length === 10 || digits.length === 11) && BRAZILIAN_AREA_CODES.has(digits.slice(0, 2));

/**
 * Campo de telefone sem conteúdo: vazio, ou só o `+55` que o campo pré-preenche.
 * É ausência, não erro.
 */
export function isBlankPhone(input: string): boolean {
  const compact = input.replace(SEPARATORS, '');
  return compact === '' || compact === `+${BRAZIL_COUNTRY_CODE}`;
}

/**
 * Telefone no formato gravado (`+5564999990000`), ou `null` se não for válido.
 * Sem `+` o número é brasileiro (DDD válido e 8 ou 9 dígitos). Com `+55`, vale
 * a mesma regra brasileira; com outro código de país, a faixa geral de 8 a 15
 * dígitos, sem validação por país.
 */
export function normalizePhone(input: string): string | null {
  const compact = input.trim().replace(SEPARATORS, '');
  const international = compact.startsWith('+');
  const digits = international ? compact.slice(1) : compact;
  if (!/^\d+$/.test(digits)) return null;

  if (!international) return isBrazilianNational(digits) ? `+${BRAZIL_COUNTRY_CODE}${digits}` : null;

  if (digits.startsWith(BRAZIL_COUNTRY_CODE)) {
    return isBrazilianNational(digits.slice(BRAZIL_COUNTRY_CODE.length)) ? `+${digits}` : null;
  }
  return digits.length >= INTERNATIONAL_MIN_DIGITS && digits.length <= INTERNATIONAL_MAX_DIGITS ? `+${digits}` : null;
}

/** Telefone gravado para exibição: `(64) 99999-0000` no Brasil; o internacional como veio. */
export function formatPhone(phone: string): string;
export function formatPhone(phone: string | null): string | null;
export function formatPhone(phone: string | null): string | null {
  if (phone === null) return null;
  const national = phone.startsWith(`+${BRAZIL_COUNTRY_CODE}`) ? phone.slice(BRAZIL_COUNTRY_CODE.length + 1) : null;
  if (national === null || !/^\d+$/.test(national) || !isBrazilianNational(national)) return phone;
  const area = national.slice(0, 2);
  const number = national.slice(2);
  const split = number.length - 4;
  return `(${area}) ${number.slice(0, split)}-${number.slice(split)}`;
}

const digitsOf = (phone: string): string => phone.replace(/\D/g, '');

/** Link do WhatsApp (`wa.me`) para o número gravado; só os dígitos entram. */
export const whatsappUrl = (phone: string): string => `https://wa.me/${digitsOf(phone)}`;

/** Link de ligação (`tel:`) para o número gravado. */
export const telUrl = (phone: string): string => `tel:+${digitsOf(phone)}`;

/** Link de e-mail (`mailto:`). */
export const mailtoUrl = (email: string): string => `mailto:${email}`;
