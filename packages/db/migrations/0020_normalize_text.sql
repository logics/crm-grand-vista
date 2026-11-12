-- Escrito à mão: a normalização de texto deixa de ser só dos cadastros auxiliares
-- e passa a ser a única do sistema (unicidade de nome e toda busca textual).
-- O rename preserva a função (já `IMMUTABLE`): os índices de unicidade a
-- referenciam pelo OID e continuam válidos, sem recriar nada.
-- contração: renomeio decidido na spec de fazendas (issue 142); o release anterior ainda chama normalize_vocabulary_name, então esta migration só deve rodar junto do deploy do código novo (ver DECISOES-PENDENTES)
ALTER FUNCTION normalize_vocabulary_name(text) RENAME TO normalize_text;
