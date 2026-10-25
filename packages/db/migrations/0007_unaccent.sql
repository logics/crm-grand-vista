-- Busca textual das listagens (`unaccent` + `ILIKE`): "joao" acha "João". A
-- extensão é *trusted* desde o Postgres 13, então o crm_owner, dono do banco, a
-- instala sem superusuário. As funções ficam executáveis por PUBLIC — o crm_app
-- as usa sem grant à parte.
CREATE EXTENSION IF NOT EXISTS unaccent;
