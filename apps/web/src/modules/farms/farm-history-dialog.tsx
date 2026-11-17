import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@crm/ui';
import { RecordHistory } from '../../history/record-history.js';
import { useTenantSlug } from '../../shell/tenant-query.js';
import { fetchFarmHistory } from './farms-api.js';

/** Histórico de alterações da fazenda: só carrega e aparece quando a pessoa abre. */
export function FarmHistoryDialog({ farmId, open, onOpenChange }: { farmId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const slug = useTenantSlug();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Histórico de alterações</DialogTitle>
          <DialogDescription>Quem mudou o quê nesta fazenda, do mais recente ao mais antigo.</DialogDescription>
        </DialogHeader>
        {open && <RecordHistory queryKey={['farms', farmId]} fetchPage={(_slug, cursor) => fetchFarmHistory(slug, farmId, cursor)} />}
      </DialogContent>
    </Dialog>
  );
}
