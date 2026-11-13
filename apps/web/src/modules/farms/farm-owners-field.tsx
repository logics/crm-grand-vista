import type { ContactOption, FarmOwnerInput } from '@crm/shared';
import { Button, Checkbox, IconButton } from '@crm/ui';
import { useState } from 'react';
import { useCan } from '../../shell/tenant-access.js';
import { ContactField } from '../contacts/contact-field.js';

// Proprietários da fazenda no formulário: uma linha por proprietário, com o
// `ContactField` de papel `owner`, a marca de principal e o botão de retirar.
// O primeiro incluído vira principal; retirar o principal promove o próximo.
// Sem `contatos.ver` o seletor é somente leitura (nomes hidratados) e não se
// inclui ninguém — retirar e trocar o principal são edição da fazenda.

export interface FarmOwnersFieldProps {
  value: FarmOwnerInput[];
  onChange: (owners: FarmOwnerInput[]) => void;
  /** Nomes dos proprietários já salvos, para os rótulos antes de a busca hidratar. */
  names?: ReadonlyMap<string, string>;
}

/** O conjunto sem o contato, com o próximo promovido se ele era o principal. */
export function withoutOwner(owners: readonly FarmOwnerInput[], contactId: string): FarmOwnerInput[] {
  const remaining = owners.filter((owner) => owner.contactId !== contactId);
  if (remaining.length > 0 && !remaining.some((owner) => owner.isPrimary)) {
    return remaining.map((owner, index) => ({ ...owner, isPrimary: index === 0 }));
  }
  return remaining;
}

export function FarmOwnersField({ value, onChange, names = new Map() }: FarmOwnersFieldProps) {
  const canSearch = useCan('contatos.ver');
  const [adding, setAdding] = useState(false);
  // O seletor guarda o contato escolhido para não pedir o nome de novo à API.
  const [picked, setPicked] = useState<ReadonlyMap<string, ContactOption>>(new Map());

  const nameOf = (contactId: string) => picked.get(contactId)?.name ?? names.get(contactId) ?? 'proprietário';

  const remember = (contact: ContactOption) => setPicked((current) => new Map(current).set(contact.id, contact));

  const include = (contact: ContactOption | null) => {
    setAdding(false);
    if (!contact || value.some((owner) => owner.contactId === contact.id)) return;
    remember(contact);
    onChange([...value, { contactId: contact.id, isPrimary: value.length === 0 }]);
  };

  const replace = (current: string, contact: ContactOption | null) => {
    if (!contact) return onChange(withoutOwner(value, current));
    if (contact.id === current || value.some((owner) => owner.contactId === contact.id)) return;
    remember(contact);
    onChange(value.map((owner) => (owner.contactId === current ? { ...owner, contactId: contact.id } : owner)));
  };

  const makePrimary = (contactId: string) =>
    onChange(value.map((owner) => ({ ...owner, isPrimary: owner.contactId === contactId })));

  return (
    <div className="flex flex-col gap-gap-field">
      {value.map((owner) => (
        <div key={owner.contactId} className="flex items-center gap-3" data-owner-row={owner.contactId}>
          <div className="min-w-0 flex-1">
            <ContactField
              role="owner"
              aria-label="Proprietário"
              value={picked.get(owner.contactId) ?? owner.contactId}
              onChange={(contact) => replace(owner.contactId, contact)}
            />
          </div>
          <label className="flex shrink-0 items-center gap-2 text-sm text-text-body">
            <Checkbox
              aria-label={`Proprietário principal: ${nameOf(owner.contactId)}`}
              checked={owner.isPrimary}
              onCheckedChange={(checked) => checked === true && makePrimary(owner.contactId)}
            />
            Principal
          </label>
          <IconButton
            icon="trash-2"
            size="sm"
            label={`Retirar ${nameOf(owner.contactId)}`}
            onClick={() => onChange(withoutOwner(value, owner.contactId))}
          />
        </div>
      ))}
      {canSearch && adding && (
        <ContactField role="owner" aria-label="Novo proprietário" value={null} onChange={include} />
      )}
      {canSearch && !adding && (
        <div>
          <Button variant="secondary" size="sm" icon="plus" onClick={() => setAdding(true)}>
            Adicionar proprietário
          </Button>
        </div>
      )}
      {!canSearch && value.length === 0 && <p className="text-sm text-text-muted">Nenhum proprietário informado.</p>}
    </div>
  );
}
