// Campo extra da praça: os municípios que ela atende. Lido e gravado junto com a
// entrada pelo motor (`service.ts`); a regra "um município, uma praça" é checada
// aqui antes de gravar e, na corrida, pelo UNIQUE do banco.
import {
  auditedWrites,
  municipalities,
  tradingPostMunicipalities,
  tradingPosts,
  type AuditActor,
  type Transaction,
} from '@crm/db';
import {
  municipalityLabel,
  municipalityTakenMessage,
  VOCABULARY_MUNICIPALITY_UNKNOWN_MESSAGE,
  type ServedMunicipality,
  type Uf,
  type TradingPostSuggestion,
} from '@crm/shared';
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';

type Writes = ReturnType<typeof auditedWrites>;

/** Recusa da regra: `unknown` vira 400 (código fora do IBGE); `taken`, 409 (já atendido por outra praça). */
export type MunicipalitiesRefusal = { kind: 'unknown' | 'taken'; message: string };

/** Os municípios atendidos de cada praça, em ordem de nome (pt-BR). Praça sem nenhum vem com lista vazia. */
export async function loadServedMunicipalities(
  tx: Transaction,
  postIds: readonly string[],
): Promise<Map<string, ServedMunicipality[]>> {
  const byPost = new Map<string, ServedMunicipality[]>(postIds.map((id) => [id, []]));
  if (postIds.length === 0) return byPost;

  const rows = await tx
    .select({
      postId: tradingPostMunicipalities.tradingPostId,
      ibgeCode: municipalities.ibgeCode,
      name: municipalities.name,
      uf: municipalities.uf,
    })
    .from(tradingPostMunicipalities)
    .innerJoin(municipalities, eq(municipalities.ibgeCode, tradingPostMunicipalities.municipalityIbgeCode))
    .where(inArray(tradingPostMunicipalities.tradingPostId, [...postIds]))
    .orderBy(sql`${municipalities.name} collate "pt-BR-x-icu"`, asc(municipalities.uf), asc(municipalities.ibgeCode));
  for (const { postId, ...municipality } of rows) byPost.get(postId)?.push(municipality);
  return byPost;
}

/**
 * Confere que os códigos existem e que nenhum é atendido por outra praça
 * (`exceptPostId` é a própria praça, na edição). Nomeia a praça que o atende.
 */
export async function checkServedMunicipalities(
  tx: Transaction,
  codes: readonly string[],
  exceptPostId?: string,
): Promise<MunicipalitiesRefusal | undefined> {
  if (codes.length === 0) return undefined;

  const known = await tx
    .select({ ibgeCode: municipalities.ibgeCode })
    .from(municipalities)
    .where(inArray(municipalities.ibgeCode, [...codes]));
  if (known.length !== codes.length) return { kind: 'unknown', message: VOCABULARY_MUNICIPALITY_UNKNOWN_MESSAGE };

  const taken = await tx
    .select({ name: municipalities.name, uf: municipalities.uf, tradingPost: tradingPosts.name })
    .from(tradingPostMunicipalities)
    .innerJoin(municipalities, eq(municipalities.ibgeCode, tradingPostMunicipalities.municipalityIbgeCode))
    .innerJoin(tradingPosts, eq(tradingPosts.id, tradingPostMunicipalities.tradingPostId))
    .where(
      and(
        inArray(tradingPostMunicipalities.municipalityIbgeCode, [...codes]),
        exceptPostId ? ne(tradingPostMunicipalities.tradingPostId, exceptPostId) : undefined,
      ),
    )
    .orderBy(asc(municipalities.name), asc(municipalities.ibgeCode));
  if (taken.length === 0) return undefined;
  return {
    kind: 'taken',
    message: taken
      .map((row) => municipalityTakenMessage(municipalityLabel({ name: row.name, uf: row.uf as Uf }), row.tradingPost))
      .join(' '),
  };
}

/**
 * Deixa a praça atendendo exatamente `codes`: remove os que saíram e inclui os
 * novos, cada um pelo wrapper de auditoria (mesmo `change_id` da escrita da entrada).
 */
export async function replaceServedMunicipalities(
  tx: Transaction,
  writes: Writes,
  actor: AuditActor & { tenantId: string },
  postId: string,
  codes: readonly string[],
): Promise<void> {
  const current = await tx
    .select({ id: tradingPostMunicipalities.id, code: tradingPostMunicipalities.municipalityIbgeCode })
    .from(tradingPostMunicipalities)
    .where(eq(tradingPostMunicipalities.tradingPostId, postId));
  const wanted = new Set(codes);
  const present = new Set(current.map((row) => row.code));

  for (const row of current) {
    if (!wanted.has(row.code)) await writes.delete(tradingPostMunicipalities, eq(tradingPostMunicipalities.id, row.id));
  }
  for (const code of codes) {
    if (!present.has(code)) {
      await writes.insert(tradingPostMunicipalities, {
        tenantId: actor.tenantId,
        tradingPostId: postId,
        municipalityIbgeCode: code,
      });
    }
  }
}

/** Remove (auditado) os municípios da praça, antes de ela própria ser excluída. */
export async function removeServedMunicipalities(writes: Writes, postId: string): Promise<void> {
  await writes.delete(tradingPostMunicipalities, eq(tradingPostMunicipalities.tradingPostId, postId));
}

/** A praça ativa que atende o município, ou nulo. Praça inativa é ignorada; a empresa vem do RLS. */
export async function suggestTradingPost(tx: Transaction, municipalityIbgeCode: string): Promise<TradingPostSuggestion> {
  const [row] = await tx
    .select({ id: tradingPosts.id, name: tradingPosts.name })
    .from(tradingPostMunicipalities)
    .innerJoin(tradingPosts, eq(tradingPosts.id, tradingPostMunicipalities.tradingPostId))
    .where(and(eq(tradingPostMunicipalities.municipalityIbgeCode, municipalityIbgeCode), eq(tradingPosts.active, true)));
  return { tradingPost: row ?? null };
}
