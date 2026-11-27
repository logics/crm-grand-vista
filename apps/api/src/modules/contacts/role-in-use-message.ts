/** Uso de um papel por uma declaração, como a mensagem de "em uso" o enxerga. */
export interface RoleUsageTally {
  label: { singular: string; plural: string };
  /** Como a mensagem cita o uso sem número ("em cadeias de indicação"); sem ela, `de <plural>`. */
  uncountedPhrase?: string;
  /** Todas as linhas que usam o contato (o bloqueio é global). */
  total: number;
  /** Linhas dentro do escopo de quem pede; ausente quando a declaração não tem contagem visível. */
  visible?: number;
}

const partOf = ({ label, uncountedPhrase, total, visible }: RoleUsageTally) => {
  // Número maior que o que quem pede enxerga revelaria registros fora do escopo dele.
  if (visible !== undefined && visible < total) return uncountedPhrase ?? `de ${label.plural}`;
  return `de ${total} ${total === 1 ? label.singular : label.plural}`;
};

/** A mensagem da recusa ao retirar um papel em uso; omite o número onde ele revelaria o que está fora do escopo. */
export function roleInUseMessage(contactName: string, roleLabel: string, tallies: readonly RoleUsageTally[]): string {
  return `${contactName} é ${roleLabel} ${tallies.map(partOf).join(' e ')}; troque o ${roleLabel} antes de retirar o papel.`;
}
