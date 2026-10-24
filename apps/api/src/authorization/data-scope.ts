// A cláusula de escopo de dados: uma função só, aplicada tanto na listagem
// quanto no guard de detalhe. Aplicada em dois lugares com código diferente é
// como a listagem fica correta e o acesso por ID direto vaza.
import type { PermissionModule } from '@crm/shared';
import { eq, sql, type Column, type SQL } from 'drizzle-orm';
import { dataScopeOf, type EffectiveAccess } from './effective-access.js';

/**
 * Lista sem escopo de dados — a que não tem corretor responsável, como os
 * vocabulários da empresa. Explícito de propósito: esquecer o escopo não pode
 * ser o mesmo que declarar que ele não existe.
 */
export const withoutDataScope: SQL = sql`true`;

/**
 * Predicado que restringe o módulo ao escopo de dados do usuário: com `own`, só
 * os registros de que ele é o corretor responsável (`responsibleColumn`); com
 * `all`, nenhum recorte. Vai no `where` junto do resto da consulta.
 *
 * No detalhe, registro fora do escopo some da consulta e a rota responde 404,
 * não 403: se a listagem não o mostra, o detalhe não pode confirmar que existe.
 */
export function dataScopeClause(access: EffectiveAccess, module: PermissionModule, responsibleColumn: Column): SQL {
  return dataScopeOf(access, module) === 'all' ? withoutDataScope : eq(responsibleColumn, access.userId);
}
