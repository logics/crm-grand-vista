import { z } from 'zod';

// O que o `EntityForm` lê do schema Zod que também valida a fronteira HTTP:
// quais campos são obrigatórios (para o asterisco e o `aria-required`) e as
// mensagens de erro em pt-BR. O schema é o da API, então nada aqui o altera —
// as mensagens entram por parse, e a que o schema declarar vence.

export const requiredMessage = 'Campo obrigatório';

const ptBR = z.locales.ptBR().localeError;

type Schema = z.core.$ZodType;

/** A forma do objeto por trás de refine, pipe, optional e afins; `undefined` se não for objeto. */
function objectShape(schema: Schema): Record<string, Schema> | undefined {
  let current: Schema | undefined = schema;
  while (current) {
    const def: z.core.$ZodTypeDef & { shape?: Record<string, Schema>; in?: Schema; innerType?: Schema } =
      current._zod.def;
    if (def.type === 'object') return def.shape;
    current = def.type === 'pipe' ? def.in : def.innerType;
  }
  return undefined;
}

/** O campo em `path` (com ponto nos aninhados) recusa ausência: é obrigatório. */
export function isRequiredField(schema: Schema, path: string): boolean {
  let field: Schema | undefined = schema;
  for (const key of path.split('.')) {
    field = field && objectShape(field)?.[key];
  }
  return field ? !z.safeParse(field, undefined).success : false;
}

function valueAt(values: unknown, path: readonly PropertyKey[]): unknown {
  return path.reduce<unknown>(
    (value, key) => (value != null && typeof value === 'object' ? (value as Record<PropertyKey, unknown>)[key] : undefined),
    values,
  );
}

const isEmpty = (value: unknown) => value === undefined || value === null || value === '';

/**
 * Mapa de erros por parse, para os valores do formulário: campo obrigatório
 * vazio vira "Campo obrigatório", seja qual for a regra que falhou (`min(1)`,
 * tipo, a coerção de `''` para 0) — a mesma regra do asterisco; o resto sai na
 * mensagem do Zod em pt-BR.
 */
export function formErrorMap(schema: Schema, values: unknown): z.core.$ZodErrorMap {
  return (issue) => {
    const path = issue.path ?? [];
    const required = path.length > 0 && isRequiredField(schema, path.join('.'));
    return required && isEmpty(valueAt(values, path)) ? requiredMessage : ptBR(issue);
  };
}
