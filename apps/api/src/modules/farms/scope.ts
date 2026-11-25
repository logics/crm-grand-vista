// Escopo de dados de fazendas. Peça folha (importa só `@crm/db` e `src/authorization`)
// para que outros módulos o usem sem formar ciclo com o serviço de fazendas.
import { farms } from '@crm/db';
import type { SQL } from 'drizzle-orm';
import { dataScopeClause } from '../../authorization/data-scope.js';
import type { EffectiveAccess } from '../../authorization/effective-access.js';

/**
 * O predicado de escopo de dados de fazendas, o mesmo em lista, total, detalhe,
 * histórico e escrita. É a única forma de aplicar o escopo de fazendas fora do
 * serviço: ninguém repete `dataScopeClause` com módulo e coluna.
 */
export const farmScopeOf = (access: EffectiveAccess): SQL => dataScopeClause(access, 'fazendas', farms.responsibleUserId);
