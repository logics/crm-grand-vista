// Identidade da empresa: o slug vai na URL (`/e/<tenant>/...`), então o formato
// e os reservados valem para o CLI de provisionamento de hoje e para a tela de
// gestão de empresas da Fase 3 — os dois validam por este schema.
import { z } from 'zod';

/**
 * Slugs que a aplicação usa ou pode vir a usar como caminho. Nenhuma empresa os
 * ocupa: `/e` é o prefixo das rotas de empresa, e os demais são de raiz.
 */
export const RESERVED_TENANT_SLUGS: readonly string[] = ['api', 'admin', 'app', 'e', 'assets', 'static', 'login'];

/** Curto o bastante para caber na URL, longo o bastante para não colidir por acaso. */
export const TENANT_SLUG_MIN_LENGTH = 3;
export const TENANT_SLUG_MAX_LENGTH = 63;

export const tenantSlugSchema = z
  .string()
  .min(TENANT_SLUG_MIN_LENGTH, `O slug deve ter ao menos ${TENANT_SLUG_MIN_LENGTH} caracteres.`)
  .max(TENANT_SLUG_MAX_LENGTH, `O slug deve ter no máximo ${TENANT_SLUG_MAX_LENGTH} caracteres.`)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'O slug aceita só letras minúsculas sem acento, números e hífen, sem hífen no início, no fim ou repetido.',
  )
  .refine((slug) => !RESERVED_TENANT_SLUGS.includes(slug), 'Este slug é reservado pela aplicação.');

export const tenantNameSchema = z.string().trim().min(1, 'Informe o nome da empresa.');
