// Documento do contato: CPF (11 dígitos) ou CNPJ (14 posições, numérico ou
// alfanumérico). Funções puras, as mesmas no Zod da API e no formulário. O
// valor gravado é o normalizado: sem pontuação, em maiúsculas.

/** Sem pontuação nem espaços, em maiúsculas. */
export function normalizeTaxId(value: string): string {
  return value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

const allSame = (value: string) => [...value].every((char) => char === value[0]);

/** Valor do caractere no módulo 11: código ASCII menos 48 (dígitos valem 0–9, letras 17–42). */
const charValue = (char: string) => char.charCodeAt(0) - 48;

/** Dígito verificador: resto do módulo 11 ponderado, 0 quando o resto é menor que 2. */
function checkDigit(chars: string, weights: readonly number[]): number {
  const sum = [...chars].reduce((total, char, index) => total + charValue(char) * (weights[index] ?? 0), 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

const CNPJ_WEIGHTS = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;

export function isValidCpf(value: string): boolean {
  const cpf = normalizeTaxId(value);
  if (!/^\d{11}$/.test(cpf) || allSame(cpf)) return false;
  const first = checkDigit(cpf.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(cpf.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cpf.slice(9) === `${first}${second}`;
}

/** CNPJ numérico ou alfanumérico: 12 posições `[0-9A-Z]` e 2 dígitos verificadores. */
export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeTaxId(value);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || allSame(cnpj)) return false;
  const first = checkDigit(cnpj.slice(0, 12), CNPJ_WEIGHTS.slice(1));
  const second = checkDigit(cnpj.slice(0, 12) + first, CNPJ_WEIGHTS);
  return cnpj.slice(12) === `${first}${second}`;
}

/** O valor normalizado é CPF (11 dígitos) ou CNPJ (14 posições)? Não valida os dígitos verificadores. */
export function taxIdKind(normalized: string): 'cpf' | 'cnpj' | null {
  if (/^\d{11}$/.test(normalized)) return 'cpf';
  if (/^[0-9A-Z]{14}$/.test(normalized)) return 'cnpj';
  return null;
}

/** Documento com a pontuação de CPF ou CNPJ; o que não é um nem outro volta normalizado. */
export function formatTaxId(value: string): string {
  const id = normalizeTaxId(value);
  switch (taxIdKind(id)) {
    case 'cpf':
      return `${id.slice(0, 3)}.${id.slice(3, 6)}.${id.slice(6, 9)}-${id.slice(9)}`;
    case 'cnpj':
      return `${id.slice(0, 2)}.${id.slice(2, 5)}.${id.slice(5, 8)}/${id.slice(8, 12)}-${id.slice(12)}`;
    default:
      return id;
  }
}

/**
 * O que o campo aceita enquanto a pessoa digita: PF só dígitos (até 11); PJ
 * letras e dígitos (até 14), com as duas últimas posições — os dígitos
 * verificadores — só numéricas. Devolve o valor normalizado, já truncado.
 */
export function sanitizeTaxIdInput(value: string, personType: 'pf' | 'pj'): string {
  const normalized = normalizeTaxId(value);
  if (personType === 'pf') return normalized.replace(/\D/g, '').slice(0, 11);
  const body = normalized.slice(0, 12);
  const checkDigits = normalized.slice(12).replace(/\D/g, '');
  return (body + checkDigits).slice(0, 14);
}

/** Máscara progressiva do campo: `529.982.2`, `12.ABC.345/01DE-3`. */
export function maskTaxId(value: string, personType: 'pf' | 'pj'): string {
  const id = sanitizeTaxIdInput(value, personType);
  const pattern = personType === 'pf' ? [3, 6, 9] : [2, 5, 8, 12];
  const separators = personType === 'pf' ? ['.', '.', '-'] : ['.', '.', '/', '-'];
  return [...id].reduce((text, char, index) => {
    const at = pattern.indexOf(index);
    return text + (at >= 0 ? separators[at] : '') + char;
  }, '');
}
