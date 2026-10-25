// Instante que a API entrega em ISO 8601 (UTC), formatado no fuso do navegador.
// É o único dado que a API não entrega formatado: a Grand Vista atua em mais de
// um fuso (GO em UTC−3, MT em UTC−4), e a forma certa depende de quem lê.

/** "24/07 · 14h30", no fuso do navegador. */
export function formatInstant(iso: string): string {
  // O formatador nasce a cada chamada: guardado, ele fixaria o fuso de quando
  // foi criado.
  const parts = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return `${part('day')}/${part('month')} · ${part('hour')}h${part('minute')}`;
}
