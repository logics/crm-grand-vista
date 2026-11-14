import { Badge, Button, ConfirmDialog, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@crm/ui';
import { FARM_DELETE_NOT_INACTIVE_MESSAGE } from '@crm/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ErrorMessage } from '../../shell/error-message.js';
import { RecordSections } from '../../record-sections/record-sections.js';
import { LoadFailedState, LoadingState } from '../../shell/page-state.js';
import { PageHeader } from '../../shell/page-header.js';
import { useCan } from '../../shell/tenant-access.js';
import { tenantPath } from '../../shell/tenant-path.js';
import { tenantQueryKey, useTenantQuery, useTenantSlug } from '../../shell/tenant-query.js';
import { farmSections } from './farm-sections.js';
import { deleteFarm, fetchFarm } from './farms-api.js';

/** Ficha da fazenda: cabeçalho e as seções registradas. */
export function FarmPage() {
  const slug = useTenantSlug();
  const id = useParams().id ?? '';
  const navigate = useNavigate();
  const canEdit = useCan('fazendas.editar');
  const canDelete = useCan('fazendas.excluir');
  const queryClient = useQueryClient();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // A recusa (409: a fazenda deixou de estar desativada) traz a mensagem pronta e a ficha continua na tela.
  const remove = useMutation({
    mutationFn: () => deleteFarm(slug, id),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: tenantQueryKey(slug, 'farms', id) });
      await queryClient.invalidateQueries({ queryKey: tenantQueryKey(slug, 'farms') });
      navigate(tenantPath(slug, 'farms'));
    },
  });
  const farm = useTenantQuery(['farms', id], (tenant) => fetchFarm(tenant, id));

  if (farm.isPending) return <LoadingState />;
  if (!farm.data) return <LoadFailedState inline title="Não foi possível carregar a fazenda" onRetry={() => void farm.refetch()} />;
  const record = farm.data;

  return (
    <div className="flex flex-col gap-gap-shell">
      <PageHeader
        title={record.name}
        action={
          (canEdit || canDelete) && (
            <div className="flex gap-2">
              {canEdit && (
                <Button icon="pencil" onClick={() => navigate(tenantPath(slug, `farms/${id}/edit`))}>
                  Editar
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="danger"
                  icon="trash-2"
                  onClick={() => {
                    remove.reset();
                    setConfirmingDelete(true);
                  }}
                >
                  Excluir
                </Button>
              )}
            </div>
          )
        }
      />
      {remove.error && <ErrorMessage>{remove.error.message}</ErrorMessage>}
      {record.commercialStatus.systemMeaning === 'inactive' ? (
        <ConfirmDialog
          open={confirmingDelete}
          onOpenChange={setConfirmingDelete}
          title={`Excluir ${record.name}?`}
          description="A exclusão não pode ser desfeita. Os vínculos da fazenda saem junto."
          confirmLabel="Excluir"
          confirmIcon="trash-2"
          confirmationText={record.name}
          confirmationLabel="Digite o nome da fazenda para confirmar"
          onConfirm={() => remove.mutate()}
        />
      ) : (
        <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>{FARM_DELETE_NOT_INACTIVE_MESSAGE}</DialogTitle>
              <DialogDescription>
                Troque o status comercial da fazenda para um de significado Desativada. Depois disso, ela pode ser excluída.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Entendi</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{record.commercialStatus.name}</Badge>
      </div>
      <RecordSections registry={farmSections} record={record} />
    </div>
  );
}
