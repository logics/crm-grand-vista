import { z } from 'zod';

/** Texto opcional: espaços nas pontas saem, e o vazio vira ausência (`null`). */
export const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} aceita até ${max} caracteres.`)
    .transform((value) => value || null)
    .nullable();
