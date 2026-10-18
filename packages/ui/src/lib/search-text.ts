// Busca local em texto digitado em pt-BR: "certidao" acha "Certidão".

/** Texto sem acentos e em minúsculas, para comparar. */
export const searchKey = (text: string) =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR').trim();

/** O texto contém o termo, sem diferenciar maiúsculas nem acentos; termo vazio casa com tudo. */
export const matchesSearch = (text: string, query: string) => searchKey(text).includes(searchKey(query));
