/**
 * Iniciais de um nome para o avatar: primeira letra do primeiro e do último
 * nome ("Renata de Carvalho" → "RC"). Nome de uma palavra só dá as duas
 * primeiras letras, o que também deixa passar uma sigla pronta ("MS").
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0] ?? '';
  const last = words.at(-1) ?? '';
  const letters = words.length > 1 ? `${first[0]}${last[0]}` : first.slice(0, 2);
  return letters.toUpperCase();
}
