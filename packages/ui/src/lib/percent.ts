/** Leva um percentual para o intervalo de 0 a 100; o que não é número finito vira 0. */
export function clampPercent(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

/** O mesmo percentual limitado, em número inteiro, para exibir. */
export function roundPercent(value: number): number {
  return Math.round(clampPercent(value));
}
