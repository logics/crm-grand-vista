import { CONTACT_ROLE_LABELS } from '@crm/shared';
import { Badge, Button, ConfirmDialog, ContactShortcuts } from '@crm/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ErrorMessage } from '../../shell/error-message.js';
import { RecordSections } from '../../record-sections/record-sections.js';
import { LoadFailedState, LoadingState } from '../../shell/page-state.js';
import { PageHeader } from '../../shell/page-header.js';
import { useCan } from '../../shell/tenant-access.js';
import { tenantPath } from '../../shell/tenant-path.js';
import { tenantQueryKey, useTenantQuery, useTenantSlug } from '../../shell/tenant-query.js';
import { deleteContact, fetchContact } from './contacts-api.js';
import { contactSections } from './contact-sections.js';

/** Ficha do contato: cabeçalho e as seções registradas. */
export function ContactPage() {
  const slug = useTenantSlug();
  const id = useParams().id ?? '';
  const navigate = useNavigate();
  const canEdit = useCan('contatos.editar');
  const canDelete = useCan('contatos.excluir');
  const queryClient = useQueryClient();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const contact = useTenantQuery(['contacts', id], (tenant) => fetchContact(tenant, id));
  // A recusa (409: contato em uso) traz a mensagem pronta e a ficha continua na tela.
  const remove = useMutation({
    mutationFn: () => deleteContact(slug, id),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: tenantQueryKey(slug, 'contacts', id) });
      await queryClient.invalidateQueries({ queryKey: tenantQueryKey(slug, 'contacts') });
      navigate(tenantPath(slug, 'contacts'));
    },
  });

  if (contact.isPending) return <LoadingState />;
  if (!contact.data) return <LoadFailedState inline title="Não foi possível carregar o contato" onRetry={() => void contact.refetch()} />;
  const record = contact.data;

  return (
    <div className="flex flex-col gap-gap-shell">
      <PageHeader
        title={record.name}
        action={
          (canEdit || canDelete) && (
            <div className="flex gap-2">
              {canEdit && (
                <Button icon="pencil" onClick={() => navigate(tenantPath(slug, `contacts/${id}/edit`))}>
                  Editar
                </Button>
              )}
              {canDelete && (
                <Button variant="danger" icon="trash-2" onClick={() => {
                    remove.reset();
                    setConfirmingDelete(true);
                  }}>
                  Excluir
                </Button>
              )}
            </div>
          )
        }
      />
      {remove.error && <ErrorMessage>{remove.error.message}</ErrorMessage>}
      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Excluir ${record.name}?`}
        description="A exclusão não pode ser desfeita. Os papéis do contato saem junto. Contato em uso em outro cadastro não é excluído."
        confirmLabel="Excluir"
        confirmIcon="trash-2"
        onConfirm={() => remove.mutate()}
      />
      <div className="flex flex-wrap items-center gap-2">
        {record.roles.map((role) => (
          <Badge key={role}>{CONTACT_ROLE_LABELS[role]}</Badge>
        ))}
        <ContactShortcuts
          className="ml-2"
          name={record.name}
          phone={record.phone}
          whatsapp={record.whatsapp}
          email={record.email}
        />
      </div>
      <RecordSections registry={contactSections} record={record} roles={record.roles} />
    </div>
  );
}
